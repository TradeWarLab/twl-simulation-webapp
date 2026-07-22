import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimulationResultsCard } from "@/components/instructor/simulation-results-card";
import type { TeamScore } from "@/lib/types/domain";

function makeScores(usa: number, china: number): TeamScore[] {
	return [
		{
			id: "s1",
			class_id: "class-1",
			team_id: "team-usa",
			score: usa,
			updated_at: "2026-07-21T00:00:00Z",
			team: { country: "USA" },
		},
		{
			id: "s2",
			class_id: "class-1",
			team_id: "team-china",
			score: china,
			updated_at: "2026-07-21T00:00:00Z",
			team: { country: "China" },
		},
	];
}

describe("SimulationResultsCard", () => {
	it("announces the winner and the point advantage", () => {
		render(<SimulationResultsCard scores={makeScores(42, 31)} />);
		expect(screen.getByText(/simulation complete/i)).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("31")).toBeInTheDocument();
		expect(screen.getByText(/USA leads by 11/i)).toBeInTheDocument();
	});

	it("labels the China delegation PRC, matching the rest of the dashboard", () => {
		render(<SimulationResultsCard scores={makeScores(42, 31)} />);
		expect(screen.getByText(/team prc/i)).toBeInTheDocument();
	});

	it("reports a draw with no winner", () => {
		render(<SimulationResultsCard scores={makeScores(20, 20)} />);
		expect(screen.getByText(/tied at 20/i)).toBeInTheDocument();
	});

	it("renders the no-deal state without any scores", () => {
		render(<SimulationResultsCard scores={[]} />);
		expect(screen.getByText(/no deal reached/i)).toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});
});
