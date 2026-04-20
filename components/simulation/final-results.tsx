"use client";

import type { TeamScore } from "@/lib/types/domain";

type FinalResultsProps = {
	scores: TeamScore[];
};

export function FinalResults({ scores }: FinalResultsProps) {
	const usaScore = scores.find((s) => s.team?.country === "USA");
	const chinaScore = scores.find((s) => s.team?.country === "China");

	const usaPoints = usaScore?.score ?? 0;
	const chinaPoints = chinaScore?.score ?? 0;

	let winner: string;
	let winnerColor: string;

	if (usaPoints > chinaPoints) {
		winner = "USA Wins!";
		winnerColor = "text-blue-600 dark:text-blue-400";
	} else if (chinaPoints > usaPoints) {
		winner = "PRC Wins!";
		winnerColor = "text-red-600 dark:text-red-400";
	} else {
		winner = "It's a Draw!";
		winnerColor = "text-muted-foreground";
	}

	return (
		<div className="flex flex-col h-full">
			<div className="text-center mb-6">
				<div className="text-2xl font-bold mb-2">Simulation Complete</div>
				<div className={`text-xl font-semibold ${winnerColor}`}>{winner}</div>
			</div>

			<div className="flex-1 flex items-center justify-center">
				<div className="rounded-lg border bg-card overflow-hidden shadow-sm w-full max-w-md">
					<div className="px-4 py-2.5 border-b bg-gradient-to-r from-muted/60 to-muted">
						<h3 className="font-semibold text-sm">Final Scores</h3>
					</div>
					<div className="grid grid-cols-2 divide-x divide-border">
						{/* USA Score */}
						<div className="p-6 text-center">
							<div className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
								🇺🇸 USA
							</div>
							<div className="text-4xl font-bold tabular-nums text-foreground mb-1">
								{usaPoints}
							</div>
							<div className="text-xs text-muted-foreground">points</div>
							{usaPoints > chinaPoints && (
								<div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
									Winner
								</div>
							)}
						</div>

						{/* China Score */}
						<div className="p-6 text-center">
							<div className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
								🇨🇳 PRC
							</div>
							<div className="text-4xl font-bold tabular-nums text-foreground mb-1">
								{chinaPoints}
							</div>
							<div className="text-xs text-muted-foreground">points</div>
							{chinaPoints > usaPoints && (
								<div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
									Winner
								</div>
							)}
						</div>
					</div>
					{usaPoints === chinaPoints && (
						<div className="px-4 py-2 text-center border-t bg-muted/30">
							<div className="text-sm text-muted-foreground">Draw</div>
						</div>
					)}
				</div>
			</div>

			<div className="text-center text-sm text-muted-foreground mt-4">
				Thank you for participating in the trade war simulation!
			</div>
		</div>
	);
}
