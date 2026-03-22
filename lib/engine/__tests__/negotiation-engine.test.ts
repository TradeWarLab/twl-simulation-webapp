// ──────────────────────────────────────────────
// Negotiation Engine — Unit Tests
// ──────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  createTradeProposal,
  submitVote,
  resolveVotes,
  validateTrade,
  executeTrade,
  calculateTeamScore,
  determineWinner,
} from "@/lib/engine/negotiation-engine";
import type { GameState, NegotiationItem, NegotiationTeam } from "@/lib/types/negotiation";

// ──────────────────────────────────────────────
// Test Fixtures
// ──────────────────────────────────────────────

function makeTeams(): NegotiationTeam[] {
  return [
    {
      id: "team-usa",
      classId: "class-1",
      country: "USA",
      memberIds: ["alice", "bob"],
    },
    {
      id: "team-china",
      classId: "class-1",
      country: "China",
      memberIds: ["charlie", "diana"],
    },
  ];
}

function makeItems(): NegotiationItem[] {
  return [
    // USA items (total = 100)
    { id: "us-1", classId: "class-1", teamId: "team-usa", name: "Remove warships near Taiwan", value: 10, traded: false },
    { id: "us-2", classId: "class-1", teamId: "team-usa", name: "Reduce tariffs on Chinese goods", value: 15, traded: false },
    { id: "us-3", classId: "class-1", teamId: "team-usa", name: "Share green energy tech", value: 20, traded: false },
    { id: "us-4", classId: "class-1", teamId: "team-usa", name: "Allow Huawei operations", value: 25, traded: false },
    { id: "us-5", classId: "class-1", teamId: "team-usa", name: "Recognize South China Sea claims", value: 30, traded: false },
    // China items (total = 100)
    { id: "cn-1", classId: "class-1", teamId: "team-china", name: "Respect IP rights", value: 12, traded: false },
    { id: "cn-2", classId: "class-1", teamId: "team-china", name: "Open market to US firms", value: 18, traded: false },
    { id: "cn-3", classId: "class-1", teamId: "team-china", name: "Reduce military buildup", value: 22, traded: false },
    { id: "cn-4", classId: "class-1", teamId: "team-china", name: "Currency transparency", value: 20, traded: false },
    { id: "cn-5", classId: "class-1", teamId: "team-china", name: "Cease cyber operations", value: 28, traded: false },
  ];
}

function makeGameState(): GameState {
  return {
    classId: "class-1",
    teams: makeTeams(),
    items: makeItems(),
    proposals: [],
    votes: [],
  };
}

// ──────────────────────────────────────────────
// createTradeProposal
// ──────────────────────────────────────────────

