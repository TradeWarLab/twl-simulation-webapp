"use client";

import { Vote as VoteIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { forceAcceptVotes } from "@/app/actions/trade-controller";
import { Button } from "@/components/ui/button";
import { useClassStore, useProposals, useVotes } from "@/lib/realtime/hooks";
import { SectionCard } from "./section-card";

/**
 * Progress of the open package vote, with the instructor's force-accept for
 * students who left. Shows nothing when no vote is open.
 */
export function OpenVoteCard({ classId }: { classId: string }) {
	const store = useClassStore();
	const proposals = useProposals();
	const openPackage = proposals.find(
		(proposal) => proposal.is_package && proposal.status === "pending",
	);
	const votes = useVotes(openPackage?.id);
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState<string | null>(null);

	if (!openPackage) return null;

	const totalMembers =
		(store.teamMemberCounts[openPackage.proposing_team_id] ?? 0) +
		(store.teamMemberCounts[openPackage.receiving_team_id] ?? 0);
	const approvals = votes.filter((vote) => vote.vote === "approve").length;
	const rejections = votes.filter((vote) => vote.vote === "reject").length;
	const notVoted = Math.max(totalMembers - votes.length, 0);

	function handleForceAccept() {
		if (!openPackage) return;
		const warning =
			rejections > 0
				? "A student rejected this deal, so it will fail. Approve for the students who have not voted anyway?"
				: `Approve this deal for the ${notVoted} student(s) who have not voted? If all votes are then approvals, the deal is final.`;
		if (!window.confirm(warning)) return;

		setMessage(null);
		startTransition(async () => {
			const result = await forceAcceptVotes(classId, openPackage.id);
			if ("error" in result) {
				setMessage(result.error ?? "Could not approve the open votes.");
			} else if (result.result === "rejected") {
				setMessage("The deal failed because a student rejected it.");
			}
		});
	}

	return (
		<SectionCard
			title="Final Vote Open"
			icon={<VoteIcon className="h-5 w-5 text-primary" />}
		>
			<div className="space-y-3 text-sm">
				<p>
					<span className="font-semibold">{votes.length}</span> of{" "}
					<span className="font-semibold">{totalMembers}</span> students voted:{" "}
					{approvals} approve, {rejections} reject.
				</p>
				{notVoted > 0 && (
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={handleForceAccept}
						>
							{isPending
								? "Approving..."
								: `Approve for ${notVoted} who have not voted`}
						</Button>
						<span className="text-muted-foreground">
							Use this when a student left. A reject still fails the deal.
						</span>
					</div>
				)}
				{message && (
					<p role="alert" className="text-destructive">
						{message}
					</p>
				)}
			</div>
		</SectionCard>
	);
}
