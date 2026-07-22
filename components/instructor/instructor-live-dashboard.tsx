"use client";

import { Handshake } from "lucide-react";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildViewerValueMap } from "@/lib/realtime/derive";
import {
	useClassRecord,
	useClassStore,
	useDealBoardItems,
	useRatificationCalls,
	useTradeItems,
} from "@/lib/realtime/hooks";
import type {
	ClassRosterEntry,
	TeamCountry,
	TeamScore,
	TradeItem,
} from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { ManageItemsClient } from "./manage-items-client";
import { SectionCard } from "./section-card";
import { SimulationResultsCard } from "./simulation-results-card";
import { StudentRoster } from "./student-roster";

type DashboardProps = {
	roster: ClassRosterEntry[];
	/** Empty when no deal ratified — SimulationResultsCard reads that as no-deal. */
	scores: TeamScore[];
};

type TeamMetric = {
	id: string;
	country: TeamCountry;
	asksTotal: number;
	concessionsTotal: number;
	declaredNet: number;
	resolvedScore: number;
	resolvedCount: number;
	unresolvedCount: number;
	tradeItems: TradeItem[];
};

function formatSigned(value: number) {
	return value > 0 ? `+${value}` : `${value}`;
}

function signedTone(value: number) {
	if (value > 0) return "text-emerald-600 dark:text-emerald-400";
	if (value < 0) return "text-red-600 dark:text-red-400";
	return "text-muted-foreground";
}

function BoardTotalCard({
	label,
	total,
	accent,
	called,
}: {
	label: string;
	total: number;
	accent: "usa" | "china";
	called: boolean;
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
				{called && (
					<div className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
						Called for final vote
					</div>
				)}
			</div>
			<div
				className={cn("text-3xl font-semibold tabular-nums", signedTone(total))}
			>
				{formatSigned(total)}
			</div>
		</div>
	);
}

function RelativeLead({
	usa,
	china,
	prospective,
}: {
	usa: number;
	china: number;
	/** True when comparing the un-ratified board rather than final scores. */
	prospective?: boolean;
}) {
	const diff = Math.abs(usa - china);
	const leader = usa === china ? null : usa > china ? "USA" : "PRC";
	const suffix = prospective ? " if this deal passes" : "";
	return (
		<div className="rounded-xl border bg-muted/30 p-4 text-center">
			<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
				Relative standing
			</div>
			<div className="mt-1 text-lg font-semibold">
				{leader === null ? (
					<span className="text-muted-foreground">
						Tied at {formatSigned(usa)}
						{suffix}
					</span>
				) : (
					<>
						<span
							className={leader === "USA" ? "text-blue-600" : "text-red-600"}
						>
							{leader} leads by {diff}
						</span>
						<span className="text-muted-foreground">{suffix}</span>
					</>
				)}
			</div>
		</div>
	);
}

