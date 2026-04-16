"use client";

import { useState } from "react";
import type { TradeItem } from "@/app/actions/trade";
import { TradeOfferDndBuilder } from "@/components/negotiation/trade-offer-dnd-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeProposal } from "@/lib/types/domain";

type ProposalBuilderProps = {
	classId: string;
	myTeamId: string;
	opponentTeamId: string;
	myTeamItems: TradeItem[];
	opponentTeamItems: TradeItem[];
	myTeamCountry: string;
	opponentTeamCountry: string;
	proposals: TradeProposal[];
	onProposalSelect: (proposal: TradeProposal) => void;
};

export function TradeProposalBuilder({
	classId,
	myTeamId,
	opponentTeamId,
	myTeamItems,
	opponentTeamItems,
	myTeamCountry,
	opponentTeamCountry,
	proposals,
	onProposalSelect,
}: ProposalBuilderProps) {
	const [showBuilder, setShowBuilder] = useState(false);

	const statusColors: Record<string, string> = {
		pending:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		approved:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
		rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		executed:
			"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	};

	return (
		<div className="flex flex-col h-full gap-3">
			{/* Toggle Builder */}
			{!showBuilder && (
				<Button
					onClick={() => setShowBuilder(true)}
					className="w-full bg-indigo-500 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md"
				>
					+ New Trade Proposal
				</Button>
			)}

			{/* Builder Panel */}
			{showBuilder && (
				<div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
					<div className="flex justify-between items-center">
						<h4 className="font-semibold text-sm">Create Trade Proposal</h4>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowBuilder(false)}
							className="h-7 text-xs"
						>
							Cancel
						</Button>
					</div>

					<TradeOfferDndBuilder
						classId={classId}
						myTeamId={myTeamId}
						opponentTeamId={opponentTeamId}
						myTeamItems={myTeamItems}
						opponentTeamItems={opponentTeamItems}
						myTeamCountry={myTeamCountry}
						opponentTeamCountry={opponentTeamCountry}
						onSubmitted={() => setShowBuilder(false)}
					/>
				</div>
			)}

			{/* Proposals List */}
			<div className="flex-1 min-h-0">
				<p className="text-xs font-medium text-muted-foreground mb-2">
					Trade Proposals ({proposals.length})
				</p>
				<ScrollArea className="h-full">
					<div className="space-y-2 pr-2">
						{proposals.length === 0 ? (
							<p className="text-xs text-muted-foreground text-center py-8 italic">
								No proposals yet. Create one to start negotiating!
							</p>
						) : (
							proposals.map((proposal) => (
								<button
									key={proposal.id}
									onClick={() => onProposalSelect(proposal)}
									className="w-full text-left p-3 rounded-lg border bg-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm"
								>
									<div className="flex justify-between items-start mb-1.5">
										<span className="text-xs font-semibold">
											{proposal.proposing_team?.country} →{" "}
											{proposal.receiving_team?.country}
										</span>
										<Badge
											variant="secondary"
											className={`text-[10px] ${statusColors[proposal.status] ?? ""}`}
										>
											{proposal.status}
										</Badge>
									</div>
									<div className="text-[11px] text-muted-foreground">
										<span>
											Offers {(proposal.offered_items ?? []).length} issue
											{(proposal.offered_items ?? []).length !== 1 ? "s" : ""}
										</span>
										<span className="mx-1">·</span>
										<span>
											Requests {(proposal.requested_items ?? []).length} issue
											{(proposal.requested_items ?? []).length !== 1 ? "s" : ""}
										</span>
									</div>
									{proposal.vote_summary && proposal.status === "pending" && (
										<div className="mt-1.5 flex items-center gap-1.5">
											<div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
													style={{
														width: `${proposal.vote_summary.total_members > 0 ? (proposal.vote_summary.votes_cast / proposal.vote_summary.total_members) * 100 : 0}%`,
													}}
												/>
											</div>
											<span className="text-[10px] text-muted-foreground whitespace-nowrap">
												{proposal.vote_summary.votes_cast}/
												{proposal.vote_summary.total_members} voted
											</span>
										</div>
									)}
								</button>
							))
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
