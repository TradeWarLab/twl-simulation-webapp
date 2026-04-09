"use client";

import { TradeProposal, Vote, VoteChoice } from "@/lib/types/domain";
import {
	submitVote,
	getVotesForProposal,
} from "@/app/actions/trade-controller";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useTransition } from "react";

type VotingPanelProps = {
	proposal: TradeProposal;
	currentUserId: string;
	myTeamId: string;
	onClose: () => void;
};

export function VotingPanel({
	proposal,
	currentUserId,
	myTeamId,
	onClose,
}: VotingPanelProps) {
	const [votes, setVotes] = useState<Vote[]>([]);
	const [isPending, startTransition] = useTransition();
	const [hasVoted, setHasVoted] = useState(false);
	const [myVote, setMyVote] = useState<VoteChoice | null>(null);

	// Fetch votes on mount and when proposal changes
	useEffect(() => {
		async function loadVotes() {
			const data = await getVotesForProposal(proposal.id);
			setVotes(data);
			const existing = data.find((v) => v.user_id === currentUserId);
			if (existing) {
				setHasVoted(true);
				setMyVote(existing.vote);
			}
		}
		loadVotes();
	}, [proposal.id, currentUserId]);

	const handleVote = (vote: VoteChoice) => {
		startTransition(async () => {
			const result = await submitVote(proposal.id, vote);
			if (!result.error) {
				setHasVoted(true);
				setMyVote(vote);
				// Refresh votes
				const data = await getVotesForProposal(proposal.id);
				setVotes(data);
			}
		});
	};

	const isMyTeamProposal = proposal.proposing_team_id === myTeamId;
	const isResolved = proposal.status !== "pending";
	const approvals = votes.filter((v) => v.vote === "approve").length;
	const rejections = votes.filter((v) => v.vote === "reject").length;

	return (
		<div className="flex flex-col h-full animate-in slide-in-from-right-2 duration-200">
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b bg-white dark:bg-slate-950 rounded-t-md">
				<div>
					<h4 className="font-semibold text-sm">Trade Proposal</h4>
					<p className="text-xs text-muted-foreground">
						{proposal.proposing_team?.country} →{" "}
						{proposal.receiving_team?.country}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant="secondary"
						className={`text-[10px] ${
							proposal.status === "executed"
								? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
								: proposal.status === "rejected"
									? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
									: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
						}`}
					>
						{proposal.status}
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="h-7 text-xs"
					>
						← Back
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1 p-4">
				<div className="space-y-4">
					{/* Items Being Traded */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-2">
								🤝 Offered ({proposal.proposing_team?.country})
							</p>
							<div className="space-y-1">
								{(proposal.offered_items ?? []).map((item, i) => (
									<div
										key={i}
										className="text-xs px-3 py-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
									>
										<span className="font-medium">{item.name}</span>
										<span className="float-right text-indigo-600 dark:text-indigo-400">
											{item.value} pts
										</span>
									</div>
								))}
							</div>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-2">
								📥 Requested ({proposal.receiving_team?.country})
							</p>
							<div className="space-y-1">
								{(proposal.requested_items ?? []).map((item, i) => (
									<div
										key={i}
										className="text-xs px-3 py-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
									>
										<span className="font-medium">{item.name}</span>
										<span className="float-right text-purple-600 dark:text-purple-400">
											{item.value} pts
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Vote Tally */}
					<div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3">
						<p className="text-xs font-medium mb-2">Vote Tally</p>
						<div className="flex gap-4 mb-2">
							<div className="flex-1 text-center">
								<div className="text-2xl font-bold text-emerald-600">
									{approvals}
								</div>
								<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
									Approve
								</div>
							</div>
							<div className="w-px bg-slate-200 dark:bg-slate-700" />
							<div className="flex-1 text-center">
								<div className="text-2xl font-bold text-red-500">
									{rejections}
								</div>
								<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
									Reject
								</div>
							</div>
						</div>
						{proposal.vote_summary && (
							<div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
									style={{
										width: `${proposal.vote_summary.total_members > 0 ? (votes.length / proposal.vote_summary.total_members) * 100 : 0}%`,
									}}
								/>
							</div>
						)}
						<p className="text-[10px] text-muted-foreground text-center mt-1">
							{votes.length} / {proposal.vote_summary?.total_members ?? "?"}{" "}
							members voted
						</p>
					</div>

					{/* Individual Votes */}
					{votes.length > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-2">
								Individual Votes
							</p>
							<div className="space-y-1">
								{votes.map((v) => (
									<div
										key={v.id}
										className="flex items-center justify-between text-xs px-3 py-1.5 rounded-md bg-white dark:bg-slate-950 border"
									>
										<span>{v.user?.full_name ?? "Unknown"}</span>
										<Badge
											variant="secondary"
											className={`text-[10px] ${
												v.vote === "approve"
													? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
													: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
											}`}
										>
											{v.vote}
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Vote Actions */}
			{!isResolved && (
				<div className="p-3 border-t bg-white dark:bg-slate-950 rounded-b-md">
					{hasVoted ? (
						<div className="text-center">
							<p className="text-xs text-muted-foreground">
								You voted:{" "}
								<span
									className={`font-semibold ${
										myVote === "approve" ? "text-emerald-600" : "text-red-500"
									}`}
								>
									{myVote}
								</span>
							</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								Waiting for other members…
							</p>
						</div>
					) : (
						<div className="flex gap-2">
							<Button
								onClick={() => handleVote("approve")}
								disabled={isPending}
								className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								✓ Approve
							</Button>
							<Button
								onClick={() => handleVote("reject")}
								disabled={isPending}
								variant="destructive"
								className="flex-1"
							>
								✗ Reject
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
