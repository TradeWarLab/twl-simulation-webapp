import { describe, it, expect, beforeEach } from "vitest";
import type { GameState, NegotiationItem, NegotiationTeam } from "@/lib/types/negotiation";
import {
  createTradeProposal,
  submitVote,
  resolveVotes,
  validateTrade,
  executeTrade,
  calculateTeamScore,
  determineWinner,
} from "@/lib/engine/negotiation-engine";

// ─── Test Fixture Factory ────────────────────────────────────

const TEAM_A_ID = "team-a";
const TEAM_B_ID = "team-b";
const CLASS_ID = "class-1";

function makeItem(
  overrides: Partial<NegotiationItem> & { id: string }
): NegotiationItem {
  return {
    classId: CLASS_ID,
    teamId: TEAM_A_ID,
    name: `Item ${overrides.id}`,
    value: 10,
    traded: false,
    ...overrides,
  };
}

function makeTeam(
  overrides: Partial<NegotiationTeam> & { id: string }
): NegotiationTeam {
  return {
    classId: CLASS_ID,
    country: "USA",
    memberIds: [],
    ...overrides,
  };
}

function createTestGameState(): GameState {
  return {
    classId: CLASS_ID,
    teams: [
      makeTeam({
        id: TEAM_A_ID,
        country: "USA",
        memberIds: ["alice", "bob"],
      }),
      makeTeam({
        id: TEAM_B_ID,
        country: "China",
        memberIds: ["charlie", "diana"],
      }),
    ],
    items: [
      makeItem({ id: "a1", teamId: TEAM_A_ID, name: "Steel", value: 20 }),
      makeItem({ id: "a2", teamId: TEAM_A_ID, name: "Oil", value: 30 }),
      makeItem({ id: "a3", teamId: TEAM_A_ID, name: "Wheat", value: 50 }),
      makeItem({ id: "b1", teamId: TEAM_B_ID, name: "Silk", value: 15 }),
      makeItem({ id: "b2", teamId: TEAM_B_ID, name: "Tea", value: 35 }),
      makeItem({ id: "b3", teamId: TEAM_B_ID, name: "Jade", value: 50 }),
    ],
    proposals: [],
    votes: [],
  };
}

// ─── createTradeProposal ────────────────────────────────────

describe("createTradeProposal", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it("creates a valid proposal and appends it to state", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { proposal, updatedState } = result.data;
    expect(proposal.proposedByTeamId).toBe(TEAM_A_ID);
    expect(proposal.status).toBe("pending");
    expect(proposal.offeredItems).toHaveLength(1);
    expect(proposal.offeredItems[0].itemId).toBe("a1");
    expect(proposal.requestedItems).toHaveLength(1);
    expect(proposal.requestedItems[0].itemId).toBe("b1");
    expect(updatedState.proposals).toHaveLength(1);
  });

  it("allows multi-item proposals", () => {
    const result = createTradeProposal(
      state,
      TEAM_A_ID,
      ["a1", "a2"],
      ["b1", "b2"]
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.proposal.offeredItems).toHaveLength(2);
    expect(result.data.proposal.requestedItems).toHaveLength(2);
  });

  it("rejects empty proposals (both sides empty)", () => {
    const result = createTradeProposal(state, TEAM_A_ID, [], []);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EMPTY_PROPOSAL");
  });

  it("rejects proposals with only offered items (no requested)", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], []);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EMPTY_PROPOSAL");
  });

  it("rejects proposals with only requested items (no offered)", () => {
    const result = createTradeProposal(state, TEAM_A_ID, [], ["b1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EMPTY_PROPOSAL");
  });

  it("rejects duplicate items across both sides", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["a1", "a1"], ["b1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("DUPLICATE_ITEMS");
  });

  it("rejects if offered item belongs to opponent team", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["b1"], ["b2"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_WRONG_TEAM");
  });

  it("rejects if requested item belongs to proposing team", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["a2"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_WRONG_TEAM");
  });

  it("rejects if offered item does not exist", () => {
    const result = createTradeProposal(state, TEAM_A_ID, ["nonexistent"], ["b1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_NOT_FOUND");
  });

  it("rejects if an offered item has already been traded", () => {
    state.items = state.items.map((i) =>
      i.id === "a1" ? { ...i, traded: true } : i
    );

    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_ALREADY_TRADED");
  });

  it("rejects if a requested item has already been traded", () => {
    state.items = state.items.map((i) =>
      i.id === "b1" ? { ...i, traded: true } : i
    );

    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_ALREADY_TRADED");
  });

  it("does not mutate the original state", () => {
    const originalProposalCount = state.proposals.length;
    createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    expect(state.proposals).toHaveLength(originalProposalCount);
  });
});

