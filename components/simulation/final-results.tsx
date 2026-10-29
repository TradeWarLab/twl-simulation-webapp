"use client";

import { deriveOutcome, type NoDealCosts } from "@/lib/simulation/outcome";
import type { TeamScore } from "@/lib/types/domain";

type FinalResultsProps = {
	scores: TeamScore[];
	noDealCosts: NoDealCosts;
};

function ScoreCard({
	team,
	points,
	isWinner,
	isLoser,
}: {
	team: string;
	/** Null when the viewer may not see this team's no-deal cost. */
	points: number | null;
	isWinner: boolean;
	isLoser: boolean;
}) {
	if (points === null) {
		return (
			<div className="flex-1 rounded-xl border border-border p-8 text-center">
				<div className="space-y-4">
					<div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
						{team}
					</div>
					<div className="text-2xl font-semibold text-muted-foreground">
						Classified
					</div>
				</div>
			</div>
		);
	}

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
}

export function FinalResults({ scores, noDealCosts }: FinalResultsProps) {
	const outcome = deriveOutcome(scores, noDealCosts);

	if (outcome.kind === "no-deal") {
		return (
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-10">
				<div className="space-y-1 text-center">
					<h2 className="text-3xl font-semibold tracking-tight text-foreground">
						No deal reached
					</h2>
					<p className="text-sm text-muted-foreground">
						Negotiations ended without a ratified agreement.
					</p>
				</div>
				<div className="flex flex-col gap-6 px-6 md:flex-row">
					<ScoreCard
						team="USA"
						points={outcome.usaPoints}
						isWinner={false}
						isLoser={false}
					/>
					<ScoreCard
						team="China"
						points={outcome.chinaPoints}
						isWinner={false}
						isLoser={false}
					/>
				</div>
				<p className="mx-auto max-w-2xl px-8 text-center text-sm leading-relaxed text-muted-foreground">
					{outcome.interpretation}
				</p>
				<hr />
			</div>
		);
	}

	const { usaPoints, chinaPoints, diff, interpretation } = outcome;
	const isUsaWinner = outcome.winner === "USA";
	const isChinaWinner = outcome.winner === "China";
	const isDraw = outcome.kind === "draw";

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
