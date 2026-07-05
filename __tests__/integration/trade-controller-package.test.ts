import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitVote } from "@/app/actions/trade-controller";
import { createChainableBuilder, mockClient } from "../helpers/supabase-mock";

const PACKAGE_PROPOSAL = {
	id: "pkg-1",
	class_id: "class-1",
	proposing_team_id: "team-usa",
	receiving_team_id: "team-china",
	offered_items: [{ item_id: "item-1", name: "Steel Tariffs" }],
	requested_items: [{ item_id: "item-2", name: "Rare Earth Access" }],
	status: "pending",
	is_package: true,
};

function mockTables(
	responses: Record<
		string,
		{ data: unknown; error: null | { message: string } }
	>,
) {
	const builders = new Map<string, ReturnType<typeof createChainableBuilder>>();
	// Eagerly create builders for every configured table so callers can
	// patch them (e.g. `.single.mockResolvedValue`) *before* submitVote
	// exercises the query chain — the mock client resolves `.from(table)`
	// lazily otherwise, which would leave `builders.get(table)` undefined
	// at patch time.
	for (const table of Object.keys(responses)) {
		builders.set(table, createChainableBuilder(responses[table]));
	}
	mockClient.from.mockImplementation((table: string) => {
		let builder = builders.get(table);
		if (!builder) {
			builder = createChainableBuilder({ data: null, error: null });
			builders.set(table, builder);
		}
		return builder;
	});
	return builders;
}

