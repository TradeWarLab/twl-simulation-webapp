"use client";

import { Trophy } from "lucide-react";
import { deriveOutcome } from "@/lib/simulation/outcome";
import type { TeamScore } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { SectionCard } from "./section-card";

/**
 * Post-simulation readout for the instructor. Occupies the slot the Live Deal
 * Board card uses during play — ratification deletes the board
 * (schema.sql:766), so that card would otherwise read "No items on the deal
 * board yet" at the exact moment the simulation finished.
 *
 * Deliberately compact: the student end screen is a moment, this is a readout
 * sitting above a working dashboard. Both derive from deriveOutcome, so they
 * cannot disagree about who won.
 */
export function SimulationResultsCard({ scores }: { scores: TeamScore[] }) {
	const outcome = deriveOutcome(scores);

	if (outcome.kind === "no-deal") {
		return (
			<SectionCard
				title="No deal reached"
				icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
			>
				<div className="space-y-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
					<p className="font-medium text-foreground">
						Negotiations ended without a ratified agreement.
					</p>
					<p>
						No issues were resolved, so neither delegation scored. Both sides
						absorb the trade-war cost described in their briefings.
					</p>
				</div>
			</SectionCard>
		);
	}

	const { usaPoints, chinaPoints, diff, interpretation, winner } = outcome;

	return (
		<SectionCard
			title="Simulation complete"
			icon={<Trophy className="h-5 w-5 text-primary" />}
		>
			<div className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<ScoreTile
						label="Team USA"
						points={usaPoints}
						accent="usa"
						isWinner={winner === "USA"}
					/>
					<ScoreTile
						label="Team PRC"
						points={chinaPoints}
						accent="china"
						isWinner={winner === "China"}
					/>
				</div>

				<div className="rounded-xl border bg-muted/30 p-4 text-center">
					<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						Final standing
					</div>
					<div className="mt-1 text-lg font-semibold">
						{winner === null ? (
							<span className="text-muted-foreground">Tied at {usaPoints}</span>
						) : (
							<span
								className={winner === "USA" ? "text-blue-600" : "text-red-600"}
							>
								{winner === "USA" ? "USA" : "PRC"} leads by {diff}
							</span>
						)}
					</div>
				</div>

				<p className="text-sm leading-relaxed text-muted-foreground">
					{interpretation}
				</p>
			</div>
		</SectionCard>
	);
}

function ScoreTile({
	label,
	points,
	accent,
	isWinner,
}: {
	label: string;
	points: number;
	accent: "usa" | "china";
	isWinner: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-xl border p-4",
				accent === "usa"
					? "border-blue-500/20 bg-blue-500/5"
					: "border-red-500/20 bg-red-500/5",
			)}
		>
			<div>
				<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</div>
				{isWinner && (
					<div className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
						Winner
					</div>
				)}
			</div>
			<div
				className={cn(
					"text-3xl font-semibold tabular-nums",
					points > 0
						? "text-emerald-600 dark:text-emerald-400"
						: points < 0
							? "text-red-600 dark:text-red-400"
							: "text-muted-foreground",
				)}
			>
				{points}
			</div>
		</div>
	);
}
