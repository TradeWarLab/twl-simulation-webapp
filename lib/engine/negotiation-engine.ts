// ──────────────────────────────────────────────
// Negotiation Game Engine — Pure Logic
// ──────────────────────────────────────────────
//
// Every function here is PURE: no database calls, no side effects.
// They operate on an in-memory GameState and return new state or results.
// This makes them trivially testable and fully decoupled from Supabase.
//

import type {
  EngineError,
  EngineResult,
  GameResult,
  GameState,
  NegotiationItem,
  TeamScore,
  TradeProposal,
  TradeProposalItem,
  Vote,
  VoteDecision,
  VoteTally,
  VoteOutcome,
} from "@/lib/types/negotiation";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function err(code: EngineError["code"], message: string): EngineResult<never> {
  return { success: false, error: { code, message } };
}

function ok<T>(data: T): EngineResult<T> {
  return { success: true, data };
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Return the other team in a two-team game.
 */
function getOpponentTeamId(
  state: GameState,
  teamId: string
): string | undefined {
  return state.teams.find((t) => t.id !== teamId)?.id;
}

// ──────────────────────────────────────────────
// createTradeProposal
// ──────────────────────────────────────────────

/**
 * Create a new trade proposal.
 *
 * @param state   Current game state.
 * @param proposedByTeamId  The team creating the proposal.
 * @param offeredItemIds    Item IDs the proposing team offers.
 * @param requestedItemIds  Item IDs the proposing team wants from the other team.
 *
 * Validates:
 *  - Proposal is not empty
 *  - No duplicate items across both lists
 *  - All items exist and belong to the correct team
 *  - No items that have already been traded away
 *  - The two sets belong to different teams
 */
export function createTradeProposal(
  state: GameState,
  proposedByTeamId: string,
  offeredItemIds: string[],
  requestedItemIds: string[]
): EngineResult<{ proposal: TradeProposal; updatedState: GameState }> {
  // Must offer AND request at least one item
  if (offeredItemIds.length === 0 && requestedItemIds.length === 0) {
    return err("EMPTY_PROPOSAL", "A trade proposal must contain at least one item on each side.");
  }
  if (offeredItemIds.length === 0 || requestedItemIds.length === 0) {
    return err("EMPTY_PROPOSAL", "A trade proposal must contain items from both sides.");
  }

  // Check for duplicates across the combined list
  const allIds = [...offeredItemIds, ...requestedItemIds];
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    return err("DUPLICATE_ITEMS", "A trade proposal cannot contain duplicate items.");
  }

  const opponentTeamId = getOpponentTeamId(state, proposedByTeamId);
  if (!opponentTeamId) {
    return err("ITEM_WRONG_TEAM", "Cannot find opponent team.");
  }

  // Validate offered items (must belong to the proposing team)
  const offeredItems: TradeProposalItem[] = [];
  for (const itemId of offeredItemIds) {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return err("ITEM_NOT_FOUND", `Item '${itemId}' not found.`);
    if (item.traded) return err("ITEM_ALREADY_TRADED", `Item '${item.name}' has already been traded.`);
    if (item.teamId !== proposedByTeamId) {
      return err("ITEM_WRONG_TEAM", `Item '${item.name}' does not belong to the proposing team.`);
    }
    offeredItems.push({ itemId, fromTeamId: proposedByTeamId });
  }

  // Validate requested items (must belong to the opponent team)
  const requestedItems: TradeProposalItem[] = [];
  for (const itemId of requestedItemIds) {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return err("ITEM_NOT_FOUND", `Item '${itemId}' not found.`);
    if (item.traded) return err("ITEM_ALREADY_TRADED", `Item '${item.name}' has already been traded.`);
    if (item.teamId !== opponentTeamId) {
      return err("ITEM_WRONG_TEAM", `Item '${item.name}' does not belong to the opponent team.`);
    }
    requestedItems.push({ itemId, fromTeamId: opponentTeamId });
  }

  // Prevent same-team trades
  if (proposedByTeamId === opponentTeamId) {
    return err("SAME_TEAM_TRADE", "Cannot trade items within the same team.");
  }

  const proposal: TradeProposal = {
    id: generateId(),
    classId: state.classId,
    proposedByTeamId,
    offeredItems,
    requestedItems,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const updatedState: GameState = {
    ...state,
    proposals: [...state.proposals, proposal],
  };

  return ok({ proposal, updatedState });
}

// ──────────────────────────────────────────────
// submitVote
// ──────────────────────────────────────────────

/**
 * Record an individual team member's vote on a proposal.
 *
 * Validates:
 *  - Proposal exists and is pending
 *  - Voter belongs to one of the two teams involved
 *  - Voter hasn't already voted on this proposal
 */
export function submitVote(
  state: GameState,
  proposalId: string,
  voterId: string,
  teamId: string,
  decision: VoteDecision
): EngineResult<{ vote: Vote; updatedState: GameState }> {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return err("PROPOSAL_NOT_FOUND", `Proposal '${proposalId}' not found.`);
  }
  if (proposal.status !== "pending") {
    return err("PROPOSAL_NOT_PENDING", `Proposal is '${proposal.status}', not pending.`);
  }

  // Verify voter is a member of the specified team
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) {
    return err("WRONG_TEAM", `Team '${teamId}' not found.`);
  }
  if (!team.memberIds.includes(voterId)) {
    return err("VOTER_NOT_IN_TEAM", `Voter '${voterId}' is not a member of team '${teamId}'.`);
  }

  // Verify the team is actually involved in this proposal
  const proposingTeamId = proposal.proposedByTeamId;
  const receivingTeamId = getOpponentTeamId(state, proposingTeamId);
  if (teamId !== proposingTeamId && teamId !== receivingTeamId) {
    return err("WRONG_TEAM", "Voter's team is not involved in this proposal.");
  }

  // Check for double voting
  const existingVote = state.votes.find(
    (v) => v.proposalId === proposalId && v.voterId === voterId
  );
  if (existingVote) {
    return err("ALREADY_VOTED", "This voter has already voted on this proposal.");
  }

  const vote: Vote = {
    id: generateId(),
    proposalId,
    voterId,
    teamId,
    decision,
    createdAt: new Date().toISOString(),
  };

  const updatedState: GameState = {
    ...state,
    votes: [...state.votes, vote],
  };

  return ok({ vote, updatedState });
}

