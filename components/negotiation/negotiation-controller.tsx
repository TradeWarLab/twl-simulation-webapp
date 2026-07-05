"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SharedDealBoard } from "@/components/negotiation/shared-deal-board";
import { TradeConfirmation } from "@/components/negotiation/trade-confirmation";
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
 * Phase-2 orchestration: shared deal board → package ratification vote →
 * confirmation (or blank-slate reset). Live data comes from the realtime store.
 */
export function NegotiationController({
	classId,
	currentUserId,
	myTeamId,
	opponentTeamId: _opponentTeamId,
	myTeamCountry,
	opponentTeamCountry,
}: NegotiationControllerProps) {
	const store = useClassStore();
	const rawProposals = useProposals();
	const votes = useVotes();
	const userNames = useUserNames();
	const teamItems = useTradeItems(myTeamId);

	// Only ratification packages drive this flow; legacy proposals are ignored.
	const latestPackage = useMemo(() => {
		const packages = rawProposals.filter((proposal) => proposal.is_package);
		if (packages.length === 0) return null;
		const raw = packages[packages.length - 1]; // store is oldest-first
		const teamById = new Map(store.teams.map((team) => [team.id, team]));
		return enrichProposal(raw, {
			viewerValueMap: buildViewerValueMap(teamItems),
			votes,
			totalMembers:
				(store.teamMemberCounts[raw.proposing_team_id] ?? 0) +
				(store.teamMemberCounts[raw.receiving_team_id] ?? 0),
			teamById,
			userNames,
		});
	}, [rawProposals, votes, teamItems, store, userNames]);

	const pendingPackage =
		latestPackage?.status === "pending" ? latestPackage : null;

	const [hiddenVoteId, setHiddenVoteId] = useState<string | null>(null);
	const [executedPackage, setExecutedPackage] = useState<TradeProposal | null>(
		null,
	);
	const [dismissedResetId, setDismissedResetId] = useState<string | null>(null);

	// Surface the confirmation when the open package resolves to executed.
	const prevStatusRef = useRef<Record<string, string>>({});
	useEffect(() => {
		if (!latestPackage) return;
		const prev = prevStatusRef.current[latestPackage.id];
		prevStatusRef.current[latestPackage.id] = latestPackage.status;
		if (prev === "pending" && latestPackage.status === "executed") {
			setExecutedPackage(latestPackage);
		}
	}, [latestPackage]);

	const resetBannerVisible =
		latestPackage?.status === "rejected" &&
		dismissedResetId !== latestPackage.id;

	return (
		<div className="flex flex-col h-full">
			{executedPackage && (
				<TradeConfirmation
					proposal={executedPackage}
					onDismiss={() => setExecutedPackage(null)}
				/>
			)}

			{pendingPackage && hiddenVoteId !== pendingPackage.id ? (
				<VotingPanel
					proposal={pendingPackage}
					currentUserId={currentUserId}
					myTeamId={myTeamId}
					onClose={() => setHiddenVoteId(pendingPackage.id)}
				/>
			) : (
				<SharedDealBoard
					classId={classId}
					myTeamId={myTeamId}
					myTeamCountry={myTeamCountry}
					opponentTeamCountry={opponentTeamCountry}
					frozen={pendingPackage !== null}
					onOpenVote={() => setHiddenVoteId(null)}
					resetBannerVisible={resetBannerVisible}
					onDismissResetBanner={() =>
						setDismissedResetId(latestPackage?.id ?? null)
					}
				/>
			)}
		</div>
	);
}
