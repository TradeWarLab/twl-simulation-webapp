import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addBoardItem,
	callForRatification,
	removeBoardItem,
	withdrawRatificationCall,
} from "@/app/actions/deal-controller";
import { createChainableBuilder, mockClient } from "../helpers/supabase-mock";

// Route table names to per-table builders; returns builders for assertions.
function mockTables(
	responses: Record<
		string,
		{ data: unknown; error: null | { message: string; code?: string } }
	>,
) {
	const builders = new Map<string, ReturnType<typeof createChainableBuilder>>();
	mockClient.from.mockImplementation((table: string) => {
		let builder = builders.get(table);
		if (!builder) {
			builder = createChainableBuilder(
				responses[table] ?? { data: null, error: null },
			);
			builders.set(table, builder);
		}
		return builder;
	});
	return builders;
}

const ITEM = {
	id: "item-1",
	class_id: "class-1",
	team_id: "team-usa",
	issue_id: "issue-1",
	name: "Steel Tariffs",
	role: "concession",
	is_resolved: false,
};

// Baseline: enrolled on team-usa, phase 2, no pending package vote.
function baselineResponses() {
	return {
		students_classes: { data: { team_id: "team-usa" }, error: null },
		classes: { data: { current_period: 2 }, error: null },
		trade_proposals: { data: null, error: null }, // no pending package
		trade_items: { data: ITEM, error: null },
		teams: { data: [{ id: "team-usa" }, { id: "team-china" }], error: null },
		deal_board_items: { data: null, error: null },
		deal_ratification_calls: { data: null, error: null },
	};
}

describe("addBoardItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("inserts a board row with computed giving team and clears ratification calls", async () => {
		const builders = mockTables(baselineResponses());

		const result = await addBoardItem("class-1", "item-1");

		expect(result).toEqual({ success: true });
		expect(builders.get("deal_board_items")!.insert).toHaveBeenCalledWith({
			class_id: "class-1",
			item_id: "item-1",
			issue_id: "issue-1",
			name: "Steel Tariffs",
			giving_team_id: "team-usa", // role 'concession' → adder's team gives
			added_by_team_id: "team-usa",
			added_by: "user-1",
		});
		expect(builders.get("deal_ratification_calls")!.delete).toHaveBeenCalled();
		expect(revalidatePath).toHaveBeenCalledWith("/student/simulation/class-1");
	});

	it("computes the opposing team as giver for 'ask' items", async () => {
		const responses = baselineResponses();
		responses.trade_items = { data: { ...ITEM, role: "ask" }, error: null };
		const builders = mockTables(responses);

		await addBoardItem("class-1", "item-1");

		expect(builders.get("deal_board_items")!.insert).toHaveBeenCalledWith(
			expect.objectContaining({ giving_team_id: "team-china" }),
		);
	});

	it("treats a duplicate add (unique violation) as a silent no-op", async () => {
		const responses = baselineResponses();
		responses.deal_board_items = {
			data: null,
			error: { message: "duplicate key value", code: "23505" },
		};
		mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({ success: true });
	});

	it("rejects when a package vote is pending (board frozen)", async () => {
		const responses = baselineResponses();
		responses.trade_proposals = { data: { id: "pkg-1" }, error: null };
		const builders = mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({
			error: "The board is frozen while the final vote is open",
		});
		expect(builders.get("deal_board_items")?.insert).toBeUndefined();
	});

	it("rejects outside the Bilateral Negotiation phase", async () => {
		const responses = baselineResponses();
		responses.classes = { data: { current_period: 1 }, error: null };
		mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({
			error:
				"The deal board is only open during the Bilateral Negotiation phase",
		});
	});

	it("rejects resolved items", async () => {
		const responses = baselineResponses();
		responses.trade_items = {
			data: { ...ITEM, is_resolved: true },
			error: null,
		};
		mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({ error: "This issue has already been resolved" });
	});

	it("rejects items from another team's list or another class", async () => {
		const responses = baselineResponses();
		responses.trade_items = {
			data: { ...ITEM, team_id: "team-china" },
			error: null,
		};
		mockTables(responses);
		expect(await addBoardItem("class-1", "item-1")).toEqual({
			error: "You can only add items from your own team's list",
		});

		vi.clearAllMocks();
		const responses2 = baselineResponses();
		responses2.trade_items = {
			data: { ...ITEM, class_id: "other-class" },
			error: null,
		};
		mockTables(responses2);
		expect(await addBoardItem("class-1", "item-1")).toEqual({
			error: "Item not found",
		});
	});

	it("rejects unenrolled users", async () => {
		const responses = baselineResponses();
		responses.students_classes = { data: null, error: null };
		mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({ error: "You are not enrolled in this class" });
	});

	it("surfaces enrollment query failures instead of a business-rule rejection", async () => {
		const responses = baselineResponses();
		responses.students_classes = {
			data: null,
			error: { message: "connection reset" },
		};
		mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({ error: "Failed to verify your enrollment" });
	});

	it("fails closed when the pending-package check errors, instead of unfreezing the board", async () => {
		const responses = baselineResponses();
		responses.trade_proposals = {
			data: null,
			error: { message: "connection reset" },
		};
		const builders = mockTables(responses);

		const result = await addBoardItem("class-1", "item-1");
		expect(result).toEqual({ error: "Could not verify the board status" });
		expect(builders.get("deal_board_items")?.insert).toBeUndefined();
	});
});

