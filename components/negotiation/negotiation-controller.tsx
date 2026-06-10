"use client";

import { useEffect, useMemo, useState } from "react";
import { TradeConfirmation } from "@/components/negotiation/trade-confirmation";
import { TradeProposalBuilder } from "@/components/negotiation/trade-proposal-builder";
import { VotingPanel } from "@/components/negotiation/voting-panel";
import { buildViewerValueMap, enrichProposal } from "@/lib/realtime/derive";
import {
	useClassStore,
	useProposals,
	useTradeItems,
	useUserNames,
	useVotes,
} from "@/lib/realtime/hooks";
import type { TradeProposal } from "@/lib/types/domain";

type NegotiationControllerProps = {
	classId: string;
	currentUserId: string;
	myTeamId: string;
	opponentTeamId: string;
	myTeamCountry: string;
	opponentTeamCountry: string;
};

/**
 * Orchestrates the full negotiation flow:
 *   proposal builder → voting panel → trade confirmation
 * All live data (proposals, votes, items) comes from the realtime store.
 */
export function NegotiationController({
	classId,
	currentUserId,
	myTeamId,
	opponentTeamId,
	myTeamCountry,
	opponentTeamCountry,
}: NegotiationControllerProps) {
	const store = useClassStore();
	const rawProposals = useProposals();
	const votes = useVotes();
	const userNames = useUserNames();
	const teamItems = useTradeItems(myTeamId);

	const myTeamItems = useMemo(
		() => teamItems.filter((item) => item.role === "concession"),
		[teamItems],
	);
	const opponentTeamItems = useMemo(
		() => teamItems.filter((item) => item.role === "ask"),
		[teamItems],
	);

	const proposals = useMemo(() => {
		const viewerValueMap = buildViewerValueMap(teamItems);
		const teamById = new Map(store.teams.map((team) => [team.id, team]));
		return rawProposals
			.map((proposal) =>
				enrichProposal(proposal, {
					viewerValueMap,
					votes,
					totalMembers:
						(store.teamMemberCounts[proposal.proposing_team_id] ?? 0) +
						(store.teamMemberCounts[proposal.receiving_team_id] ?? 0),
					teamById,
					userNames,
				}),
			)
			.reverse(); // newest first, matching the previous server query order
	}, [rawProposals, votes, teamItems, store, userNames]);

	const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
		null,
	);
	const [executedProposal, setExecutedProposal] =
		useState<TradeProposal | null>(null);

	const selectedProposal =
		proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;

	// Surface the confirmation when the open proposal resolves to executed
	useEffect(() => {
		if (selectedProposal?.status === "executed") {
			setExecutedProposal(selectedProposal);
			setSelectedProposalId(null);
		}
	}, [selectedProposal]);

	return (
		<div className="flex flex-col h-full">
			{/* Trade Confirmation Modal */}
			{executedProposal && (
				<TradeConfirmation
					proposal={executedProposal}
					onDismiss={() => setExecutedProposal(null)}
				/>
			)}

			{/* Main Content: Either voting detail or proposal builder */}
			{selectedProposal ? (
				<VotingPanel
					proposal={selectedProposal}
					currentUserId={currentUserId}
					myTeamId={myTeamId}
					onClose={() => setSelectedProposalId(null)}
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
					onProposalSelect={(proposal) => setSelectedProposalId(proposal.id)}
				/>
			)}
		</div>
	);
}