export function InstructorLiveDashboard({ roster, scores }: DashboardProps) {
	const store = useClassStore();
	const classRecord = useClassRecord();
	const tradeItems = useTradeItems();
	const dealBoardItems = useDealBoardItems();
	const ratificationCalls = useRatificationCalls();

	const teams = store.teams;
	const teamById = useMemo(
		() => new Map(teams.map((team) => [team.id, team])),
		[teams],
	);

	const teamMetrics = useMemo<TeamMetric[]>(() => {
		return teams.map((team) => {
			const items = tradeItems.filter((item) => item.team_id === team.id);
			const asksTotal = items
				.filter((item) => item.role === "ask")
				.reduce((sum, item) => sum + Number(item.value), 0);
			const concessionsTotal = items
				.filter((item) => item.role === "concession")
				.reduce((sum, item) => sum + Number(item.value), 0);
			const resolvedItems = items.filter((item) => item.is_resolved);
			const unresolvedItems = items.filter((item) => !item.is_resolved);

			return {
				id: team.id,
				country: team.country,
				asksTotal,
				concessionsTotal,
				declaredNet: asksTotal + concessionsTotal,
				resolvedScore: resolvedItems.reduce(
					(sum, item) => sum + Number(item.value),
					0,
				),
				resolvedCount: resolvedItems.length,
				unresolvedCount: unresolvedItems.length,
				tradeItems: items,
			};
		});
	}, [teams, tradeItems]);

	const teamMetricsByCountry = useMemo(
		() => new Map(teamMetrics.map((metric) => [metric.country, metric])),
		[teamMetrics],
	);

	// Live shared deal board with BOTH teams' valuations. Item values are
	// per-team (viewer-relative), so the instructor — who has no team — needs
	// each side's own mirror-row value to read the running totals. Mirrors the
	// student board's "Your Net Score Impact", shown for USA and China at once.
	const board = useMemo(() => {
		const usa = teams.find((team) => team.country === "USA");
		const china = teams.find((team) => team.country === "China");
		const usaMap = usa
			? buildViewerValueMap(tradeItems.filter((i) => i.team_id === usa.id))
			: undefined;
		const chinaMap = china
			? buildViewerValueMap(tradeItems.filter((i) => i.team_id === china.id))
			: undefined;
		const lookup = (
			map: Map<string, number> | undefined,
			issueId: string | null,
			name: string,
		) => (issueId ? map?.get(issueId) : undefined) ?? map?.get(name) ?? 0;

		const rows = dealBoardItems.map((row) => ({
			id: row.id,
			name: row.name,
			givingCountry: teamById.get(row.giving_team_id)?.country ?? "USA",
			usaValue: lookup(usaMap, row.issue_id, row.name),
			chinaValue: lookup(chinaMap, row.issue_id, row.name),
		}));
		return {
			rows,
			usaTotal: rows.reduce((sum, r) => sum + r.usaValue, 0),
			chinaTotal: rows.reduce((sum, r) => sum + r.chinaValue, 0),
		};
	}, [dealBoardItems, tradeItems, teams, teamById]);

	const calledCountries = useMemo(
		() =>
			new Set(
				ratificationCalls
					.map((call) => teamById.get(call.team_id)?.country)
					.filter((country): country is TeamCountry => Boolean(country)),
			),
		[ratificationCalls, teamById],
	);

	// Ratification advances the class to the End period on its own
	// (schema.sql:768-770) and deletes the board in the same transaction, so
	// the deal board card would otherwise fall back to its empty state at the
	// exact moment the simulation finished. One condition covers both endings:
	// a ratified deal and an instructor ending a deadlocked class.
	const isComplete = classRecord.current_period === 3;

	return (
		<div className="space-y-6">
			<div className="grid gap-4">
				{isComplete ? (
					<SimulationResultsCard scores={scores} />
				) : (
					<SectionCard
						title="Live Deal Board"
						icon={<Handshake className="h-5 w-5 text-primary" />}
					>
						{board.rows.length === 0 ? (
						<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
							No items on the deal board yet.
						</div>
					) : (
						<div className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<BoardTotalCard
									label="Team USA net"
									total={board.usaTotal}
									accent="usa"
									called={calledCountries.has("USA")}
								/>
								<BoardTotalCard
									label="Team PRC net"
									total={board.chinaTotal}
									accent="china"
									called={calledCountries.has("China")}
								/>
							</div>
							<RelativeLead
								usa={board.usaTotal}
								china={board.chinaTotal}
								prospective
							/>
							<div className="overflow-x-auto rounded-xl border">
								<table className="w-full text-sm">
									<thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
										<tr>
											<th className="px-3 py-2 text-left font-semibold">
												Item
											</th>
											<th className="px-3 py-2 text-left font-semibold">
												Gives
											</th>
											<th className="px-3 py-2 text-right font-semibold">
												USA value
											</th>
											<th className="px-3 py-2 text-right font-semibold">
												PRC value
											</th>
										</tr>
									</thead>
									<tbody>
										{board.rows.map((row) => (
											<tr key={row.id} className="border-t">
												<td className="px-3 py-2">{row.name}</td>
												<td className="px-3 py-2 text-muted-foreground">
													{row.givingCountry === "China" ? "PRC" : "USA"}
												</td>
												<td
													className={cn(
														"px-3 py-2 text-right font-mono tabular-nums",
														signedTone(row.usaValue),
													)}
												>
													{formatSigned(row.usaValue)}
												</td>
												<td
													className={cn(
														"px-3 py-2 text-right font-mono tabular-nums",
														signedTone(row.chinaValue),
													)}
												>
													{formatSigned(row.chinaValue)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</SectionCard>
				)}
			</div>

			<Tabs defaultValue="Trade Breakdown" className="space-y-4">
				<TabsList className="bg-muted/30 border border-border/70 p-1">
					<TabsTrigger value="Trade Breakdown">Trade Breakdown</TabsTrigger>
					<TabsTrigger value="Roster and Team Assignments">
						Roster & Teams
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="Trade Breakdown"
					className="rounded-2xl border border-border/70 bg-card p-5"
				>
					<div className="pt-2">
						<ManageItemsClient
							classId={classRecord.id}
							usaTeamId={teamMetricsByCountry.get("USA")?.id ?? null}
							chinaTeamId={teamMetricsByCountry.get("China")?.id ?? null}
							usaItems={teamMetricsByCountry.get("USA")?.tradeItems ?? []}
							chinaItems={teamMetricsByCountry.get("China")?.tradeItems ?? []}
							readOnly={true}
						/>
					</div>
				</TabsContent>

				<TabsContent
					value="Roster and Team Assignments"
					className="rounded-2xl border border-border/70 bg-card p-5"
				>
					<StudentRoster classId={classRecord.id} roster={roster} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