// ──────────────────────────────────────────────
// resolveVotes
// ──────────────────────────────────────────────

/**
 * Tally votes for a specific proposal, per team.
 *
 * Rules:
 *  - Each team votes independently.
 *  - Strict majority required to approve (approves > rejects).
 *  - Ties → rejected.
 *  - If not all members have voted → pending.
 */
export function resolveVotes(
  state: GameState,
  proposalId: string
): EngineResult<{ tallies: VoteTally[]; overallOutcome: VoteOutcome }> {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return err("PROPOSAL_NOT_FOUND", `Proposal '${proposalId}' not found.`);
  }

  const proposingTeamId = proposal.proposedByTeamId;
  const receivingTeamId = getOpponentTeamId(state, proposingTeamId);

  const relevantTeamIds = [proposingTeamId, receivingTeamId].filter(
    Boolean
  ) as string[];

  const proposalVotes = state.votes.filter((v) => v.proposalId === proposalId);

  const tallies: VoteTally[] = relevantTeamIds.map((tid) => {
    const team = state.teams.find((t) => t.id === tid)!;
    const teamVotes = proposalVotes.filter((v) => v.teamId === tid);
    const approveCount = teamVotes.filter((v) => v.decision === "approve").length;
    const rejectCount = teamVotes.filter((v) => v.decision === "reject").length;
    const totalVoters = team.memberIds.length;

    let outcome: VoteOutcome;
    if (teamVotes.length < totalVoters) {
      outcome = "pending";
    } else if (approveCount > rejectCount) {
      outcome = "approved";
    } else {
      // Tie or more rejects → rejected
      outcome = "rejected";
    }

    return { teamId: tid, approveCount, rejectCount, totalVoters, outcome };
  });

  // Overall: approved only if ALL teams approved
  let overallOutcome: VoteOutcome;
  if (tallies.some((t) => t.outcome === "rejected")) {
    overallOutcome = "rejected";
  } else if (tallies.every((t) => t.outcome === "approved")) {
    overallOutcome = "approved";
  } else {
    overallOutcome = "pending";
  }

  return ok({ tallies, overallOutcome });
}

