// not sure all of these are necessary, but nice to have in development

export const SIMULATION_PERIODS = [
	"Setup",
	"Domestic Negotiation",
	"Bilateral Negotiation",
	"End",
];

export const TEAM_COUNTRIES = ["USA", "China"] as const;

/**
 * Interest-group roles. `value` is what is persisted to
 * students_classes.interest_block, class_invites.interest_block, and
 * briefings.interest_group — getStudentBriefings matches on it by string
 * equality, so changing it would orphan existing enrolments from their role
 * briefing. `label` is the instructor-facing vocabulary from the run guide.
 */
export const INTEREST_GROUPS = [
	{ value: "Pro-Globalization", label: "Globalist" },
	{ value: "Pro-Decoupling", label: "Protectionist" },
	{ value: "Strategic Rivalry", label: "National Security" },
] as const;

export type InterestGroupValue = (typeof INTEREST_GROUPS)[number]["value"];

/** Display label for a stored interest-group value; unknown values pass through. */
export function interestGroupLabel(value: string | null | undefined): string {
	if (!value) return "";
	return INTEREST_GROUPS.find((group) => group.value === value)?.label ?? value;
}

/**
 * Documentary that inspired the simulation, linked from the instructor guide.
 * Empty hides the link rather than rendering a dead one.
 */
export const DOCUMENTARY_URL = "";

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
		title: "US Globalist Briefing",
		target_role: "USA" as const,
		interest_group: "Pro-Globalization",
		file_url: "/uploads/briefings/Briefing A-US Pro-Globalization.pdf",
		content: "Briefing for the US Globalist interest group.",
	},
	{
		title: "US Protectionist Briefing",
		target_role: "USA" as const,
		interest_group: "Pro-Decoupling",
		file_url: "/uploads/briefings/Briefing B- US Pro-Decoupling.pdf",
		content: "Briefing for the US Protectionist interest group.",
	},
	{
		title: "US National Security Briefing",
		target_role: "USA" as const,
		interest_group: "Strategic Rivalry",
		file_url: "/uploads/briefings/Briefing E- US Strategic Rivalry.pdf",
		content: "Briefing for the US National Security interest group.",
	},
	{
		title: "China Globalist Briefing",
		target_role: "China" as const,
		interest_group: "Pro-Globalization",
		file_url: "/uploads/briefings/Briefing C- China Pro-Globalization.pdf",
		content: "Briefing for the China Globalist interest group.",
	},
	{
		title: "China Protectionist Briefing",
		target_role: "China" as const,
		interest_group: "Pro-Decoupling",
		file_url: "/uploads/briefings/Briefing D- China Pro-Decoupling.pdf",
		content: "Briefing for the China Protectionist interest group.",
	},
	{
		title: "China National Security Briefing",
		target_role: "China" as const,
		interest_group: "Strategic Rivalry",
		file_url: "/uploads/briefings/Briefing F- China Strategic Rivalry.pdf",
		content: "Briefing for the China National Security interest group.",
	},
];
