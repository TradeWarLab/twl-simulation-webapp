"use client";

import { useEffect, useState } from "react";
import type { TradeItem } from "@/app/actions/trade";
import { TradeConfirmation } from "@/components/negotiation/trade-confirmation";
import { TradeProposalBuilder } from "@/components/negotiation/trade-proposal-builder";
import { VotingPanel } from "@/components/negotiation/voting-panel";
import type { TradeProposal } from "@/lib/types/domain";

type NegotiationControllerProps = {
	classId: string;
	currentUserId: string;
	myTeamId: string;
	opponentTeamId: string;
	myTeamCountry: string;
	opponentTeamCountry: string;
	myTeamItems: TradeItem[];
	opponentTeamItems: TradeItem[];
	initialProposals: TradeProposal[];
};

/**
 * Orchestrates the full negotiation flow:
 *   proposal builder → voting panel → trade confirmation
 */
export function NegotiationController({
	classId,
	currentUserId,
	myTeamId,
	opponentTeamId,
	myTeamCountry,
	opponentTeamCountry,
	myTeamItems,
	opponentTeamItems,
	initialProposals,
}: NegotiationControllerProps) {
	const [proposals, setProposals] = useState<TradeProposal[]>(initialProposals);
	const [selectedProposal, setSelectedProposal] =
		useState<TradeProposal | null>(null);
	const [executedProposal, setExecutedProposal] =
		useState<TradeProposal | null>(null);

	// Sync proposals from realtime
	useEffect(() => {
		setProposals(initialProposals);

		// Check if the currently selected proposal got resolved
		if (selectedProposal) {
			const updated = initialProposals.find(
				(p) => p.id === selectedProposal.id,
			);
			if (updated) {
				setSelectedProposal(updated);
				if (updated.status === "executed") {
					setExecutedProposal(updated);
					setSelectedProposal(null);
				}
			}
		}
	}, [initialProposals, selectedProposal?.id, selectedProposal]);

	const handleProposalSelect = (proposal: TradeProposal) => {
		setSelectedProposal(proposal);
	};

	const handleCloseVoting = () => {
		setSelectedProposal(null);
	};

	const handleDismissConfirmation = () => {
		setExecutedProposal(null);
	};

	return (
		<div className="flex flex-col h-full">
			{/* Trade Confirmation Modal */}
			{executedProposal && (
				<TradeConfirmation
					proposal={executedProposal}
					onDismiss={handleDismissConfirmation}
				/>
			)}

			{/* Main Content: Either voting detail or proposal builder */}
			{selectedProposal ? (
				<VotingPanel
					proposal={selectedProposal}
					currentUserId={currentUserId}
					myTeamId={myTeamId}
					onClose={handleCloseVoting}
				/>
			) : (
				<TradeProposalBuilder
					classId={classId}
					myTeamId={myTeamId}
					opponentTeamId={opponentTeamId}
					myTeamItems={myTeamItems}
					opponentTeamItems={opponentTeamItems}
					myTeamCountry={myTeamCountry}
					opponentTeamCountry={opponentTeamCountry}
					proposals={proposals}
					onProposalSelect={handleProposalSelect}
				/>
			)}
		</div>
	);
}
