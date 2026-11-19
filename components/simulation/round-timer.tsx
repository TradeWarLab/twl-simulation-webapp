"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { ROUND_TWO_MINUTES } from "@/lib/constants";
import { useClassRecord } from "@/lib/realtime/hooks";

function formatRemaining(ms: number): string {
	const totalSeconds = Math.ceil(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Round 2 countdown from classes.round2_started_at. It does not end the round:
 * the instructor does. Shows nothing outside period 2.
 */
export function RoundTimer({
	audience,
}: {
	audience: "student" | "instructor";
}) {
	const { current_period, round2_started_at } = useClassRecord();
	// Null until mounted, so the server and the first client render match.
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	if (current_period !== 2 || !round2_started_at || now === null) return null;

	const remaining =
		new Date(round2_started_at).getTime() + ROUND_TWO_MINUTES * 60_000 - now;

	if (remaining <= 0) {
		return (
			<div
				role="status"
				className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive"
			>
				<Clock className="h-4 w-4" aria-hidden="true" />
				{audience === "instructor"
					? "Time is up. End the round when you are ready."
					: "Time is up"}
			</div>
		);
	}

	return (
		<div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
			<Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			<span className="text-muted-foreground">Time left</span>
			<span className="font-mono font-semibold tabular-nums">
				{formatRemaining(remaining)}
			</span>
		</div>
	);
}
