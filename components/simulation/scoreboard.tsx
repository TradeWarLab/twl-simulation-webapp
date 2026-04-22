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
			if (oldScore && Number(oldScore.score) !== Number(newScore.score)) {
				setAnimateChange(newScore.team_id);
				setTimeout(() => setAnimateChange(null), 1500);
			}
		}
		setScores(initialScores);
	}, [initialScores, scores.find]);

	const usaScore = scores.find((s) => s.team?.country === "USA");
	const chinaScore = scores.find((s) => s.team?.country === "China");

	const TeamScoreDisplay = ({
		score,
		teamId,
		label,
		countryCode,
	}: {
		score?: number;
		teamId?: string;
		label: string;
		countryCode: "US" | "CN";
	}) => {
		const points = Number(score ?? 0);
		const isNegative = points < 0;
		const isAnimating = animateChange === teamId;
		const color = countryCode === "US" ? "text-blue-600" : "text-red-600";

		return (
			<div
				className={`p-4 text-center transition-all duration-500 ${
					isAnimating ? "bg-muted animate-pulse" : ""
				}`}
			>
				<div
					className={`text-[10px] font-black uppercase tracking-widest mb-1 ${color}`}
				>
					{label}
				</div>
				<div
					className={`text-4xl font-black tabular-nums tracking-tighter ${
						isAnimating
							? "scale-110"
							: isNegative
								? "text-red-500"
								: "text-foreground"
					}`}
				>
					{points}
				</div>
				<div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
					Points
				</div>
			</div>
		);
	};

	return (
		<div className="rounded-xl border-2 bg-card overflow-hidden">
			<div className="px-4 py-2 border-b bg-muted/50">
				<h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
					Bilateral Scoreboard
				</h3>
			</div>
			<div className="grid grid-cols-2 divide-x-2 divide-border">
				<TeamScoreDisplay
					score={usaScore?.score}
					teamId={usaScore?.team_id}
					label="USA"
					countryCode="US"
				/>
				<TeamScoreDisplay
					score={chinaScore?.score}
					teamId={chinaScore?.team_id}
					label="China"
					countryCode="CN"
				/>
			</div>
		</div>
	);
}
