"use client";

import { Activity, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	downloadChatsCsv,
	downloadTradeDataCsv,
	downloadTradeItemValuesCsv,
} from "@/lib/csv-export";
import { enrichProposal } from "@/lib/realtime/derive";
import {
	useClassRecord,
	useClassStore,
	useMessages,
	useProposals,
	useTradeItems,
	useUserNames,
	useVotes,
} from "@/lib/realtime/hooks";
import type {
	ClassRosterEntry,
	TeamCountry,
	TradeItem,
} from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { TradeProposalCard } from "../negotiation/trade-proposal-card";
import { ManageItemsClient } from "./manage-items-client";
import { StudentRoster } from "./student-roster";

type DashboardProps = {
	roster: ClassRosterEntry[];
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

function SectionCard({
	title,
	description,
	icon,
	children,
	action,
}: {
	title: string;
	description?: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<Card className="border-border/70">
			<CardHeader className="border-b bg-muted/20 pb-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2 text-lg">
							{icon}
							{title}
						</CardTitle>
						{description && (
							<p className="mt-1 text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
					{action}
				</div>
			</CardHeader>
			<CardContent className="p-5">{children}</CardContent>
		</Card>
	);
}

function StandingsCard({
	label,
	score,
	accent,
}: {
	label: string;
	score: number;
	accent: "usa" | "china";
}) {
	return (
		<div
			className={cn(
				"rounded-2xl border p-5",
				accent === "usa"
					? "border-blue-500/20 bg-blue-500/5"
					: "border-red-500/20 bg-red-500/5",
			)}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						{label}
					</div>
					<div className="mt-2 text-5xl font-semibold tracking-tight">
						{score}
					</div>
				</div>
			</div>
		</div>
	);
}

export function InstructorLiveDashboard({ roster }: DashboardProps) {
	const store = useClassStore();
	const classRecord = useClassRecord();
	const tradeItems = useTradeItems();
	const rawProposals = useProposals();
	const votes = useVotes();
	const rawMessages = useMessages();
	const userNames = useUserNames();
	const [highlightedProposalId, setHighlightedProposalId] = useState<
		string | null
	>(null);

	const teams = store.teams;
	const teamMemberCounts = store.teamMemberCounts;
	const teamById = useMemo(
		() => new Map(teams.map((team) => [team.id, team])),
		[teams],
	);
	const userLookup = useMemo(() => {
		const lookup = new Map<
			string,
			{ full_name: string | null; email: string | null }
		>();
		for (const entry of roster) {
			if (!entry.user_id) continue;
			lookup.set(entry.user_id, {
				full_name: entry.full_name,
				email: entry.email,
			});
		}
		return lookup;
	}, [roster]);

	const itemById = useMemo(
		() => new Map(tradeItems.map((item) => [item.id, item])),
		[tradeItems],
	);

	const proposals = useMemo(
		() =>
			rawProposals.map((proposal) =>
				enrichProposal(proposal, {
					votes,
					totalMembers:
						(teamMemberCounts[proposal.proposing_team_id] ?? 0) +
						(teamMemberCounts[proposal.receiving_team_id] ?? 0),
					teamById,
					userNames,
				}),
			),
		[rawProposals, votes, teamMemberCounts, teamById, userNames],
	);

	const messages = useMemo(
		() =>
			rawMessages.map((message) => ({
				...message,
				sender:
					userLookup.get(message.sender_id) ??
					(message.users?.full_name != null
						? { full_name: message.users.full_name, email: null }
						: null),
			})),
		[rawMessages, userLookup],
	);

	const hydratedVotes = useMemo(
		() =>
			votes.map((vote) => ({
				...vote,
				user: {
					full_name:
						vote.user?.full_name ??
						userLookup.get(vote.user_id)?.full_name ??
						userNames.get(vote.user_id) ??
						null,
				},
			})),
		[votes, userLookup, userNames],
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

	return (
		<div className="space-y-6">
			<div className="grid gap-4">
				<SectionCard
					title="Simulation Situation"
					icon={<Activity className="h-5 w-5 text-primary" />}
					action={
						<div className="flex flex-wrap justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="gap-2"
								onClick={() =>
									downloadChatsCsv({
										className: classRecord.name,
										messages,
									})
								}
							>
								<Download className="h-3.5 w-3.5" />
								Chats CSV
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="gap-2"
								onClick={() =>
									downloadTradeDataCsv({
										className: classRecord.name,
										proposals,
										votes,
										itemById,
										teamById,
									})
								}
							>
								<Download className="h-3.5 w-3.5" />
								Trades CSV
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="gap-2"
								onClick={() =>
									downloadTradeItemValuesCsv({
										className: classRecord.name,
										tradeItems,
										teamById,
									})
								}
							>
								<Download className="h-3.5 w-3.5" />
								Values CSV
							</Button>
						</div>
					}
				>
					<div className="grid gap-4 xl:grid-cols-2">
						<StandingsCard
							label="Team USA"
							score={teamMetricsByCountry.get("USA")?.resolvedScore ?? 0}
							accent="usa"
						/>
						<StandingsCard
							label="Team PRC"
							score={teamMetricsByCountry.get("China")?.resolvedScore ?? 0}
							accent="china"
						/>
					</div>
				</SectionCard>
			</div>

			<Tabs defaultValue="Trade Breakdown" className="space-y-4">
				<TabsList className="bg-muted/30 border border-border/70 p-1">
					<TabsTrigger value="Trade Breakdown">Trade Breakdown</TabsTrigger>
					<TabsTrigger value="Roster and Team Assignments">
						Roster & Teams
					</TabsTrigger>
					<TabsTrigger value="Proposal Queue">Proposal Queue</TabsTrigger>
				</TabsList>

				<TabsContent
					value="Proposal Queue"
					className="rounded-2xl border border-border/70 bg-card p-5"
				>
					<div className="mb-4 text-sm text-muted-foreground">
						Pending and executed deals, with vote state and the ability to
						spotlight one for discussion.
					</div>
					<ScrollArea className="h-[500px] pr-4">
						<div className="grid gap-4 xl:grid-cols-2">
							{proposals.length === 0 ? (
								<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
									No proposals yet.
								</div>
							) : (
								proposals
									.slice()
									.reverse()
									.map((proposal) => {
										const proposalVotes = hydratedVotes.filter(
											(vote) => vote.proposal_id === proposal.id,
										);
										const totalMembers =
											(teamMemberCounts[proposal.proposing_team_id] ?? 0) +
											(teamMemberCounts[proposal.receiving_team_id] ?? 0);
										const isHighlighted = highlightedProposalId === proposal.id;

										const tradeVotes = proposalVotes.map((v) => ({
											id: v.id,
											proposal_id: v.proposal_id,
											student_id: v.user_id,
											vote: v.vote,
											created_at: v.created_at,
											student: v.user,
										}));

										return (
											<TradeProposalCard
												key={proposal.id}
												proposal={{ ...proposal, votes: tradeVotes }}
												mode="instructor"
												isHighlighted={isHighlighted}
												onHighlight={() =>
													setHighlightedProposalId((current) =>
														current === proposal.id ? null : proposal.id,
													)
												}
												totalMembers={totalMembers}
												itemById={itemById}
											/>
										);
									})
							)}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent
					value="Trade Breakdown"
					className="rounded-2xl border border-border/70 bg-card p-5"
				>
					<div className="mb-4 text-sm text-muted-foreground">
						Full item-level breakdown for both teams, preserved but no longer
						forced into the instructor’s first read.
					</div>
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
