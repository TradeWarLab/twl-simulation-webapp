"use client";

import { useEffect, useState } from "react";
import type { TeamScore } from "@/lib/types/domain";

type ScoreboardProps = {
	initialScores: TeamScore[];
};

export function Scoreboard({ initialScores }: ScoreboardProps) {
	const [scores, setScores] = useState<TeamScore[]>(initialScores);
	const [animateChange, setAnimateChange] = useState<string | null>(null);

	// Sync state when new props arrive (realtime trigger)
	useEffect(() => {
		// Detect which score changed
		for (const newScore of initialScores) {
			const oldScore = scores.find((s) => s.team_id === newScore.team_id);
			if (oldScore && oldScore.score !== newScore.score) {
				setAnimateChange(newScore.team_id);
				setTimeout(() => setAnimateChange(null), 1500);
			}
		}
		setScores(initialScores);
	}, [initialScores, scores.find]);

	const usaScore = scores.find((s) => s.team?.country === "USA");
	const chinaScore = scores.find((s) => s.team?.country === "China");

	return (
		<div className="rounded-lg border bg-card overflow-hidden shadow-sm">
			<div className="px-4 py-2.5 border-b bg-gradient-to-r from-muted/60 to-muted">
				<h3 className="font-semibold text-sm">🏆 Scoreboard</h3>
			</div>
			<div className="grid grid-cols-2 divide-x divide-border">
				{/* USA Score */}
				<div
					className={`p-4 text-center transition-all duration-500 ${
						animateChange === usaScore?.team_id
							? "bg-blue-50 dark:bg-blue-950/20"
							: ""
					}`}
				>
					<div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
						🇺🇸 USA
					</div>
					<div
						className={`text-3xl font-bold tabular-nums transition-all duration-700 ${
							animateChange === usaScore?.team_id
								? "text-blue-600 scale-110"
								: "text-foreground"
						}`}
					>
						{usaScore?.score ?? 0}
					</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">points</div>
				</div>

				{/* PRC Score */}
				<div
					className={`p-4 text-center transition-all duration-500 ${
						animateChange === chinaScore?.team_id
							? "bg-red-50 dark:bg-red-950/20"
							: ""
					}`}
				>
					<div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
						🇨🇳 PRC
					</div>
					<div
						className={`text-3xl font-bold tabular-nums transition-all duration-700 ${
							animateChange === chinaScore?.team_id
								? "text-red-600 scale-110"
								: "text-foreground"
						}`}
					>
						{chinaScore?.score ?? 0}
					</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">points</div>
				</div>
			</div>
		</div>
	);
}
