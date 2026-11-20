import { appendSheetRow } from "@/lib/google-sheets";

/**
 * A class_outcomes row, as end_bilateral_round and finalize_ratified_package
 * return it. Scores are "as if every member approved". Never send it to a
 * student: a no-deal class must show only "No Deal".
 */
export type ClassOutcome = {
	id: number;
	class_id: string;
	class_name: string;
	ended_at: string;
	round2_started_at: string | null;
	outcome: "deal" | "no_deal";
	ended_by: "ratified" | "instructor";
	ended_by_user: string | null;
	usa_members: number;
	china_members: number;
	usa_no_deal_cost: number;
	china_no_deal_cost: number;
	board_items: unknown[];
	board_usa_score: number;
	board_china_score: number;
	package_id: string | null;
	package_status: string | null;
	package_items: unknown[] | null;
	package_approvals: number | null;
	package_rejections: number | null;
	package_forced_approvals: number | null;
	package_usa_score: number | null;
	package_china_score: number | null;
};

/** Column order of the outcomes tab. Its first row must match. */
export const OUTCOME_SHEET_COLUMNS = [
	"ended_at",
	"class_id",
	"class_name",
	"outcome",
	"ended_by",
	"round2_started_at",
	"usa_members",
	"china_members",
	"usa_no_deal_cost",
	"china_no_deal_cost",
	"board_usa_score",
	"board_china_score",
	"package_status",
	"package_approvals",
	"package_rejections",
	"package_forced_approvals",
	"package_usa_score",
	"package_china_score",
	"board_items",
	"package_items",
	"package_id",
	"id",
] as const satisfies readonly (keyof ClassOutcome)[];

const TIME_COLUMNS = new Set<string>(["ended_at", "round2_started_at"]);

/** Gives "YYYY-MM-DD HH:MM" in UTC. class_outcomes keeps full precision. */
function formatMinuteUtc(timestamp: string): string {
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return timestamp;
	return date.toISOString().slice(0, 16).replace("T", " ");
}

export function buildOutcomeRow(outcome: ClassOutcome): (string | number)[] {
	return OUTCOME_SHEET_COLUMNS.map((column) => {
		const value = outcome[column];
		if (value === null || value === undefined) return "";
		if (TIME_COLUMNS.has(column) && typeof value === "string") {
			return formatMinuteUtc(value);
		}
		if (typeof value === "object") return JSON.stringify(value);
		return value;
	});
}

/**
 * Appends the outcome to the lab Sheet. class_outcomes is the record: a failed
 * append is logged and does not fail the round end.
 */
export async function exportClassOutcome(
	outcome: ClassOutcome | null | undefined,
): Promise<void> {
	if (!outcome) return;
	try {
		await appendSheetRow(buildOutcomeRow(outcome), {
			id: process.env.CLASS_OUTCOME_SHEET_ID,
			tab: process.env.CLASS_OUTCOME_SHEET_TAB,
		});
	} catch (error) {
		console.error(
			"Class outcome Sheet append failed; the row is kept in class_outcomes:",
			error,
		);
	}
}
