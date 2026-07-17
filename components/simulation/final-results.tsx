"use client";

import type { TeamScore } from "@/lib/types/domain";

type FinalResultsProps = {
	scores: TeamScore[];
};

export function FinalResults({ scores }: FinalResultsProps) {
	const usaScore = scores.find((s) => s.team?.country === "USA");
	const chinaScore = scores.find((s) => s.team?.country === "China");

	const usaPoints = Number(usaScore?.score ?? 0);
	const chinaPoints = Number(chinaScore?.score ?? 0);

	const isUsaWinner = usaPoints > chinaPoints;
	const isChinaWinner = chinaPoints > usaPoints;
	const isDraw = usaPoints === chinaPoints;

	const diff = Math.abs(usaPoints - chinaPoints);

	const getInterpretation = () => {
		const winner = isUsaWinner ? "USA" : "China";
		if (isDraw)
			return "The negotiation reached a stalemate. Neither side was able to secure a numeric advantage, resulting in a maintenance of the current geopolitical status quo.";
		if (diff <= 10)
			return `A marginal advantage for ${winner}. The simulation was highly balanced, with both delegations successfully protecting their core national interests.`;
		if (diff <= 25)
			return `A clear strategic lead for ${winner}. Their delegation secured significant concessions while maintaining stable domestic valuations across key issues.`;
		return `A decisive outcome in favor of ${winner}. The scoring differential indicates a major shift in the bilateral relationship, with one side securing high-leverage objectives.`;
	};

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
				{getInterpretation()}
			</p>
			<hr></hr>
		</div>
	);
}
