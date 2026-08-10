import { describe, expect, it } from "vitest";
import {
	DEFAULT_BRIEFINGS,
	INTEREST_GROUPS,
	interestGroupLabel,
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

	it("defines 3 interest groups pairing a stored value with a display label", () => {
		expect(INTEREST_GROUPS).toHaveLength(3);
		expect(INTEREST_GROUPS).toEqual([
			{ value: "Pro-Globalization", label: "Globalist" },
			{ value: "Pro-Decoupling", label: "Protectionist" },
			{ value: "Strategic Rivalry", label: "National Security" },
		]);
	});

	it("maps a stored value to its label, passing unknown values through", () => {
		expect(interestGroupLabel("Pro-Decoupling")).toBe("Protectionist");
		expect(interestGroupLabel("Some Legacy Value")).toBe("Some Legacy Value");
		expect(interestGroupLabel(null)).toBe("");
		expect(interestGroupLabel(undefined)).toBe("");
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