// ──────────────────────────────────────────────
// validateTrade
// ──────────────────────────────────────────────

/**
 * Validate that a proposal is still executable.
 *
 * Checks:
 *  - Proposal exists and is pending
 *  - All items still exist and have not been traded away
 *  - Items still belong to the correct teams
 */
export function validateTrade(
  state: GameState,
  proposalId: string
): EngineResult<{ valid: true }> {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return err("PROPOSAL_NOT_FOUND", `Proposal '${proposalId}' not found.`);
  }
  if (proposal.status !== "pending") {
    return err("PROPOSAL_NOT_PENDING", `Proposal is '${proposal.status}', not pending.`);
  }

  const allProposalItems = [...proposal.offeredItems, ...proposal.requestedItems];

  for (const pi of allProposalItems) {
    const item = state.items.find((i) => i.id === pi.itemId);
    if (!item) {
      return err("ITEM_NOT_FOUND", `Item '${pi.itemId}' no longer exists.`);
    }
    if (item.traded) {
      return err("ITEM_ALREADY_TRADED", `Item '${item.name}' has already been traded in another deal.`);
    }
    if (item.teamId !== pi.fromTeamId) {
      return err(
        "ITEM_WRONG_TEAM",
        `Item '${item.name}' no longer belongs to team '${pi.fromTeamId}'.`
      );
    }
  }

  return ok({ valid: true });
}

// ──────────────────────────────────────────────
// executeTrade
// ──────────────────────────────────────────────

/**
 * Execute an approved trade.
 *
 * Prerequisites: both teams have approved via resolveVotes and
 * the proposal has been validated.
 *
 * Effects:
 *  - Marks offered items as traded
 *  - Marks requested items as traded
 *  - Updates the proposal status to "executed"
 */
export function executeTrade(
  state: GameState,
  proposalId: string
): EngineResult<{ updatedState: GameState }> {
  // Run validation first
  const validation = validateTrade(state, proposalId);
  if (!validation.success) return validation;

  // Check votes
  const voteResult = resolveVotes(state, proposalId);
  if (!voteResult.success) return voteResult;
  if (voteResult.data.overallOutcome !== "approved") {
    return err(
      "TRADE_NOT_APPROVED",
      `Trade has not been approved by both teams. Current status: ${voteResult.data.overallOutcome}.`
    );
  }

  const proposal = state.proposals.find((p) => p.id === proposalId)!;

  // Collect all traded item IDs
  const tradedItemIds = new Set([
    ...proposal.offeredItems.map((i) => i.itemId),
    ...proposal.requestedItems.map((i) => i.itemId),
  ]);

  // Mark items as traded
  const updatedItems = state.items.map((item) =>
    tradedItemIds.has(item.id) ? { ...item, traded: true } : item
  );

  // Update proposal status
  const updatedProposals = state.proposals.map((p) =>
    p.id === proposalId ? { ...p, status: "executed" as const } : p
  );

  // Cancel any other pending proposals that reference now-traded items
  const finalProposals = updatedProposals.map((p) => {
    if (p.id === proposalId || p.status !== "pending") return p;

    const allItemIds = [
      ...p.offeredItems.map((i) => i.itemId),
      ...p.requestedItems.map((i) => i.itemId),
    ];
    const hasConflict = allItemIds.some((id) => tradedItemIds.has(id));
    return hasConflict ? { ...p, status: "cancelled" as const } : p;
  });

  return ok({
    updatedState: {
      ...state,
      items: updatedItems,
      proposals: finalProposals,
    },
  });
}

