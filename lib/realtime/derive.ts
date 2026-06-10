import type {
	TeamCountry,
	TradeItem,
	TradeProposal,
	TradeProposalItem,
	Vote,
} from "@/lib/types/domain";

/**
 * Mirrors the lookup built server-side in getTradeProposals: viewer item
 * values keyed by issue_id and by name.
 */
export function buildViewerValueMap(
	viewerItems: TradeItem[],
): Map<string, number> {
	const map = new Map<string, number>();
	for (const item of viewerItems) {
		if (item.issue_id) map.set(item.issue_id, Number(item.value));
		map.set(item.name, Number(item.value));
	}
	return map;
}

export type EnrichOptions = {
	/** Omit for viewers without a team (instructor) — item values pass through. */
	viewerValueMap?: Map<string, number>;
	votes: Vote[];
	totalMembers: number;
	teamById: Map<string, { id: string; country: TeamCountry }>;
	userNames: ReadonlyMap<string, string | null>;
};

export function enrichProposal(
	proposal: TradeProposal,
	options: EnrichOptions,
): TradeProposal {
	const { viewerValueMap, votes, totalMembers, teamById, userNames } = options;

	const mapItems = (items: TradeProposalItem[]): TradeProposalItem[] => {
		const list = items ?? [];
		if (!viewerValueMap) return list;
		return list.map((item) => ({
			...item,
			value:
				viewerValueMap.get(item.item_id) ?? viewerValueMap.get(item.name) ?? 0,
		}));
	};

	const proposalVotes = votes.filter((v) => v.proposal_id === proposal.id);

	return {
		...proposal,
		offered_items: mapItems(proposal.offered_items),
		requested_items: mapItems(proposal.requested_items),
		proposing_team: {
			id: proposal.proposing_team_id,
			country: teamById.get(proposal.proposing_team_id)?.country ?? "USA",
		},
		receiving_team: {
			country: teamById.get(proposal.receiving_team_id)?.country ?? "China",
		},
		creator: {
			full_name:
				proposal.creator?.full_name ??
				userNames.get(proposal.created_by) ??
				null,
		},
		vote_summary: {
			total_members: totalMembers,
			votes_cast: proposalVotes.length,
			approvals: proposalVotes.filter((v) => v.vote === "approve").length,
			rejections: proposalVotes.filter((v) => v.vote === "reject").length,
		},
	};
}
