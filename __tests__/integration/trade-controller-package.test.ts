import { beforeEach, describe, expect, it, vi } from "vitest";
import { forceAcceptVotes, submitVote } from "@/app/actions/trade-controller";
import { exportClassOutcome } from "@/lib/class-outcome";
import { createChainableBuilder, mockClient } from "../helpers/supabase-mock";

vi.mock("@/lib/class-outcome", () => ({ exportClassOutcome: vi.fn() }));

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
	// exercises the query chain: the mock client resolves `.from(table)`
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

describe("submitVote: package proposals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects the package and leaves the board wipe to the database", async () => {
		// 2 members total; this vote is the 2nd and it is a reject.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			classes: { data: { current_period: 2 }, error: null },
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
		// The handle_package_change trigger does the blank-slate reset in the
		// same transaction as the status change.
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
		expect(
			builders.get("deal_ratification_calls")?.delete,
		).not.toHaveBeenCalled();
	});

	it("does not touch the board when a legacy (non-package) proposal is rejected", async () => {
		const builders = mockTables({
			trade_proposals: {
				data: { ...PACKAGE_PROPOSAL, is_package: false },
				error: null,
			},
			classes: { data: { current_period: 2 }, error: null },
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

		// (Builders are created eagerly for mock-plumbing reasons: see
		// `mockTables` above: so assert non-invocation rather than
		// non-existence of the builder itself.)
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
		expect(
			builders.get("deal_ratification_calls")?.delete,
		).not.toHaveBeenCalled();
	});

	it("finalizes via the SECURITY DEFINER RPC when a package is unanimously approved", async () => {
		// 2 members total; both approve, so submitVote finalizes the deal through
		// finalize_ratified_package (which resolves both teams + scores + ends the
		// round with elevated privileges) rather than the rejection branch.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			classes: { data: { current_period: 2 }, error: null },
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

		mockClient.rpc.mockResolvedValue({ data: null, error: null });

		const result = await submitVote("pkg-1", "approve");

		expect(result).toEqual({ success: true });
		// Finalization runs through the RPC, not the rejection path.
		expect(mockClient.rpc).toHaveBeenCalledWith("finalize_ratified_package", {
			p_proposal_id: "pkg-1",
		});
		expect(builders.get("trade_proposals")!.update).not.toHaveBeenCalledWith({
			status: "rejected",
		});
		// Board cleanup now happens atomically inside the RPC (DB transaction),
		// so submitVote no longer deletes board rows itself on approval.
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
	});

	it("leaves the board intact when the finalize RPC fails during unanimous approval", async () => {
		// 2 members total, both approve → submitVote calls the finalize RPC, but
		// it errors; the DB transaction rolls back, so nothing is wiped.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			classes: { data: { current_period: 2 }, error: null },
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

		mockClient.rpc.mockResolvedValue({
			data: null,
			error: { message: "constraint violation" },
		});

		const result = await submitVote("pkg-1", "approve");

		// The vote is recorded, the RPC rolls back, and the caller is told so it
		// can retry.
		expect(result).toEqual({
			error: "Your vote was saved, but the deal could not be finalized. Try again.",
		});
		expect(mockClient.rpc).toHaveBeenCalledWith("finalize_ratified_package", {
			p_proposal_id: "pkg-1",
		});
		// submitVote never touches the board on approval: the RPC owns that.
		expect(builders.get("deal_board_items")?.delete).not.toHaveBeenCalled();
		expect(
			builders.get("deal_ratification_calls")?.delete,
		).not.toHaveBeenCalled();
	});

	it("refuses a ballot once the round has ended", async () => {
		// end_bilateral_round cancels the package, so this guard is a backstop
		// for paths that leave a proposal pending: notably an instructor
		// stepping the class back to period 1 mid-vote.
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			classes: { data: { current_period: 3 }, error: null },
			students_classes: { data: [{ team_id: "team-usa" }], error: null },
			votes: { data: [], error: null },
		});
		builders
			.get("students_classes")!
			.single.mockResolvedValue({ data: { team_id: "team-usa" }, error: null });

		const result = await submitVote("pkg-1", "approve");

		expect(result).toEqual({ error: "Voting has closed for this round" });
		expect(builders.get("votes")?.upsert).not.toHaveBeenCalled();
	});

	it("exports the outcome that the finalize RPC returns", async () => {
		const builders = mockTables({
			trade_proposals: { data: PACKAGE_PROPOSAL, error: null },
			classes: { data: { current_period: 2 }, error: null },
			students_classes: { data: [{ team_id: "team-usa" }], error: null },
			votes: { data: [{ vote: "approve" }], error: null },
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
		const outcome = { id: 1, outcome: "deal" };
		mockClient.rpc.mockResolvedValue({ data: outcome, error: null });

		const result = await submitVote("pkg-1", "approve");

		expect(result).toEqual({ success: true });
		expect(exportClassOutcome).toHaveBeenCalledWith(outcome);
	});
});

describe("forceAcceptVotes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls the RPC, exports the outcome and reports the result", async () => {
		const outcome = { id: 2, outcome: "deal" };
		mockClient.rpc.mockResolvedValue({
			data: { result: "executed", votes_added: 2, outcome },
			error: null,
		});

		const result = await forceAcceptVotes("class-1", "pkg-1");

		expect(mockClient.rpc).toHaveBeenCalledWith("force_accept_votes", {
			p_proposal_id: "pkg-1",
		});
		expect(exportClassOutcome).toHaveBeenCalledWith(outcome);
		expect(result).toEqual({
			success: true,
			result: "executed",
			votesAdded: 2,
		});
	});

	it("reports a failed deal without an outcome", async () => {
		mockClient.rpc.mockResolvedValue({
			data: { result: "rejected", votes_added: 1 },
			error: null,
		});

		const result = await forceAcceptVotes("class-1", "pkg-1");

		expect(exportClassOutcome).toHaveBeenCalledWith(undefined);
		expect(result).toEqual({
			success: true,
			result: "rejected",
			votesAdded: 1,
		});
	});

	it("surfaces an RPC error", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		mockClient.rpc.mockResolvedValue({
			data: null,
			error: { message: "Not authorized to force-accept votes" },
		});

		expect(await forceAcceptVotes("class-1", "pkg-1")).toEqual({
			error: "Not authorized to force-accept votes",
		});
		expect(exportClassOutcome).not.toHaveBeenCalled();
	});
});
