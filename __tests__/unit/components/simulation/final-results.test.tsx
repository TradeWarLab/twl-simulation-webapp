import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinalResults } from "@/components/simulation/final-results";
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

const COSTS = { USA: -10, China: -10 };

describe("FinalResults", () => {
	it("reports no deal instead of a stalemate when no scores exist", () => {
		render(<FinalResults scores={[]} noDealCosts={COSTS} />);
		expect(screen.getByText(/no deal reached/i)).toBeInTheDocument();
		expect(screen.queryByText(/stalemate/i)).not.toBeInTheDocument();
	});

	it("shows the student's own cost and hides the other team's on a no deal", () => {
		render(<FinalResults scores={[]} noDealCosts={{ USA: -10, China: null }} />);
		expect(screen.getAllByText("-10")).toHaveLength(1);
		expect(screen.getByText("Classified")).toBeInTheDocument();
		expect(screen.queryByText("Winner")).not.toBeInTheDocument();
	});

	it("still calls a genuine 0-0 result a stalemate", () => {
		render(<FinalResults scores={makeScores(0, 0)} noDealCosts={COSTS} />);
		expect(screen.getByText(/stalemate/i)).toBeInTheDocument();
	});

	it("names the winner and the point advantage", () => {
		render(<FinalResults scores={makeScores(42, 31)} noDealCosts={COSTS} />);
		expect(screen.getByText(/11-point advantage for USA/i)).toBeInTheDocument();
		expect(screen.getByText("Winner")).toBeInTheDocument();
	});
});
