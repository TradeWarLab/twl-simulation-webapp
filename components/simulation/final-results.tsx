"use client";

import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
				className={`flex-1 rounded-xl border-2 p-10 text-center transition-all ${
					isWinner
						? "border-foreground bg-foreground/5 shadow-sm"
						: isLoser
							? "border-muted-foreground/20 opacity-60 bg-muted/20"
							: "border-border"
				}`}
			>
				<div className="space-y-6">
					<div className="text-xl font-black uppercase tracking-widest text-muted-foreground">
						{team}
					</div>
					<div className="space-y-1">
						<div
							className={`text-8xl font-black tracking-tighter tabular-nums ${isNegative ? "text-red-500" : "text-foreground"}`}
						>
							{points}
						</div>
						<div
							className={`text-xs font-bold uppercase tracking-widest ${isNegative ? "text-red-500" : points > 0 ? "text-emerald-600" : "text-muted-foreground"}`}
						>
							{isNegative ? "Net Loss" : points > 0 ? "Net Gain" : "Neutral"}
						</div>
					</div>
					{isWinner && (
						<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background text-[10px] font-black uppercase tracking-widest mx-auto">
							<Trophy className="w-3 h-3" /> Winner
						</div>
					)}
					{isLoser && (
						<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
							Simulation Defeat
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-12 py-10 max-w-4xl mx-auto w-full">
			{/* Top Header */}
			<div className="text-center space-y-3">
				<h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
					Simulation Complete
				</h2>
				{!isDraw && (
					<div className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
						{diff} point advantage for {isUsaWinner ? "USA" : "China"}
					</div>
				)}
			</div>

			{/* Symmetric Score Grid */}
			<div className="flex flex-col md:flex-row gap-8 px-6">
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
			<div className="px-8 max-w-2xl mx-auto text-center space-y-4">
				<div className="h-1 w-12 bg-border mx-auto mb-6" />
				<p className="text-base leading-relaxed text-muted-foreground font-medium">
					{getInterpretation()}
				</p>
			</div>

			{/* Action Footer */}
			<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 px-6 border-t border-border/50">
				<Button
					asChild
					variant="secondary"
					className="w-full sm:w-auto h-12 px-10 rounded-xl font-black uppercase tracking-widest text-xs"
				>
					<Link href="/student/dashboard" className="flex items-center gap-2">
						<ArrowLeft className="w-4 h-4" /> Exit Simulation
					</Link>
				</Button>
				<Button
					asChild
					className="w-full sm:w-auto h-12 px-10 rounded-xl font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-foreground/90 shadow-sm"
				>
					<a href="#log-analysis">View Negotiation Log & Analysis</a>
				</Button>
			</div>
		</div>
	);
}