describe("removeBoardItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes the row and clears ratification calls", async () => {
		const builders = mockTables(baselineResponses());

		const result = await removeBoardItem("class-1", "board-1");

		expect(result).toEqual({ success: true });
		expect(builders.get("deal_board_items")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_board_items")!.eq).toHaveBeenCalledWith(
			"id",
			"board-1",
		);
		expect(builders.get("deal_ratification_calls")!.delete).toHaveBeenCalled();
		expect(revalidatePath).toHaveBeenCalledWith("/student/simulation/class-1");
	});

	it("rejects while a package vote is pending", async () => {
		const responses = baselineResponses();
		responses.trade_proposals = { data: { id: "pkg-1" }, error: null };
		const builders = mockTables(responses);

		const result = await removeBoardItem("class-1", "board-1");
		expect(result).toEqual({
			error: "The board is frozen while the final vote is open",
		});
		expect(builders.get("deal_board_items")?.delete).toBeUndefined();
	});
});

const BOARD_ROWS = [
	{ item_id: "item-1", name: "Steel Tariffs", giving_team_id: "team-usa" },
	{
		item_id: "item-2",
		name: "Rare Earth Access",
		giving_team_id: "team-china",
	},
];

describe("callForRatification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("records the first team's call without opening a vote", async () => {
		const responses = baselineResponses();
		responses.deal_board_items = { data: BOARD_ROWS, error: null };
		// After upsert, only our own team has called.
		responses.deal_ratification_calls = {
			data: [{ team_id: "team-usa" }],
			error: null,
		};
		const builders = mockTables(responses);

		const result = await callForRatification("class-1");

		expect(result).toEqual({ success: true, voteOpened: false });
		expect(
			builders.get("deal_ratification_calls")!.upsert,
		).toHaveBeenCalledWith(
			{ class_id: "class-1", team_id: "team-usa", called_by: "user-1" },
			{ onConflict: "class_id,team_id" },
		);
		expect(builders.get("trade_proposals")!.insert).not.toHaveBeenCalled();
	});

	it("opens the vote when the second team completes the handshake", async () => {
		const responses = baselineResponses();
		responses.deal_board_items = { data: BOARD_ROWS, error: null };
		responses.deal_ratification_calls = {
			data: [{ team_id: "team-china" }, { team_id: "team-usa" }],
			error: null,
		};
		const builders = mockTables(responses);

		const result = await callForRatification("class-1");

		expect(result).toEqual({ success: true, voteOpened: true });
		expect(builders.get("trade_proposals")!.insert).toHaveBeenCalledWith({
			class_id: "class-1",
			proposing_team_id: "team-usa",
			receiving_team_id: "team-china",
			offered_items: [{ item_id: "item-1", name: "Steel Tariffs" }],
			requested_items: [{ item_id: "item-2", name: "Rare Earth Access" }],
			status: "pending",
			is_package: true,
			created_by: "user-1",
		});
	});

	it("rejects an empty board", async () => {
		const responses = baselineResponses();
		responses.deal_board_items = { data: [], error: null };
		mockTables(responses);

		const result = await callForRatification("class-1");
		expect(result).toEqual({
			error: "Add at least one item to the board before calling a vote",
		});
	});

	it("rejects while a package vote is already pending", async () => {
		const responses = baselineResponses();
		responses.trade_proposals = { data: { id: "pkg-1" }, error: null };
		mockTables(responses);

		const result = await callForRatification("class-1");
		expect(result).toEqual({ error: "A final vote is already open" });
	});
});

describe("withdrawRatificationCall", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes the caller team's call", async () => {
		const builders = mockTables(baselineResponses());

		const result = await withdrawRatificationCall("class-1");

		expect(result).toEqual({ success: true });
		expect(builders.get("deal_ratification_calls")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_ratification_calls")!.eq).toHaveBeenCalledWith(
			"team_id",
			"team-usa",
		);
	});

	it("rejects once the final vote has opened", async () => {
		const responses = baselineResponses();
		responses.trade_proposals = { data: { id: "pkg-1" }, error: null };
		mockTables(responses);

		const result = await withdrawRatificationCall("class-1");
		expect(result).toEqual({ error: "The final vote has already opened" });
	});
});
