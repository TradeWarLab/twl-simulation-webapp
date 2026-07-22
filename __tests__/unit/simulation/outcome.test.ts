import { describe, expect, it } from "vitest";
import { deriveOutcome } from "@/lib/simulation/outcome";
import type { TeamScore } from "@/lib/types/domain";

function makeScores(usa: number, china: number): TeamScore[] {
	return [
		{
			id: "s1",
			class_id: "class-1",
			team_id: "team-usa",
			score: usa,
			updated_at: "2026-07-21T00:00:00Z",
			team: { country: "USA" },
		},
		{
			id: "s2",
			class_id: "class-1",
			team_id: "team-china",
			score: china,
			updated_at: "2026-07-21T00:00:00Z",
			team: { country: "China" },
		},
	];
}

describe("deriveOutcome", () => {
	it("reports no deal when there are no score rows", () => {
		// finalize_ratified_package writes one row per team unconditionally, so
		// zero rows means no deal was ever ratified.
		expect(deriveOutcome([])).toEqual({ kind: "no-deal" });
	});

	it("distinguishes a negotiated 0-0 tie from a deadlock", () => {
		// The whole point of the feature: both render 0 and 0, but only one of
		// them is a stalemate the class actually negotiated their way into.
		const outcome = deriveOutcome(makeScores(0, 0));
		expect(outcome.kind).toBe("draw");
	});

	it("names the higher-scoring delegation as winner", () => {
		const outcome = deriveOutcome(makeScores(42, 31));
		expect(outcome).toMatchObject({
			kind: "decided",
			usaPoints: 42,
			chinaPoints: 31,
			winner: "USA",
			diff: 11,
		});
	});

	it("names China when China leads", () => {
		expect(deriveOutcome(makeScores(12, 30))).toMatchObject({
			winner: "China",
			diff: 18,
		});
	});

	it("has no winner on a draw", () => {
		expect(deriveOutcome(makeScores(20, 20))).toMatchObject({
			kind: "draw",
			winner: null,
			diff: 0,
		});
	});

	it("compares negative scores correctly", () => {
		expect(deriveOutcome(makeScores(-5, -20))).toMatchObject({
			winner: "USA",
			diff: 15,
		});
	});

	it("uses the marginal interpretation up to and including a 10-point gap", () => {
		const outcome = deriveOutcome(makeScores(10, 0));
		expect(outcome).toMatchObject({ diff: 10 });
		if (outcome.kind === "no-deal")
			throw new Error("expected a decided outcome");
		expect(outcome.interpretation).toMatch(/marginal advantage/i);
	});

	it("uses the clear-lead interpretation from 11 through 25", () => {
		for (const [usa, expected] of [
			[11, /clear strategic lead/i],
			[25, /clear strategic lead/i],
		] as const) {
			const outcome = deriveOutcome(makeScores(usa, 0));
			if (outcome.kind === "no-deal")
				throw new Error("expected a decided outcome");
			expect(outcome.interpretation).toMatch(expected);
		}
	});

	it("uses the decisive interpretation beyond 25", () => {
		const outcome = deriveOutcome(makeScores(26, 0));
		if (outcome.kind === "no-deal")
			throw new Error("expected a decided outcome");
		expect(outcome.interpretation).toMatch(/decisive outcome/i);
	});

	it("treats a missing team row as zero rather than throwing", () => {
		const [usaOnly] = makeScores(15, 0);
		expect(deriveOutcome([usaOnly])).toMatchObject({
			usaPoints: 15,
			chinaPoints: 0,
			winner: "USA",
		});
	});
});
