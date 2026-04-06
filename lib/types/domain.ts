export type ClassStatus = "active" | "archived";

export type TeamCountry = "USA" | "China";

export type InviteStatus = "pending" | "account_created";

export type ClassSummary = {
  id: string;
  name: string;
  status: ClassStatus;
  current_period: number;
};

export type StudentClassSummary = ClassSummary & {
  team_country: TeamCountry | null;
};

export type StudentClassJoinRow = {
  class_id: string;
  team_id: string | null;
  classes: ClassSummary | ClassSummary[] | null;
  teams: { country: TeamCountry } | { country: TeamCountry }[] | null;
};

export type ClassInviteRow = {
  email: string;
  affiliation: TeamCountry;
  interest_block: string | null;
  status: InviteStatus;
  invited_at: string;
};

export type ClassRosterEntry = {
  user_id?: string;
  email: string;
  full_name: string | null;
  affiliation: TeamCountry;
  interest_group: string | null;
  status: InviteStatus;
  joined_at: string | null;
};

// ─── Trade Controller Types ─────────────────────────────

export type TradeProposalStatus = "pending" | "approved" | "rejected" | "executed";

export type TradeProposalItem = {
  item_id: string;
  name: string;
  value: number;
};

export type TradeProposal = {
  id: string;
  class_id: string;
  proposing_team_id: string;
  receiving_team_id: string;
  offered_items: TradeProposalItem[];
  requested_items: TradeProposalItem[];
  status: TradeProposalStatus;
  created_by: string;
  created_at: string;
  // Joined fields (optional, populated by queries)
  proposing_team?: { id?: string; country: TeamCountry };
  receiving_team?: { country: TeamCountry };
  creator?: { full_name: string | null };
  votes?: TradeVote[];
  vote_summary?: {
    total_members: number;
    votes_cast: number;
    approvals: number;
    rejections: number;
  };
};

export type VoteChoice = "approve" | "reject";

export type Vote = {
  id: string;
  proposal_id: string;
  user_id: string;
  team_id: string;
  vote: VoteChoice;
  created_at: string;
  // Joined
  user?: { full_name: string | null };
};

export type TeamScore = {
  id: string;
  class_id: string;
  team_id: string;
  score: number;
  updated_at: string;
  // Joined
  team?: { country: TeamCountry };
};

// Trade Vote Types (used by UI components)
export type TradeVoteType = "approve" | "reject";

export type TradeVote = {
  id: string;
  proposal_id: string;
  student_id: string;
  vote: TradeVoteType;
  created_at: string;
  student?: {
    full_name: string | null;
  };
};


