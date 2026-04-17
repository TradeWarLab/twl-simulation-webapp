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

export const DEFAULT_BRIEFINGS = [
	{
		title: "US Pro-Globalization Briefing",
		target_role: "USA" as const,
		interest_group: "Pro-Globalization",
		file_url: "/uploads/briefings/Briefing A-US Pro-Globalization.pdf",
		content: "Official briefing for the US Pro-Globalization interest group.",
	},
	{
		title: "US Pro-Decoupling Briefing",
		target_role: "USA" as const,
		interest_group: "Pro-Decoupling",
		file_url: "/uploads/briefings/Briefing B- US Pro-Decoupling.pdf",
		content: "Official briefing for the US Pro-Decoupling interest group.",
	},
	{
		title: "US Strategic Rivalry Briefing",
		target_role: "USA" as const,
		interest_group: "Strategic Rivalry",
		file_url: "/uploads/briefings/Briefing E- US Strategic Rivalry.pdf",
		content: "Official briefing for the US Strategic Rivalry interest group.",
	},
	{
		title: "China Pro-Globalization Briefing",
		target_role: "China" as const,
		interest_group: "Pro-Globalization",
		file_url: "/uploads/briefings/Briefing C- China Pro-Globalization.pdf",
		content: "Official briefing for the China Pro-Globalization interest group.",
	},
	{
		title: "China Pro-Decoupling Briefing",
		target_role: "China" as const,
		interest_group: "Pro-Decoupling",
		file_url: "/uploads/briefings/Briefing D- China Pro-Decoupling.pdf",
		content: "Official briefing for the China Pro-Decoupling interest group.",
	},
	{
		title: "China Strategic Rivalry Briefing",
		target_role: "China" as const,
		interest_group: "Strategic Rivalry",
		file_url: "/uploads/briefings/Briefing F- China Strategic Rivalry.pdf",
		content: "Official briefing for the China Strategic Rivalry interest group.",
	},
];
