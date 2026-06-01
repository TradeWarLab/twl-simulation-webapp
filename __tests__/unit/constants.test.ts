import { describe, expect, it } from "vitest";
import {
	DEFAULT_BRIEFINGS,
	INTEREST_GROUPS,
	SIMULATION_PERIODS,
	TEAM_COUNTRIES,
} from "@/lib/constants";

describe("Constants", () => {
	it("defines 4 simulation periods in order", () => {
		expect(SIMULATION_PERIODS).toHaveLength(4);
		expect(SIMULATION_PERIODS[0]).toBe("Setup");
		expect(SIMULATION_PERIODS[3]).toBe("End");
	});

	it("defines exactly USA and China as team countries", () => {
		expect(TEAM_COUNTRIES).toEqual(["USA", "China"]);
	});

	it("defines 3 interest groups", () => {
		expect(INTEREST_GROUPS).toHaveLength(3);
		expect(INTEREST_GROUPS).toContain("Pro-Globalization");
		expect(INTEREST_GROUPS).toContain("Pro-Decoupling");
		expect(INTEREST_GROUPS).toContain("Strategic Rivalry");
	});

	it("provides 6 default briefings (3 per country)", () => {
		expect(DEFAULT_BRIEFINGS).toHaveLength(6);

		const usaBriefings = DEFAULT_BRIEFINGS.filter(
			(b) => b.target_role === "USA",
		);
		const chinaBriefings = DEFAULT_BRIEFINGS.filter(
			(b) => b.target_role === "China",
		);

		expect(usaBriefings).toHaveLength(3);
		expect(chinaBriefings).toHaveLength(3);
	});

	it("each briefing has required fields", () => {
		for (const briefing of DEFAULT_BRIEFINGS) {
			expect(briefing.title).toBeTruthy();
			expect(briefing.content).toBeTruthy();
			expect(briefing.file_url).toBeTruthy();
			expect(briefing.interest_group).toBeTruthy();
			expect(["USA", "China"]).toContain(briefing.target_role);
		}
	});

	it("briefing content does not contain 'Official'", () => {
		for (const briefing of DEFAULT_BRIEFINGS) {
			expect(briefing.content).not.toMatch(/^Official/);
		}
	});
});
