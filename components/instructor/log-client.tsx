"use client";

import { Download, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MessageRecord, SimulationLogSnapshot } from "@/app/actions/log";
import { TradeProposalCard } from "@/components/negotiation/trade-proposal-card";
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

type ValueUpdate = {
	id: string;
	itemId: string;
	name: string;
	team: TeamCountry | "Unknown";
	value: number;
	timestamp: string;
};

export function LogClient({
	classId,
	simulationName,
	initialSnapshot,
	className,
}: {
	classId: string;
	simulationName: string;
	initialSnapshot: SimulationLogSnapshot;
	className?: string;
}) {
	const supabase = useMemo(() => createClient(), []);
	const [messages, setMessages] = useState(initialSnapshot.messages);
	const [tradeItems, setTradeItems] = useState(initialSnapshot.tradeItems);
	const [proposals, setProposals] = useState(initialSnapshot.proposals);
	const [votes, setVotes] = useState(initialSnapshot.votes);
	const [valueUpdates, setValueUpdates] = useState<ValueUpdate[]>([]);
	const [connectionState, setConnectionState] = useState<
		"connecting" | "live" | "offline"
	>("connecting");

	const teams = initialSnapshot.teams;
	const teamById = useMemo(
		() => new Map(teams.map((team) => [team.id, team])),
		[teams],
	);
	const teamIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);
	const userById = useMemo(
		() => new Map(initialSnapshot.users.map((user) => [user.id, user])),
		[initialSnapshot.users],
	);
	const itemById = useMemo(
		() => new Map(tradeItems.map((item) => [item.id, item])),
		[tradeItems],
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
				full_name: userById.get(proposal.created_by)?.full_name ?? null,
			},
		});

		const channel = supabase
			.channel(`instructor-log:${classId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const incoming = payload.new as MessageRecord;
					const sender = userById.get(incoming.sender_id);
					setMessages((prev) => {
						if (prev.some((message) => message.id === incoming.id)) return prev;
						return [
							...prev,
							{
								...incoming,
								sender: sender
									? {
											full_name: sender.full_name,
											email: sender.email ?? "",
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
					filter: `class_id=eq.${classId}`,
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
						if (index === -1) {
							return [...prev, nextItem].sort((a, b) =>
								a.name.localeCompare(b.name),
							);
						}
						const updated = [...prev];
						updated[index] = nextItem;
						return updated;
					});

					if (payload.eventType === "UPDATE") {
						const team = (teamById.get(nextItem.team_id)?.country ??
							"Unknown") as TeamCountry | "Unknown";
						setValueUpdates((prev) =>
							[
								{
									id: `${nextItem.id}:${Date.now()}`,
									itemId: nextItem.id,
									name: nextItem.name,
									team,
									value: Number(nextItem.value),
									timestamp: new Date().toISOString(),
								},
								...prev,
							].slice(0, 30),
						);
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_proposals",
					filter: `class_id=eq.${classId}`,
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
							full_name: userById.get(nextVote.user_id)?.full_name ?? null,
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
	}, [classId, supabase, teamById, teamIds, userById]);

	return (
		<div className={cn("space-y-5", className)}>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-xl font-bold tracking-tight">Live Log</h2>
					<p className="text-sm text-muted-foreground">
						Monitor team chat, value changes, and formal trade proposals.
					</p>
				</div>
				<div className="flex items-center gap-2">
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
					<Button
						onClick={() =>
							downloadChatsCsv({
								className: simulationName,
								messages,
							})
						}
						size="sm"
						variant="outline"
						className="gap-2"
					>
						<Download className="w-4 h-4" />
						Chats CSV
					</Button>
					<Button
						onClick={() =>
							downloadTradeDataCsv({
								className: simulationName,
								proposals,
								votes,
								itemById,
								teamById,
							})
						}
						size="sm"
						variant="outline"
						className="gap-2"
					>
						<Download className="w-4 h-4" />
						Trades CSV
					</Button>
					<Button
						onClick={() =>
							downloadTradeItemValuesCsv({
								className: simulationName,
								tradeItems,
								teamById,
							})
						}
						size="sm"
						variant="outline"
						className="gap-2"
					>
						<Download className="w-4 h-4" />
						Values CSV
					</Button>
				</div>
			</div>

			<Tabs defaultValue="chat" className="space-y-4">
				<TabsList className="bg-muted/30 border border-border/70 p-1">
					<TabsTrigger value="chat">Chat</TabsTrigger>
					<TabsTrigger value="values">Value Updates</TabsTrigger>
					<TabsTrigger value="trades">Proposed Trades</TabsTrigger>
				</TabsList>

				<TabsContent value="chat">
					<ChatPerspectives messages={messages} />
				</TabsContent>

				<TabsContent value="values">
					<ValueMonitor
						tradeItems={tradeItems}
						teams={teams}
						valueUpdates={valueUpdates}
					/>
				</TabsContent>

				<TabsContent value="trades">
					<TradeMonitor
						proposals={proposals}
						votes={votes}
						itemById={itemById}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function ChatPerspectives({ messages }: { messages: MessageRecord[] }) {
	const channels = [
		{ value: "team_usa", label: "Team USA" },
		{ value: "team_china", label: "Team China" },
		{ value: "global", label: "Global" },
	];

	return (
		<Card>
			<CardContent className="p-4">
				<Tabs defaultValue="team_usa" className="space-y-4">
					<TabsList variant="line" className="w-full justify-start">
						{channels.map((channel) => (
							<TabsTrigger key={channel.value} value={channel.value}>
								{channel.label}
								<Badge variant="secondary" className="ml-1 h-5 px-1.5">
									{
										messages.filter((msg) => msg.channel === channel.value)
											.length
									}
								</Badge>
							</TabsTrigger>
						))}
					</TabsList>

					{channels.map((channel) => (
						<TabsContent key={channel.value} value={channel.value}>
							<MessageList
								messages={messages.filter(
									(message) => message.channel === channel.value,
								)}
							/>
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
		</Card>
	);
}

function MessageList({ messages }: { messages: MessageRecord[] }) {
	return (
		<ScrollArea className="h-[560px] pr-4">
			<div className="space-y-3">
				{messages.length === 0 ? (
					<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
						No messages in this channel yet.
					</div>
				) : (
					messages.map((msg) => (
						<div key={msg.id} className="rounded-xl border bg-card p-4">
							<div className="mb-1 flex flex-wrap items-center gap-2">
								<span className="font-semibold text-sm">
									{msg.sender?.full_name ?? msg.sender?.email ?? "Unknown"}
								</span>
								<span className="text-xs text-muted-foreground">
									{formatDateTime(msg.created_at)}
								</span>
							</div>
							<p className="whitespace-pre-wrap text-sm leading-6">
								{msg.content}
							</p>
						</div>
					))
				)}
			</div>
		</ScrollArea>
	);
}

function ValueMonitor({
	tradeItems,
	teams,
	valueUpdates,
}: {
	tradeItems: TradeItem[];
	teams: { id: string; country: TeamCountry }[];
	valueUpdates: ValueUpdate[];
}) {
	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
			<div className="grid gap-4 md:grid-cols-2">
				{teams.map((team) => (
					<Card key={team.id}>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Team {team.country}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{tradeItems.filter((item) => item.team_id === team.id)
									.length === 0 ? (
									<div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
										No trade items configured.
									</div>
								) : (
									tradeItems
										.filter((item) => item.team_id === team.id)
										.map((item) => (
											<div
												key={item.id}
												className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
											>
												<span className="min-w-0 truncate text-sm">
													{item.name}
												</span>
												<Badge
													variant="outline"
													className={cn(
														"font-mono tabular-nums",
														Number(item.value) > 0 &&
															"text-emerald-700 dark:text-emerald-300",
														Number(item.value) < 0 &&
															"text-red-700 dark:text-red-300",
													)}
												>
													{formatSignedValue(Number(item.value))}
												</Badge>
											</div>
										))
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Live Changes</CardTitle>
					<p className="text-xs text-muted-foreground">
						Shows updates received while this page is open.
					</p>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[500px] pr-3">
						<div className="space-y-2">
							{valueUpdates.length === 0 ? (
								<div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
									No value updates observed yet.
								</div>
							) : (
								valueUpdates.map((update) => (
									<div
										key={update.id}
										className="rounded-lg border p-3 text-sm"
									>
										<div className="mb-1 flex items-center justify-between gap-2">
											<Badge variant="secondary">Team {update.team}</Badge>
											<span className="text-xs text-muted-foreground">
												{formatTime(update.timestamp)}
											</span>
										</div>
										<div className="font-medium">{update.name}</div>
										<div className="text-muted-foreground">
											updated to{" "}
											<span className="font-mono text-foreground">
												{formatSignedValue(update.value)}
											</span>
										</div>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}

function TradeMonitor({
	proposals,
	votes,
	itemById,
}: {
	proposals: TradeProposal[];
	votes: Vote[];
	itemById: Map<string, TradeItem>;
}) {
	const newestFirst = proposals
		.slice()
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);

	return (
		<Card>
			<CardContent className="p-5">
				<ScrollArea className="h-[560px] pr-4">
					<div className="grid gap-4 xl:grid-cols-2">
						{newestFirst.length === 0 ? (
							<div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
								No trade proposals yet.
							</div>
						) : (
							newestFirst.map((proposal) => {
								const tradeVotes = votes
									.filter((vote) => vote.proposal_id === proposal.id)
									.map((vote) => ({
										id: vote.id,
										proposal_id: vote.proposal_id,
										student_id: vote.user_id,
										vote: vote.vote,
										created_at: vote.created_at,
										student: vote.user,
									}));

								return (
									<TradeProposalCard
										key={proposal.id}
										proposal={{ ...proposal, votes: tradeVotes }}
										mode="instructor"
										itemById={itemById}
									/>
								);
							})
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function formatSignedValue(value: number) {
	return value > 0 ? `+${value}` : `${value}`;
}

function formatTime(date: string) {
	return new Date(date).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDateTime(date: string) {
	return `${new Date(date).toLocaleDateString()} ${formatTime(date)}`;
}
