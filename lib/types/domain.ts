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
  email: string;
  full_name: string | null;
  affiliation: TeamCountry;
  interest_group: string | null;
  status: InviteStatus;
};

