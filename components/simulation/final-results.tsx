"use client";

import { deriveOutcome } from "@/lib/simulation/outcome";
import type { TeamScore } from "@/lib/types/domain";

type FinalResultsProps = {
	scores: TeamScore[];
};

export function FinalResults({ scores }: FinalResultsProps) {
	const outcome = deriveOutcome(scores);

	// No score rows means no package ever ratified. Rendering that as 0-0
	// would report a stalemate the class never negotiated its way into.
	if (outcome.kind === "no-deal") {
		return (
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-10">
				<div className="space-y-1 text-center">
					<h2 className="text-3xl font-semibold tracking-tight text-foreground">
						No deal reached
					</h2>
					<p className="text-sm text-muted-foreground">
						Negotiations ended without a ratified agreement.
					</p>
				</div>
				<p className="mx-auto max-w-2xl px-8 text-center text-sm leading-relaxed text-muted-foreground">
					No issues were resolved, so neither delegation scored. Both sides
					absorb the trade-war cost described in their briefings.
				</p>
				<hr />
			</div>
		);
	}

	const { usaPoints, chinaPoints, diff, interpretation } = outcome;
	const isUsaWinner = outcome.winner === "USA";
	const isChinaWinner = outcome.winner === "China";
	const isDraw = outcome.kind === "draw";

	const ScoreCard = ({
		team,
		points,
		isWinner,
		isLoser,
	}: {
		team: string;
		points: number;
		isWinner: boolean;
		isLoser: boolean;
	}) => {
		const isNegative = points < 0;
		return (
			<div
				className={`flex-1 rounded-xl border p-8 text-center ${
					isWinner
						? "border-foreground/30 bg-muted/40"
						: isLoser
							? "border-border opacity-70"
							: "border-border"
				}`}
			>
				<div className="space-y-4">
					<div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
						{team}
					</div>
					<div className="space-y-1">
						<div
							className={`text-6xl font-semibold tabular-nums ${isNegative ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
						>
							{points}
						</div>
						<div
							className={`text-xs ${isNegative ? "text-red-600 dark:text-red-400" : points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
						>
							{isNegative ? "Net loss" : points > 0 ? "Net gain" : "Neutral"}
						</div>
					</div>
					{isWinner && (
						<div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-foreground">
							Winner
						</div>
					)}
					{isLoser && (
						<div className="text-xs text-muted-foreground">Runner-up</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-10">
			{/* Top Header */}
			<div className="space-y-1 text-center">
				<h2 className="text-3xl font-semibold tracking-tight text-foreground">
					Simulation complete
				</h2>
				<p className="text-sm text-muted-foreground">
					{isDraw
						? "The negotiation ended in a draw."
						: `${diff}-point advantage for ${isUsaWinner ? "USA" : "China"}.`}
				</p>
			</div>

			{/* Symmetric Score Grid */}
			<div className="flex flex-col gap-6 px-6 md:flex-row">
				<ScoreCard
					team="USA"
					points={usaPoints}
					isWinner={isUsaWinner}
					isLoser={isChinaWinner}
				/>
				<ScoreCard
					team="China"
					points={chinaPoints}
					isWinner={isChinaWinner}
					isLoser={isUsaWinner}
				/>
			</div>

			{/* Outcome interpretation */}
			<p className="mx-auto max-w-2xl px-8 text-center text-sm leading-relaxed text-muted-foreground">
				{interpretation}
			</p>
			<hr />
		</div>
	);
}
