// ──────────────────────────────────────────────
// Negotiation Game Engine — Type Definitions
// ──────────────────────────────────────────────

/** A negotiable item owned by a team. */
export type NegotiationItem = {
  id: string;
  classId: string;
  teamId: string;
  name: string;
  /** Point value representing how much this team cares about the item. */
  value: number;
  /** Whether this item has already been traded away. */
  traded: boolean;
};

/** A reference to an item within a trade proposal. */
export type TradeProposalItem = {
  itemId: string;
  /** The team that currently owns this item (the team giving it up). */
  fromTeamId: string;
};

/** Status lifecycle for a trade proposal. */
export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "cancelled";

/** A formal trade proposal between two teams. */
export type TradeProposal = {
  id: string;
  classId: string;
  /** Team that created the proposal. */
  proposedByTeamId: string;
  /** Items the proposing team offers to give up. */
  offeredItems: TradeProposalItem[];
  /** Items the proposing team requests from the other team. */
  requestedItems: TradeProposalItem[];
  status: ProposalStatus;
  createdAt: string;
};

/** An individual team member's vote on a proposal. */
export type VoteDecision = "approve" | "reject";

export type Vote = {
  id: string;
  proposalId: string;
  voterId: string;
  teamId: string;
  decision: VoteDecision;
  createdAt: string;
};

/** Aggregated voting result for one team on a proposal. */
export type VoteOutcome = "approved" | "rejected" | "pending";

export type VoteTally = {
  teamId: string;
  approveCount: number;
  rejectCount: number;
  totalVoters: number;
  outcome: VoteOutcome;
};

/** A team participating in the negotiation. */
export type NegotiationTeam = {
  id: string;
  classId: string;
  country: "USA" | "China";
  memberIds: string[];
};

/** Computed score for a team. */
export type TeamScore = {
  teamId: string;
  /** Sum of all item values the team started with (always 100). */
  startingPoints: number;
  /** Sum of values of items received through trades. */
  pointsGained: number;
  /** Sum of values of items given away through trades. */
  pointsConceded: number;
  /** Net score = pointsGained − pointsConceded. */
  netScore: number;
};

/** Result of determineWinner. */
export type GameResult = {
  winnerId: string | null;
  isDraw: boolean;
  scores: TeamScore[];
};

/** Full game state snapshot for a class's negotiation round. */
export type GameState = {
  classId: string;
  teams: NegotiationTeam[];
  items: NegotiationItem[];
  proposals: TradeProposal[];
  votes: Vote[];
};

// ──────────────────────────────────────────────
// Error types for engine validation
// ──────────────────────────────────────────────

export type EngineErrorCode =
  | "DUPLICATE_ITEMS"
  | "ITEM_NOT_FOUND"
  | "ITEM_ALREADY_TRADED"
  | "ITEM_WRONG_TEAM"
  | "EMPTY_PROPOSAL"
  | "SAME_TEAM_TRADE"
  | "ALREADY_VOTED"
  | "WRONG_TEAM"
  | "PROPOSAL_NOT_FOUND"
  | "PROPOSAL_NOT_PENDING"
  | "VOTER_NOT_IN_TEAM"
  | "TRADE_NOT_APPROVED";

export type EngineError = {
  code: EngineErrorCode;
  message: string;
};

export type EngineResult<T> =
  | { success: true; data: T }
  | { success: false; error: EngineError };