describe("createTradeProposal", () => {
  it("should create a valid trade proposal", () => {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.proposal.status).toBe("pending");
    expect(result.data.proposal.proposedByTeamId).toBe("team-usa");
    expect(result.data.proposal.offeredItems).toHaveLength(1);
    expect(result.data.proposal.requestedItems).toHaveLength(1);
    expect(result.data.updatedState.proposals).toHaveLength(1);
  });

  it("should reject empty proposals (no items at all)", () => {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", [], []);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EMPTY_PROPOSAL");
  });

  it("should reject proposals with only one side", () => {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", ["us-1"], []);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EMPTY_PROPOSAL");
  });

  it("should reject duplicate items in a trade", () => {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", ["us-1", "us-1"], ["cn-1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("DUPLICATE_ITEMS");
  });

  it("should reject items from the wrong team (offered)", () => {
    const state = makeGameState();
    // Offering a China item as if it belongs to USA
    const result = createTradeProposal(state, "team-usa", ["cn-1"], ["cn-2"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_WRONG_TEAM");
  });

  it("should reject items from the wrong team (requested)", () => {
    const state = makeGameState();
    // Requesting a USA item from China
    const result = createTradeProposal(state, "team-usa", ["us-1"], ["us-2"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_WRONG_TEAM");
  });

  it("should reject already-traded items", () => {
    const state = makeGameState();
    state.items[0].traded = true; // us-1 already traded

    const result = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_ALREADY_TRADED");
  });

  it("should reject non-existent items", () => {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", ["nonexistent"], ["cn-1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_NOT_FOUND");
  });

  it("should support multi-item proposals", () => {
    const state = makeGameState();
    const result = createTradeProposal(
      state,
      "team-usa",
      ["us-1", "us-2"],
      ["cn-1", "cn-2"]
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.proposal.offeredItems).toHaveLength(2);
    expect(result.data.proposal.requestedItems).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────
// submitVote
// ──────────────────────────────────────────────

describe("submitVote", () => {
  function stateWithProposal(): GameState {
    const state = makeGameState();
    const result = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!result.success) throw new Error("Setup failed");
    return result.data.updatedState;
  }

  it("should record a valid vote", () => {
    const state = stateWithProposal();
    const proposalId = state.proposals[0].id;

    const result = submitVote(state, proposalId, "alice", "team-usa", "approve");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.vote.decision).toBe("approve");
    expect(result.data.updatedState.votes).toHaveLength(1);
  });

  it("should reject double voting", () => {
    let state = stateWithProposal();
    const proposalId = state.proposals[0].id;

    const first = submitVote(state, proposalId, "alice", "team-usa", "approve");
    expect(first.success).toBe(true);
    if (!first.success) return;

    state = first.data.updatedState;
    const second = submitVote(state, proposalId, "alice", "team-usa", "reject");

    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.error.code).toBe("ALREADY_VOTED");
  });

  it("should reject voter not in team", () => {
    const state = stateWithProposal();
    const proposalId = state.proposals[0].id;

    // "charlie" is in team-china, trying to vote as team-usa
    const result = submitVote(state, proposalId, "charlie", "team-usa", "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("VOTER_NOT_IN_TEAM");
  });

  it("should reject votes on non-pending proposals", () => {
    const state = stateWithProposal();
    state.proposals[0].status = "rejected";
    const proposalId = state.proposals[0].id;

    const result = submitVote(state, proposalId, "alice", "team-usa", "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_PENDING");
  });

  it("should reject votes for non-existent proposals", () => {
    const state = stateWithProposal();
    const result = submitVote(state, "non-existent-id", "alice", "team-usa", "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });
});

// ──────────────────────────────────────────────
// resolveVotes
// ──────────────────────────────────────────────

describe("resolveVotes", () => {
  function voteAll(
    state: GameState,
    proposalId: string,
    votes: { voterId: string; teamId: string; decision: "approve" | "reject" }[]
  ): GameState {
    let current = state;
    for (const v of votes) {
      const result = submitVote(current, proposalId, v.voterId, v.teamId, v.decision);
      if (!result.success) throw new Error(`Vote failed: ${result.error.message}`);
      current = result.data.updatedState;
    }
    return current;
  }

  it("should report approved when all voters approve", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    state = voteAll(state, proposalId, [
      { voterId: "alice", teamId: "team-usa", decision: "approve" },
      { voterId: "bob", teamId: "team-usa", decision: "approve" },
      { voterId: "charlie", teamId: "team-china", decision: "approve" },
      { voterId: "diana", teamId: "team-china", decision: "approve" },
    ]);

    const result = resolveVotes(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("approved");
  });

  it("should report rejected when one team rejects", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    state = voteAll(state, proposalId, [
      { voterId: "alice", teamId: "team-usa", decision: "approve" },
      { voterId: "bob", teamId: "team-usa", decision: "approve" },
      { voterId: "charlie", teamId: "team-china", decision: "reject" },
      { voterId: "diana", teamId: "team-china", decision: "reject" },
    ]);

    const result = resolveVotes(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("rejected");
  });

  it("should treat voting ties as rejection", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // Tied vote within team-usa: 1 approve, 1 reject
    state = voteAll(state, proposalId, [
      { voterId: "alice", teamId: "team-usa", decision: "approve" },
      { voterId: "bob", teamId: "team-usa", decision: "reject" },
      { voterId: "charlie", teamId: "team-china", decision: "approve" },
      { voterId: "diana", teamId: "team-china", decision: "approve" },
    ]);

    const result = resolveVotes(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;

    // USA tally should be "rejected" due to tie
    const usaTally = result.data.tallies.find((t) => t.teamId === "team-usa");
    expect(usaTally?.outcome).toBe("rejected");

    // Overall should be "rejected"
    expect(result.data.overallOutcome).toBe("rejected");
  });

  it("should report pending when not all voters have voted", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // Only one person voted
    state = voteAll(state, proposalId, [
      { voterId: "alice", teamId: "team-usa", decision: "approve" },
    ]);

    const result = resolveVotes(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("pending");
  });
});

// ──────────────────────────────────────────────
// validateTrade
// ──────────────────────────────────────────────

describe("validateTrade", () => {
  it("should validate a clean pending proposal", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(true);
  });

  it("should reject if items have been traded away since proposal", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;

    // Simulate item being traded away externally
    state.items = state.items.map((i) =>
      i.id === "us-1" ? { ...i, traded: true } : i
    );

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_ALREADY_TRADED");
  });

  it("should reject non-pending proposals", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    state.proposals[0].status = "executed";

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_PENDING");
  });
});

// ──────────────────────────────────────────────
// executeTrade
// ──────────────────────────────────────────────

describe("executeTrade", () => {
  function setupApprovedTrade(): { state: GameState; proposalId: string } {
    let state = makeGameState();

    // Create proposal
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Proposal creation failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // All vote approve
    const voters = [
      { voterId: "alice", teamId: "team-usa", decision: "approve" as const },
      { voterId: "bob", teamId: "team-usa", decision: "approve" as const },
      { voterId: "charlie", teamId: "team-china", decision: "approve" as const },
      { voterId: "diana", teamId: "team-china", decision: "approve" as const },
    ];
    for (const v of voters) {
      const voteResult = submitVote(state, proposalId, v.voterId, v.teamId, v.decision);
      if (!voteResult.success) throw new Error("Vote failed");
      state = voteResult.data.updatedState;
    }

    return { state, proposalId };
  }

  it("should execute an approved trade and mark items as traded", () => {
    const { state, proposalId } = setupApprovedTrade();
    const result = executeTrade(state, proposalId);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const updated = result.data.updatedState;

    // Items should be marked as traded
    const us1 = updated.items.find((i) => i.id === "us-1");
    const cn1 = updated.items.find((i) => i.id === "cn-1");
    expect(us1?.traded).toBe(true);
    expect(cn1?.traded).toBe(true);

    // Proposal should be marked as executed
    const proposal = updated.proposals.find((p) => p.id === proposalId);
    expect(proposal?.status).toBe("executed");
  });

  it("should cancel conflicting pending proposals", () => {
    let state = makeGameState();

    // Create two proposals referencing the same item (us-1)
    const prop1 = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!prop1.success) throw new Error("Prop1 failed");
    state = prop1.data.updatedState;

    const prop2 = createTradeProposal(state, "team-usa", ["us-1", "us-2"], ["cn-2"]);
    if (!prop2.success) throw new Error("Prop2 failed");
    state = prop2.data.updatedState;

    const proposalId1 = state.proposals[0].id;

    // Approve proposal 1
    const voters = [
      { voterId: "alice", teamId: "team-usa", decision: "approve" as const },
      { voterId: "bob", teamId: "team-usa", decision: "approve" as const },
      { voterId: "charlie", teamId: "team-china", decision: "approve" as const },
      { voterId: "diana", teamId: "team-china", decision: "approve" as const },
    ];
    for (const v of voters) {
      const voteResult = submitVote(state, proposalId1, v.voterId, v.teamId, v.decision);
      if (!voteResult.success) throw new Error("Vote failed");
      state = voteResult.data.updatedState;
    }

    const result = executeTrade(state, proposalId1);
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Proposal 2 should be cancelled because it references us-1
    const prop2After = result.data.updatedState.proposals.find(
      (p) => p.id === state.proposals[1].id
    );
    expect(prop2After?.status).toBe("cancelled");
  });

  it("should reject execution if not all votes are in", () => {
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // Only one vote
    const voteResult = submitVote(state, proposalId, "alice", "team-usa", "approve");
    if (!voteResult.success) throw new Error("Vote failed");
    state = voteResult.data.updatedState;

    const result = executeTrade(state, proposalId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("TRADE_NOT_APPROVED");
  });
});

// ──────────────────────────────────────────────
// calculateTeamScore
// ──────────────────────────────────────────────

describe("calculateTeamScore", () => {
  it("should return zero net score with no trades", () => {
    const state = makeGameState();
    const score = calculateTeamScore(state, "team-usa");

    expect(score.startingPoints).toBe(100);
    expect(score.pointsGained).toBe(0);
    expect(score.pointsConceded).toBe(0);
    expect(score.netScore).toBe(0);
  });

  it("should calculate correct scores after an executed trade", () => {
    // Setup: USA offers "Remove warships" (10pts) for China's "Respect IP" (12pts)
    let state = makeGameState();
    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // All approve
    const voters = [
      { voterId: "alice", teamId: "team-usa", decision: "approve" as const },
      { voterId: "bob", teamId: "team-usa", decision: "approve" as const },
      { voterId: "charlie", teamId: "team-china", decision: "approve" as const },
      { voterId: "diana", teamId: "team-china", decision: "approve" as const },
    ];
    for (const v of voters) {
      const voteResult = submitVote(state, proposalId, v.voterId, v.teamId, v.decision);
      if (!voteResult.success) throw new Error("Vote failed");
      state = voteResult.data.updatedState;
    }

    const execResult = executeTrade(state, proposalId);
    if (!execResult.success) throw new Error("Execute trade failed");
    state = execResult.data.updatedState;

    // USA gave up 10 points, gained 12 points → net +2
    const usaScore = calculateTeamScore(state, "team-usa");
    expect(usaScore.pointsConceded).toBe(10);
    expect(usaScore.pointsGained).toBe(12);
    expect(usaScore.netScore).toBe(2);

    // China gave up 12 points, gained 10 points → net -2
    const chinaScore = calculateTeamScore(state, "team-china");
    expect(chinaScore.pointsConceded).toBe(12);
    expect(chinaScore.pointsGained).toBe(10);
    expect(chinaScore.netScore).toBe(-2);
  });
});

// ──────────────────────────────────────────────
// determineWinner
// ──────────────────────────────────────────────

describe("determineWinner", () => {
  it("should return a draw when no trades have occurred", () => {
    const state = makeGameState();
    const result = determineWinner(state);

    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBeNull();
  });

  it("should declare the team with the higher net score the winner", () => {
    // USA trades a low-value item for a high-value one → USA wins
    let state = makeGameState();

    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    const voters = [
      { voterId: "alice", teamId: "team-usa", decision: "approve" as const },
      { voterId: "bob", teamId: "team-usa", decision: "approve" as const },
      { voterId: "charlie", teamId: "team-china", decision: "approve" as const },
      { voterId: "diana", teamId: "team-china", decision: "approve" as const },
    ];
    for (const v of voters) {
      const voteResult = submitVote(state, proposalId, v.voterId, v.teamId, v.decision);
      if (!voteResult.success) throw new Error("Vote failed");
      state = voteResult.data.updatedState;
    }

    const execResult = executeTrade(state, proposalId);
    if (!execResult.success) throw new Error("Execute trade failed");
    state = execResult.data.updatedState;

    const result = determineWinner(state);

    // USA: +12 - 10 = +2
    // China: +10 - 12 = -2
    expect(result.isDraw).toBe(false);
    expect(result.winnerId).toBe("team-usa");
  });

  it("should return a draw when net scores are equal", () => {
    // Set up items where both teams gain and lose equally
    const state = makeGameState();

    // Manually set us-1 and cn-1 to same value for a balanced trade
    state.items[0].value = 15; // us-1
    state.items[5].value = 15; // cn-1

    const propResult = createTradeProposal(state, "team-usa", ["us-1"], ["cn-1"]);
    if (!propResult.success) throw new Error("Setup failed");
    const stateWithProp = propResult.data.updatedState;
    const proposalId = stateWithProp.proposals[0].id;

    let current = stateWithProp;
    const voters = [
      { voterId: "alice", teamId: "team-usa", decision: "approve" as const },
      { voterId: "bob", teamId: "team-usa", decision: "approve" as const },
      { voterId: "charlie", teamId: "team-china", decision: "approve" as const },
      { voterId: "diana", teamId: "team-china", decision: "approve" as const },
    ];
    for (const v of voters) {
      const voteResult = submitVote(current, proposalId, v.voterId, v.teamId, v.decision);
      if (!voteResult.success) throw new Error("Vote failed");
      current = voteResult.data.updatedState;
    }

    const execResult = executeTrade(current, proposalId);
    if (!execResult.success) throw new Error("Execute trade failed");
    current = execResult.data.updatedState;

    const result = determineWinner(current);
    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBeNull();
  });
});
