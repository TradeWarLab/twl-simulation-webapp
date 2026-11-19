import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildOutcomeRow,
	type ClassOutcome,
	exportClassOutcome,
	OUTCOME_SHEET_COLUMNS,
} from "@/lib/class-outcome";
import { appendSheetRow } from "@/lib/google-sheets";

vi.mock("@/lib/google-sheets", () => ({ appendSheetRow: vi.fn() }));

const NO_DEAL: ClassOutcome = {
	id: 7,
	class_id: "class-1",
	class_name: "POLS 170",
	ended_at: "2026-11-18T20:00:00Z",
	round2_started_at: "2026-11-18T19:10:00Z",
	outcome: "no_deal",
	ended_by: "instructor",
	ended_by_user: "inst-1",
	usa_members: 4,
	china_members: 5,
	usa_no_deal_cost: -10,
	china_no_deal_cost: -20,
	board_items: [{ name: "Tariffs", giving_team: "USA" }],
	board_usa_score: 12,
	board_china_score: -3,
	package_id: null,
	package_status: null,
	package_items: null,
	package_approvals: null,
	package_rejections: null,
	package_forced_approvals: null,
	package_usa_score: null,
	package_china_score: null,
};

describe("buildOutcomeRow", () => {
	it("gives one cell per column, in column order", () => {
		const row = buildOutcomeRow(NO_DEAL);

		expect(row).toHaveLength(OUTCOME_SHEET_COLUMNS.length);
		expect(row.slice(0, 4)).toEqual([
			"2026-11-18T20:00:00Z",
			"class-1",
			"POLS 170",
			"no_deal",
		]);
	});

	it("writes null as an empty cell and JSON for item lists", () => {
		const row = buildOutcomeRow(NO_DEAL);
		const cell = (column: (typeof OUTCOME_SHEET_COLUMNS)[number]) =>
			row[OUTCOME_SHEET_COLUMNS.indexOf(column)];

		expect(cell("package_usa_score")).toBe("");
		expect(cell("board_usa_score")).toBe(12);
		expect(cell("board_items")).toBe(
			'[{"name":"Tariffs","giving_team":"USA"}]',
		);
	});
});

describe("exportClassOutcome", () => {
	beforeEach(() => {
		vi.mocked(appendSheetRow).mockReset();
	});

	it("does nothing when the round was already over", async () => {
		await exportClassOutcome(null);

		expect(appendSheetRow).not.toHaveBeenCalled();
	});

	it("appends the row to the outcomes tab", async () => {
		vi.stubEnv("CLASS_OUTCOME_SHEET_ID", "sheet-1");
		vi.stubEnv("CLASS_OUTCOME_SHEET_TAB", "Outcomes");

		await exportClassOutcome(NO_DEAL);

		expect(appendSheetRow).toHaveBeenCalledWith(buildOutcomeRow(NO_DEAL), {
			id: "sheet-1",
			tab: "Outcomes",
		});
		vi.unstubAllEnvs();
	});

	it("logs a failed append and does not throw", async () => {
		vi.mocked(appendSheetRow).mockRejectedValue(new Error("403"));
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		await expect(exportClassOutcome(NO_DEAL)).resolves.toBeUndefined();
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