// ──────────────────────────────────────────────
// calculateTeamScore
// ──────────────────────────────────────────────

/**
 * Calculate a team's score based on executed trades.
 *
 * score = points gained (items received) − points conceded (items given away)
 *
 * "Items received" = items that the OTHER team offered to this team in executed proposals.
 * "Items given away" = items that THIS team offered in executed proposals.
 */
export function calculateTeamScore(
  state: GameState,
  teamId: string
): TeamScore {
  const teamItems = state.items.filter((i) => i.teamId === teamId);
  const startingPoints = teamItems.reduce((sum, item) => sum + item.value, 0);

  const executedProposals = state.proposals.filter(
    (p) => p.status === "executed"
  );

  let pointsGained = 0;
  let pointsConceded = 0;

  for (const proposal of executedProposals) {
    // Items this team gave away (offered by this team OR requested from this team)
    const givenAway: NegotiationItem[] = [];
    const received: NegotiationItem[] = [];

    // If this team proposed it:
    //   offeredItems → given away by this team
    //   requestedItems → received by this team
    //
    // If the other team proposed it:
    //   offeredItems → received by this team (those belong to the other team)
    //   requestedItems → given away by this team (requested FROM this team)

    if (proposal.proposedByTeamId === teamId) {
      // This team proposed → offered items are what we gave, requested items are what we got
      for (const pi of proposal.offeredItems) {
        const item = state.items.find((i) => i.id === pi.itemId);
        if (item) givenAway.push(item);
      }
      for (const pi of proposal.requestedItems) {
        const item = state.items.find((i) => i.id === pi.itemId);
        if (item) received.push(item);
      }
    } else {
      // Other team proposed → their offered items are what we receive,
      // their requested items (from us) are what we gave
      for (const pi of proposal.offeredItems) {
        const item = state.items.find((i) => i.id === pi.itemId);
        if (item) received.push(item);
      }
      for (const pi of proposal.requestedItems) {
        const item = state.items.find((i) => i.id === pi.itemId);
        if (item) givenAway.push(item);
      }
    }

    // IMPORTANT: points are based on THIS team's valuation.
    // Since items carry the original team's value, we need to use the value
    // as assigned. In this model, each item's `value` is its owning team's valuation.
    //
    // Points conceded = sum of values of items this team owned and gave away
    // Points gained = sum of values of items the other team owned and gave to us
    //                 BUT valued from the RECEIVING team's perspective.
    //
    // For simplicity in this model, we use each item's stored value directly.
    // The instructor sets values per-team, so item.value already represents
    // how much the OWNING team cares about it.

    pointsConceded += givenAway.reduce((s, i) => s + i.value, 0);
    pointsGained += received.reduce((s, i) => s + i.value, 0);
  }

  return {
    teamId,
    startingPoints,
    pointsGained,
    pointsConceded,
    netScore: pointsGained - pointsConceded,
  };
}

// ──────────────────────────────────────────────
// determineWinner
// ──────────────────────────────────────────────

/**
 * Compare the net scores of all teams and determine the winner.
 *
 * Returns:
 *  - winnerId if one team has a strictly higher net score
 *  - isDraw = true if scores are tied
 */
export function determineWinner(state: GameState): GameResult {
  const scores = state.teams.map((team) => calculateTeamScore(state, team.id));

  if (scores.length < 2) {
    return { winnerId: scores[0]?.teamId ?? null, isDraw: false, scores };
  }

  // Sort descending by net score
  const sorted = [...scores].sort((a, b) => b.netScore - a.netScore);

  if (sorted[0].netScore === sorted[1].netScore) {
    return { winnerId: null, isDraw: true, scores };
  }

  return { winnerId: sorted[0].teamId, isDraw: false, scores };
}
