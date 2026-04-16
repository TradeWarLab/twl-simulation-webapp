export const SIMULATION_PERIODS = [
	"Setup",
	"Domestic Negotiation",
	"Bilateral Negotiation",
	"End",
];

export const TEAM_COUNTRIES = ["USA", "China"] as const;

export const INTEREST_GROUPS = [
	"Pro-Globalization",
	"Pro-Decoupling",
	"Strategic Rivalry",
] as const;

export const TARGET_ROLES = ["USA", "China", "All"] as const;

export const VOTE_CHOICES = ["approve", "reject"] as const;

export const TRADE_PROPOSAL_STATUSES = [
	"pending",
	"approved",
	"rejected",
	"executed",
] as const;
