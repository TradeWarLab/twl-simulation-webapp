"use client";

import { useTransition } from "react";
import { submitVote } from "@/app/actions/trade-controller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamCountry, TradeProposal } from "@/lib/types/domain";

type Props = {
	proposal: TradeProposal;
	currentUserId: string;
	classId: string;
	myTeamId: string;
};

export function TradeProposalCard({
	proposal,
	currentUserId,
	classId,
	myTeamId,
}: Props) {
	const [isPending, startTransition] = useTransition();

	const proposingCountry = proposal.proposing_team?.country ?? "USA";
	const isMyProposal = proposal.proposing_team_id === myTeamId;
	const votes = proposal.votes ?? [];
	const myVote = votes.find((v) => v.student_id === currentUserId);
	const approveCount = votes.filter((v) => v.vote === "approve").length;
	const rejectCount = votes.filter((v) => v.vote === "reject").length;
	const totalVotes = votes.length;

	function handleVote(vote: "approve" | "reject") {
		startTransition(async () => {
			await submitVote(proposal.id, vote);
		});
	}

	const statusColors: Record<string, string> = {
		pending:
			"bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
		approved:
			"bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
		rejected:
			"bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
	};

	const flagEmoji = (c: TeamCountry) => (c === "USA" ? "🇺🇸" : "🇨🇳");
	const timeAgo = getTimeAgo(proposal.created_at);

	return (
		<div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<span className="text-lg">{flagEmoji(proposingCountry)}</span>
					<span className="font-semibold text-sm">Team {proposingCountry}</span>
					{isMyProposal && (
						<Badge variant="outline" className="text-xs">
							Your team
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className={`text-xs capitalize ${statusColors[proposal.status] ?? ""}`}
					>
						{proposal.status}
					</Badge>
					<span className="text-xs text-muted-foreground">{timeAgo}</span>
				</div>
			</div>

			{/* Trade Details */}
			<div className="grid grid-cols-2 gap-3 mb-3">
				{/* Offered */}
				<div className="bg-muted/50 rounded-lg p-2.5">
					<div className="text-xs font-medium text-muted-foreground mb-1.5">
						Offers
					</div>
					<div className="flex flex-wrap gap-1.5">
						{proposal.offered_items.map((item) => (
							<span
								key={item.item_id}
								className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200"
							>
								{item.name}
							</span>
						))}
						{proposal.offered_items.length === 0 && (
							<span className="text-xs text-muted-foreground italic">None</span>
						)}
					</div>
				</div>

				{/* Requested */}
				<div className="bg-muted/50 rounded-lg p-2.5">
					<div className="text-xs font-medium text-muted-foreground mb-1.5">
						Requests
					</div>
					<div className="flex flex-wrap gap-1.5">
						{proposal.requested_items.map((item) => (
							<span
								key={item.item_id}
								className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200"
							>
								{item.name}
							</span>
						))}
						{proposal.requested_items.length === 0 && (
							<span className="text-xs text-muted-foreground italic">None</span>
						)}
					</div>
				</div>
			</div>

			{/* Vote Tally */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<span className="text-emerald-500">✓</span> {approveCount}
					</span>
					<span className="flex items-center gap-1">
						<span className="text-red-500">✗</span> {rejectCount}
					</span>
					<span className="text-muted-foreground/60">
						{totalVotes} vote{totalVotes !== 1 ? "s" : ""}
					</span>
				</div>

				{/* Vote Buttons — only show for opposing team and pending proposals */}
				{proposal.status === "pending" && !isMyProposal && (
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant={myVote?.vote === "approve" ? "default" : "outline"}
							onClick={() => handleVote("approve")}
							disabled={isPending}
							className={
								myVote?.vote === "approve"
									? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
									: "text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs h-7"
							}
						>
							✓ Approve
						</Button>
						<Button
							size="sm"
							variant={myVote?.vote === "reject" ? "default" : "outline"}
							onClick={() => handleVote("reject")}
							disabled={isPending}
							className={
								myVote?.vote === "reject"
									? "bg-red-600 hover:bg-red-700 text-white text-xs h-7"
									: "text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-7"
							}
						>
							✗ Reject
						</Button>
					</div>
				)}

				{proposal.status === "pending" && isMyProposal && (
					<span className="text-xs text-muted-foreground italic">
						Awaiting response…
					</span>
				)}
			</div>
		</div>
	);
}

// ─── Helper ──────────────────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diffMs = now - then;
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	return `${Math.floor(diffHr / 24)}d ago`;
}