// ─── submitVote ─────────────────────────────────────────────

describe("submitVote", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
    // Create a proposal to vote on
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (result.success) {
      state = result.data.updatedState;
    }
  });

  it("records a valid vote", () => {
    const proposalId = state.proposals[0].id;
    const result = submitVote(state, proposalId, "alice", TEAM_A_ID, "approve");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.vote.decision).toBe("approve");
    expect(result.data.vote.voterId).toBe("alice");
    expect(result.data.updatedState.votes).toHaveLength(1);
  });

  it("allows members from both teams to vote", () => {
    const proposalId = state.proposals[0].id;

    const r1 = submitVote(state, proposalId, "alice", TEAM_A_ID, "approve");
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const r2 = submitVote(
      r1.data.updatedState,
      proposalId,
      "charlie",
      TEAM_B_ID,
      "reject"
    );
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.updatedState.votes).toHaveLength(2);
  });

  it("rejects vote on nonexistent proposal", () => {
    const result = submitVote(state, "nonexistent", "alice", TEAM_A_ID, "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });

  it("rejects vote on non-pending proposal", () => {
    state.proposals = state.proposals.map((p) => ({
      ...p,
      status: "executed" as const,
    }));
    const proposalId = state.proposals[0].id;

    const result = submitVote(state, proposalId, "alice", TEAM_A_ID, "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_PENDING");
  });

  it("rejects double voting by same voter", () => {
    const proposalId = state.proposals[0].id;
    const r1 = submitVote(state, proposalId, "alice", TEAM_A_ID, "approve");
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const r2 = submitVote(
      r1.data.updatedState,
      proposalId,
      "alice",
      TEAM_A_ID,
      "reject"
    );
    expect(r2.success).toBe(false);
    if (r2.success) return;
    expect(r2.error.code).toBe("ALREADY_VOTED");
  });

  it("rejects vote from a voter not in the team", () => {
    const proposalId = state.proposals[0].id;
    const result = submitVote(state, proposalId, "outsider", TEAM_A_ID, "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("VOTER_NOT_IN_TEAM");
  });

  it("rejects vote from a team not involved in the proposal", () => {
    // Add a third team not involved
    state.teams.push(
      makeTeam({ id: "team-c", memberIds: ["eve"], country: "USA" })
    );
    const proposalId = state.proposals[0].id;

    const result = submitVote(state, proposalId, "eve", "team-c", "approve");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("WRONG_TEAM");
  });
});

// ─── resolveVotes ───────────────────────────────────────────

describe("resolveVotes", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (result.success) state = result.data.updatedState;
  });

  function voteAll(
    s: GameState,
    decisions: { voterId: string; teamId: string; decision: "approve" | "reject" }[]
  ): GameState {
    let current = s;
    for (const d of decisions) {
      const r = submitVote(current, current.proposals[0].id, d.voterId, d.teamId, d.decision);
      if (r.success) current = r.data.updatedState;
    }
    return current;
  }

  it("returns approved when all voters approve", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "bob", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "charlie", teamId: TEAM_B_ID, decision: "approve" },
      { voterId: "diana", teamId: TEAM_B_ID, decision: "approve" },
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("approved");
    expect(result.data.tallies).toHaveLength(2);
    result.data.tallies.forEach((t) => {
      expect(t.outcome).toBe("approved");
    });
  });

  it("returns rejected when all voters reject", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "reject" },
      { voterId: "bob", teamId: TEAM_A_ID, decision: "reject" },
      { voterId: "charlie", teamId: TEAM_B_ID, decision: "reject" },
      { voterId: "diana", teamId: TEAM_B_ID, decision: "reject" },
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("rejected");
  });

  it("returns rejected on tie (approves === rejects)", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "bob", teamId: TEAM_A_ID, decision: "reject" },
      { voterId: "charlie", teamId: TEAM_B_ID, decision: "approve" },
      { voterId: "diana", teamId: TEAM_B_ID, decision: "reject" },
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("rejected");
  });

  it("returns pending when not all members have voted", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "approve" },
      // bob, charlie, diana have not voted
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("pending");
  });

  it("returns rejected if one team approves and the other rejects", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "bob", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "charlie", teamId: TEAM_B_ID, decision: "reject" },
      { voterId: "diana", teamId: TEAM_B_ID, decision: "reject" },
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("rejected");
  });

  it("returns pending if one team finished, the other hasn't", () => {
    state = voteAll(state, [
      { voterId: "alice", teamId: TEAM_A_ID, decision: "approve" },
      { voterId: "bob", teamId: TEAM_A_ID, decision: "approve" },
      // Team B hasn't voted yet
    ]);

    const result = resolveVotes(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.overallOutcome).toBe("pending");
  });

  it("errors on nonexistent proposal", () => {
    const result = resolveVotes(state, "nonexistent");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });
});

