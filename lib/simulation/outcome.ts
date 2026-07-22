import type { TeamCountry, TeamScore } from "@/lib/types/domain";

export type Outcome =
	| { kind: "no-deal" }
	| {
			kind: "draw" | "decided";
			usaPoints: number;
			chinaPoints: number;
			/** Null on a draw. */
			winner: TeamCountry | null;
			diff: number;
			interpretation: string;
	  };

const STALEMATE =
	"The negotiation reached a stalemate. Neither side was able to secure a numeric advantage, resulting in a maintenance of the current geopolitical status quo.";

function interpret(winner: TeamCountry, diff: number): string {
	if (diff <= 10)
		return `A marginal advantage for ${winner}. The simulation was highly balanced, with both delegations successfully protecting their core national interests.`;
	if (diff <= 25)
		return `A clear strategic lead for ${winner}. Their delegation secured significant concessions while maintaining stable domestic valuations across key issues.`;
	return `A decisive outcome in favor of ${winner}. The scoring differential indicates a major shift in the bilateral relationship, with one side securing high-leverage objectives.`;
}

/**
 * The single source of truth for who won. Both the student end screen and the
 * instructor results card derive from this, so they cannot disagree.
 *
 * An empty `scores` array means no deal was ratified — NOT a 0-0 draw.
 * finalize_ratified_package inserts a row per team unconditionally
 * (schema.sql:754-763), so rows exist if and only if a package ratified.
 * Reading absent scores as zeros is what made a deadlocked class report a
 * stalemate it never negotiated.
 */
export function deriveOutcome(scores: TeamScore[]): Outcome {
	if (scores.length === 0) return { kind: "no-deal" };

	const usaPoints = Number(
		scores.find((score) => score.team?.country === "USA")?.score ?? 0,
	);
	const chinaPoints = Number(
		scores.find((score) => score.team?.country === "China")?.score ?? 0,
	);
	const diff = Math.abs(usaPoints - chinaPoints);

	if (usaPoints === chinaPoints) {
		return {
			kind: "draw",
			usaPoints,
			chinaPoints,
			winner: null,
			diff: 0,
			interpretation: STALEMATE,
		};
	}

	const winner: TeamCountry = usaPoints > chinaPoints ? "USA" : "China";
	return {
		kind: "decided",
		usaPoints,
		chinaPoints,
		winner,
		diff,
		interpretation: interpret(winner, diff),
	};
}
