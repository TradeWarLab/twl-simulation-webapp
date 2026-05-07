"use client";

import { Activity, Download, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
	InstructorDashboardSnapshot,
	InstructorMessage,
} from "@/app/actions/instructor-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	downloadChatsCsv,
	downloadTradeDataCsv,
	downloadTradeItemValuesCsv,
} from "@/lib/csv-export";
import { createClient } from "@/lib/supabase/client";
import type {
	TeamCountry,
	TradeItem,
	TradeProposal,
	TradeProposalItem,
	Vote,
} from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { TradeProposalCard } from "../negotiation/trade-proposal-card";
import { ManageItemsClient } from "./manage-items-client";
import { StudentRoster } from "./student-roster";

type ClassRecord = {
	id: string;
	name: string;
	class_code: string | null;
	current_period: number;
	status: string;
};

type DashboardProps = {
	classRecord: ClassRecord;
	periods: string[];
	initialSnapshot: InstructorDashboardSnapshot;
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

export function InstructorLiveDashboard({
	classRecord,
	initialSnapshot,
}: DashboardProps) {
	const supabase = useMemo(() => createClient(), []);
	const [liveClassRecord, setLiveClassRecord] = useState(classRecord);
	const [tradeItems, setTradeItems] = useState(initialSnapshot.tradeItems);
	const [proposals, setProposals] = useState(initialSnapshot.proposals);
	const [votes, setVotes] = useState(initialSnapshot.votes);
	const [messages, setMessages] = useState(initialSnapshot.messages);
	const [connectionState, setConnectionState] = useState<
		"connecting" | "live" | "offline"
	>("connecting");
	const [highlightedProposalId, setHighlightedProposalId] = useState<
		string | null
	>(null);

	const teams = initialSnapshot.teams;
	const teamMemberCounts = initialSnapshot.teamMemberCounts;
	const teamById = useMemo(
		() => new Map(teams.map((team) => [team.id, team])),
		[teams],
	);
	const teamIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);
	const userLookup = useMemo(() => {
		const lookup = new Map<
			string,
			{ full_name: string | null; email: string | null }
		>();
		for (const entry of initialSnapshot.roster) {
			if (!entry.user_id) continue;
			lookup.set(entry.user_id, {
				full_name: entry.full_name,
				email: entry.email,
			});
		}
		return lookup;
	}, [initialSnapshot.roster]);

	const itemById = useMemo(
		() => new Map(tradeItems.map((item) => [item.id, item])),
		[tradeItems],
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

	useEffect(() => {
		const hydrateProposal = (proposal: TradeProposal): TradeProposal => ({
			...proposal,
			offered_items: (proposal.offered_items ?? []) as TradeProposalItem[],
			requested_items: (proposal.requested_items ?? []) as TradeProposalItem[],
			proposing_team: {
				id: proposal.proposing_team_id,
				country: teamById.get(proposal.proposing_team_id)?.country ?? "USA",
			},
			receiving_team: {
				country: teamById.get(proposal.receiving_team_id)?.country ?? "China",
			},
			creator: {
				full_name: userLookup.get(proposal.created_by)?.full_name ?? null,
			},
		});

		const channel = supabase
			.channel(`instructor-dashboard:${classRecord.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "classes",
					filter: `id=eq.${classRecord.id}`,
				},
				(payload) => {
					const next = payload.new as Partial<ClassRecord>;
					setLiveClassRecord((prev) => ({ ...prev, ...next }));
				},
			)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `class_id=eq.${classRecord.id}`,
				},
				(payload) => {
					const incoming = payload.new as InstructorMessage;
					const sender = userLookup.get(incoming.sender_id);
					setMessages((prev) => {
						if (prev.some((message) => message.id === incoming.id)) return prev;
						return [
							...prev,
							{
								...incoming,
								sender: sender
									? {
											full_name: sender.full_name,
											email: sender.email,
										}
									: null,
							},
						].sort(
							(a, b) =>
								new Date(a.created_at).getTime() -
								new Date(b.created_at).getTime(),
						);
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_items",
					filter: `class_id=eq.${classRecord.id}`,
				},
				(payload) => {
					const nextItem = payload.new as TradeItem;
					const oldItem = payload.old as TradeItem;

					if (payload.eventType === "DELETE") {
						setTradeItems((prev) =>
							prev.filter((item) => item.id !== oldItem.id),
						);
						return;
					}

					setTradeItems((prev) => {
						const index = prev.findIndex((item) => item.id === nextItem.id);
						if (index === -1)
							return [...prev, nextItem].sort((a, b) =>
								a.name.localeCompare(b.name),
							);
						const updated = [...prev];
						updated[index] = nextItem;
						return updated;
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_proposals",
					filter: `class_id=eq.${classRecord.id}`,
				},
				(payload) => {
					const nextProposal = hydrateProposal(payload.new as TradeProposal);
					const oldProposal = payload.old as TradeProposal;

					if (payload.eventType === "DELETE") {
						setProposals((prev) =>
							prev.filter((proposal) => proposal.id !== oldProposal.id),
						);
						return;
					}

					setProposals((prev) => {
						const index = prev.findIndex(
							(proposal) => proposal.id === nextProposal.id,
						);
						if (index === -1) {
							return [...prev, nextProposal].sort(
								(a, b) =>
									new Date(a.created_at).getTime() -
									new Date(b.created_at).getTime(),
							);
						}
						const updated = [...prev];
						updated[index] = { ...updated[index], ...nextProposal };
						return updated;
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "votes",
				},
				(payload) => {
					const nextVote = payload.new as Vote;
					const oldVote = payload.old as Vote;
					const targetTeamId = nextVote?.team_id ?? oldVote?.team_id;
					if (!targetTeamId || !teamIds.has(targetTeamId)) return;

					if (payload.eventType === "DELETE") {
						setVotes((prev) => prev.filter((vote) => vote.id !== oldVote.id));
						return;
					}

					const hydratedVote: Vote = {
						...nextVote,
						user: {
							full_name: userLookup.get(nextVote.user_id)?.full_name ?? null,
						},
					};

					setVotes((prev) => {
						const index = prev.findIndex((vote) => vote.id === hydratedVote.id);
						if (index === -1) return [...prev, hydratedVote];
						const updated = [...prev];
						updated[index] = hydratedVote;
						return updated;
					});
				},
			)
			.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					setConnectionState("live");
					return;
				}

				if (
					status === "CHANNEL_ERROR" ||
					status === "TIMED_OUT" ||
					status === "CLOSED"
				) {
					setConnectionState("offline");
					return;
				}

				setConnectionState("connecting");
			});

		return () => {
			supabase.removeChannel(channel);
		};
	}, [classRecord.id, supabase, teamById, teamIds, userLookup]);

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
										className: liveClassRecord.name,
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
										className: liveClassRecord.name,
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
										className: liveClassRecord.name,
										tradeItems,
										teamById,
									})
								}
							>
								<Download className="h-3.5 w-3.5" />
								Values CSV
							</Button>
							<Badge
								variant="outline"
								className={cn(
									"gap-2",
									connectionState === "live" &&
										"border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
									connectionState === "connecting" &&
										"border-amber-500/40 text-amber-700 dark:text-amber-300",
									connectionState === "offline" &&
										"border-red-500/40 text-red-700 dark:text-red-300",
								)}
							>
								<Radio className="h-3.5 w-3.5" />
								{connectionState === "live"
									? "Live"
									: connectionState === "connecting"
										? "Connecting"
										: "Offline"}
							</Badge>
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

			<Tabs defaultValue="Proposal Queue" className="space-y-4">
				<TabsList className="bg-muted/30 border border-border/70 p-1">
					<TabsTrigger value="Roster and Team Assignments">
						Roster & Teams
					</TabsTrigger>
					<TabsTrigger value="Trade Breakdown">Trade Breakdown</TabsTrigger>
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
										const proposalVotes = votes.filter(
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
					<StudentRoster
						classId={classRecord.id}
						roster={initialSnapshot.roster}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