// ─── validateTrade ──────────────────────────────────────────

describe("validateTrade", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
    const result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (result.success) state = result.data.updatedState;
  });

  it("validates a pending proposal with untouched items", () => {
    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.valid).toBe(true);
  });

  it("fails if a proposal item has been traded", () => {
    state.items = state.items.map((i) =>
      i.id === "a1" ? { ...i, traded: true } : i
    );

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_ALREADY_TRADED");
  });

  it("fails if proposal is not pending", () => {
    state.proposals = state.proposals.map((p) => ({
      ...p,
      status: "executed" as const,
    }));

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_PENDING");
  });

  it("fails if proposal does not exist", () => {
    const result = validateTrade(state, "nonexistent");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });

  it("fails if item team ownership changed", () => {
    // Simulate item changing teams (edge case)
    state.items = state.items.map((i) =>
      i.id === "a1" ? { ...i, teamId: TEAM_B_ID } : i
    );

    const result = validateTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("ITEM_WRONG_TEAM");
  });
});

// ─── executeTrade ───────────────────────────────────────────

describe("executeTrade", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  function setupApprovedProposal(
    s: GameState,
    offeredIds: string[],
    requestedIds: string[]
  ): GameState {
    const propResult = createTradeProposal(s, TEAM_A_ID, offeredIds, requestedIds);
    if (!propResult.success) throw new Error("proposal creation failed");
    let current = propResult.data.updatedState;
    const proposalId = propResult.data.proposal.id;

    // All members vote approve
    for (const team of current.teams) {
      for (const memberId of team.memberIds) {
        const voteResult = submitVote(current, proposalId, memberId, team.id, "approve");
        if (voteResult.success) current = voteResult.data.updatedState;
      }
    }
    return current;
  }

  it("executes a fully approved trade", () => {
    state = setupApprovedProposal(state, ["a1"], ["b1"]);
    const proposalId = state.proposals[0].id;

    const result = executeTrade(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const { updatedState } = result.data;
    // Items should be marked as traded
    expect(updatedState.items.find((i) => i.id === "a1")?.traded).toBe(true);
    expect(updatedState.items.find((i) => i.id === "b1")?.traded).toBe(true);
    // Other items should remain untraded
    expect(updatedState.items.find((i) => i.id === "a2")?.traded).toBe(false);
    // Proposal status should be "executed"
    expect(updatedState.proposals.find((p) => p.id === proposalId)?.status).toBe("executed");
  });

  it("cancels conflicting pending proposals", () => {
    // Create first proposal (a1 <-> b1)
    state = setupApprovedProposal(state, ["a1"], ["b1"]);

    // Create a second proposal that also references a1
    const prop2Result = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b2"]);
    expect(prop2Result.success).toBe(true);
    if (!prop2Result.success) return;
    state = prop2Result.data.updatedState;

    // Execute the first proposal
    const proposalId = state.proposals[0].id;
    const result = executeTrade(state, proposalId);
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Second proposal should be cancelled
    const secondProposal = result.data.updatedState.proposals[1];
    expect(secondProposal.status).toBe("cancelled");
  });

  it("rejects trade that hasn't been approved by both teams", () => {
    const propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    expect(propResult.success).toBe(true);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    // No votes submitted

    const result = executeTrade(state, state.proposals[0].id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("TRADE_NOT_APPROVED");
  });

  it("rejects trade when only one team approves", () => {
    const propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // Only Team A votes
    for (const memberId of state.teams[0].memberIds) {
      const r = submitVote(state, proposalId, memberId, TEAM_A_ID, "approve");
      if (r.success) state = r.data.updatedState;
    }
    // Team B rejects
    for (const memberId of state.teams[1].memberIds) {
      const r = submitVote(state, proposalId, memberId, TEAM_B_ID, "reject");
      if (r.success) state = r.data.updatedState;
    }

    const result = executeTrade(state, proposalId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("TRADE_NOT_APPROVED");
  });

  it("does not mutate the original state", () => {
    state = setupApprovedProposal(state, ["a1"], ["b1"]);
    const originalItem = state.items.find((i) => i.id === "a1");
    executeTrade(state, state.proposals[0].id);
    expect(originalItem?.traded).toBe(false);
  });
});

// ─── calculateTeamScore ─────────────────────────────────────

describe("calculateTeamScore", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it("returns zero gains/concessions with no executed trades", () => {
    const score = calculateTeamScore(state, TEAM_A_ID);
    expect(score.teamId).toBe(TEAM_A_ID);
    expect(score.startingPoints).toBe(100); // 20+30+50
    expect(score.pointsGained).toBe(0);
    expect(score.pointsConceded).toBe(0);
    expect(score.netScore).toBe(0);
  });

  it("calculates score for proposing team after executed trade", () => {
    // Team A offers Steel(20) for Silk(15) — net = 15 - 20 = -5
    const propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    // All approve
    for (const team of state.teams) {
      for (const memberId of team.memberIds) {
        const r = submitVote(state, proposalId, memberId, team.id, "approve");
        if (r.success) state = r.data.updatedState;
      }
    }

    const execResult = executeTrade(state, proposalId);
    if (!execResult.success) return;
    state = execResult.data.updatedState;

    const score = calculateTeamScore(state, TEAM_A_ID);
    expect(score.pointsConceded).toBe(20); // gave Steel(20)
    expect(score.pointsGained).toBe(15);   // got Silk(15)
    expect(score.netScore).toBe(-5);
  });

  it("calculates score for receiving team after executed trade", () => {
    // Team A proposes: offers Steel(20), requests Silk(15)
    // For Team B: conceded Silk(15), gained Steel(20) → net = +5
    const propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    for (const team of state.teams) {
      for (const memberId of team.memberIds) {
        const r = submitVote(state, proposalId, memberId, team.id, "approve");
        if (r.success) state = r.data.updatedState;
      }
    }

    const execResult = executeTrade(state, proposalId);
    if (!execResult.success) return;
    state = execResult.data.updatedState;

    const score = calculateTeamScore(state, TEAM_B_ID);
    expect(score.pointsConceded).toBe(15); // gave Silk(15)
    expect(score.pointsGained).toBe(20);   // got Steel(20)
    expect(score.netScore).toBe(5);
  });

  it("accumulates scores across multiple trades", () => {
    // Trade 1: Team A offers Steel(20) for Silk(15)
    let propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    let proposalId = state.proposals[0].id;

    for (const team of state.teams) {
      for (const memberId of team.memberIds) {
        const r = submitVote(state, proposalId, memberId, team.id, "approve");
        if (r.success) state = r.data.updatedState;
      }
    }
    let exec = executeTrade(state, proposalId);
    if (!exec.success) return;
    state = exec.data.updatedState;

    // Trade 2: Team A offers Oil(30) for Tea(35)
    propResult = createTradeProposal(state, TEAM_A_ID, ["a2"], ["b2"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    proposalId = state.proposals[state.proposals.length - 1].id;

    for (const team of state.teams) {
      for (const memberId of team.memberIds) {
        const r = submitVote(state, proposalId, memberId, team.id, "approve");
        if (r.success) state = r.data.updatedState;
      }
    }
    exec = executeTrade(state, proposalId);
    if (!exec.success) return;
    state = exec.data.updatedState;

    // Team A: conceded 20+30=50, gained 15+35=50 → net 0
    const scoreA = calculateTeamScore(state, TEAM_A_ID);
    expect(scoreA.pointsConceded).toBe(50);
    expect(scoreA.pointsGained).toBe(50);
    expect(scoreA.netScore).toBe(0);
  });
});

// ─── determineWinner ────────────────────────────────────────

describe("determineWinner", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it("declares a winner when one team has higher net score", () => {
    // Team A offers Steel(20) for Silk(15) → Team A net=-5, Team B net=+5
    const propResult = createTradeProposal(state, TEAM_A_ID, ["a1"], ["b1"]);
    if (!propResult.success) return;
    state = propResult.data.updatedState;
    const proposalId = state.proposals[0].id;

    for (const team of state.teams) {
      for (const memberId of team.memberIds) {
        const r = submitVote(state, proposalId, memberId, team.id, "approve");
        if (r.success) state = r.data.updatedState;
      }
    }
    const exec = executeTrade(state, proposalId);
    if (!exec.success) return;
    state = exec.data.updatedState;

    const result = determineWinner(state);
    expect(result.isDraw).toBe(false);
    expect(result.winnerId).toBe(TEAM_B_ID);
    expect(result.scores).toHaveLength(2);
  });

  it("declares a draw when net scores are equal", () => {
    // No trades = both 0 net → draw
    const result = determineWinner(state);
    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBeNull();
  });

  it("handles single team", () => {
    state.teams = [state.teams[0]];
    const result = determineWinner(state);
    expect(result.isDraw).toBe(false);
    expect(result.winnerId).toBe(TEAM_A_ID);
    expect(result.scores).toHaveLength(1);
  });
});