describe("submitVote — package proposals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("wipes the board and calls when the final vote is rejected", async () => {
		// 2 members total; this vote is the 2nd and it is a reject.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			students_classes: {
				data: [{ team_id: "team-usa" }, { team_id: "team-china" }],
				error: null,
			},
			votes: {
				data: [{ vote: "approve" }, { vote: "reject" }],
				error: null,
			},
			deal_board_items: { data: null, error: null },
			deal_ratification_calls: { data: null, error: null },
		});
		// students_classes is also used for the voter's enrollment lookup
		// (.single()); make it resolve a membership object.
		builders
			.get("students_classes")!
			.single.mockResolvedValue({ data: { team_id: "team-usa" }, error: null });

		// The head-count query resolves via the thenable with a count property.
		builders.get("students_classes")!.then = vi.fn(
			(resolve: (v: unknown) => void) => {
				const value = { data: null, error: null, count: 2 };
				resolve(value);
				return Promise.resolve(value);
			},
		);

		const result = await submitVote("pkg-1", "reject");

		expect(result).toEqual({ success: true });
		expect(builders.get("trade_proposals")!.update).toHaveBeenCalledWith({
			status: "rejected",
		});
		// The blank-slate reset:
		expect(builders.get("deal_board_items")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_board_items")!.eq).toHaveBeenCalledWith(
			"class_id",
			"class-1",
		);
		expect(builders.get("deal_ratification_calls")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_ratification_calls")!.eq).toHaveBeenCalledWith(
			"class_id",
			"class-1",
		);
	});

	it("does not touch the board when a legacy (non-package) proposal is rejected", async () => {
		const builders = mockTables({
			trade_proposals: {
				data: { ...PACKAGE_PROPOSAL, is_package: false },
				error: null,
			},
			students_classes: {
				data: [{ team_id: "team-usa" }],
				error: null,
			},
			votes: { data: [{ vote: "reject" }], error: null },
			deal_board_items: { data: null, error: null },
			deal_ratification_calls: { data: null, error: null },
		});
		builders
			.get("students_classes")!
			.single.mockResolvedValue({ data: { team_id: "team-usa" }, error: null });
		builders.get("students_classes")!.then = vi.fn(
			(resolve: (v: unknown) => void) => {
				const value = { data: null, error: null, count: 1 };
				resolve(value);
				return Promise.resolve(value);
			},
		);

		await submitVote("pkg-1", "reject");

		// (Builders are created eagerly for mock-plumbing reasons — see
		// `mockTables` above — so assert non-invocation rather than
		// non-existence of the builder itself.)
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
		expect(
			builders.get("deal_ratification_calls")?.delete,
		).not.toHaveBeenCalled();
	});

	it("runs executeTrade and cleans up the board when a package proposal is unanimously approved", async () => {
		// 2 members total; both approve, so submitVote auto-resolves via the
		// else-branch (executeTrade) rather than the rejection branch.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			students_classes: {
				data: [{ team_id: "team-usa" }, { team_id: "team-china" }],
				error: null,
			},
			votes: {
				data: [{ vote: "approve" }, { vote: "approve" }],
				error: null,
			},
			deal_board_items: { data: null, error: null },
			deal_ratification_calls: { data: null, error: null },
			trade_items: {
				data: [{ issue_id: "issue-1", name: "Steel Tariffs" }],
				error: null,
			},
			teams: {
				data: [{ id: "team-usa" }, { id: "team-china" }],
				error: null,
			},
			team_scores: { data: null, error: null },
		});
		// students_classes is also used for the voter's enrollment lookup
		// (.single()); make it resolve a membership object.
		builders
			.get("students_classes")!
			.single.mockResolvedValue({ data: { team_id: "team-usa" }, error: null });

		// The head-count query resolves via the thenable with a count property.
		builders.get("students_classes")!.then = vi.fn(
			(resolve: (v: unknown) => void) => {
				const value = { data: null, error: null, count: 2 };
				resolve(value);
				return Promise.resolve(value);
			},
		);

		const result = await submitVote("pkg-1", "approve");

		expect(result).toEqual({ success: true });
		// executeTrade ran (all-approve path), not the rejection path:
		expect(builders.get("trade_proposals")!.update).toHaveBeenCalledWith({
			status: "executed",
		});
		expect(builders.get("trade_proposals")!.update).not.toHaveBeenCalledWith({
			status: "rejected",
		});
		// Package cleanup still runs after resolution, scoped to the class:
		expect(builders.get("deal_board_items")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_board_items")!.eq).toHaveBeenCalledWith(
			"class_id",
			"class-1",
		);
		expect(builders.get("deal_ratification_calls")!.delete).toHaveBeenCalled();
		expect(builders.get("deal_ratification_calls")!.eq).toHaveBeenCalledWith(
			"class_id",
			"class-1",
		);
	});

	it("leaves the board intact when executeTrade fails during unanimous approval", async () => {
		// 2 members total, both approve → submitVote takes the executeTrade
		// path, but the trade_items resolution update itself errors out.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			students_classes: {
				data: [{ team_id: "team-usa" }, { team_id: "team-china" }],
				error: null,
			},
			votes: {
				data: [{ vote: "approve" }, { vote: "approve" }],
				error: null,
			},
			deal_board_items: { data: null, error: null },
			deal_ratification_calls: { data: null, error: null },
			teams: {
				data: [{ id: "team-usa" }, { id: "team-china" }],
				error: null,
			},
			team_scores: { data: null, error: null },
		});
		builders
			.get("students_classes")!
			.single.mockResolvedValue({ data: { team_id: "team-usa" }, error: null });
		builders.get("students_classes")!.then = vi.fn(
			(resolve: (v: unknown) => void) => {
				const value = { data: null, error: null, count: 2 };
				resolve(value);
				return Promise.resolve(value);
			},
		);

		// trade_items serves both the item lookup (select) and the resolution
		// (update); the first call succeeds, the second (the update) fails.
		const tradeItemsBuilder = createChainableBuilder();
		let callCount = 0;
		tradeItemsBuilder.then = vi.fn((resolve: (v: unknown) => void) => {
			callCount += 1;
			const value =
				callCount === 1
					? {
							data: [{ issue_id: "issue-1", name: "Steel Tariffs" }],
							error: null,
						}
					: { data: null, error: { message: "constraint violation" } };
			resolve(value);
			return Promise.resolve(value);
		});
		builders.set("trade_items", tradeItemsBuilder);

		const result = await submitVote("pkg-1", "approve");

		expect(result).toEqual({ success: true });
		// executeTrade failed, so the proposal is never marked executed...
		expect(builders.get("trade_proposals")!.update).not.toHaveBeenCalledWith({
			status: "executed",
		});
		// ...and the board is left intact for a retry rather than wiped.
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
		expect(
			builders.get("deal_ratification_calls")?.delete,
		).not.toHaveBeenCalled();
	});
});
