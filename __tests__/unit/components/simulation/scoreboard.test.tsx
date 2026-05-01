import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Scoreboard } from "@/components/simulation/scoreboard";

describe("Scoreboard Component", () => {
	it("renders both country labels with their scores", () => {
		const initialScores = [
			{
				id: "s1",
				class_id: "c1",
				team_id: "t1",
				score: 1000,
				updated_at: "",
				team: { id: "t1", class_id: "c1", country: "USA", balance: 1000 },
			},
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 2500,
				updated_at: "",
				team: { id: "t2", class_id: "c1", country: "China", balance: 2500 },
			},
		];

		render(<Scoreboard initialScores={initialScores as any} />);

		expect(screen.getByText("Bilateral Scoreboard")).toBeInTheDocument();
		expect(screen.getByText("USA")).toBeInTheDocument();
		expect(screen.getByText("1000")).toBeInTheDocument();
		expect(screen.getByText("China")).toBeInTheDocument();
		expect(screen.getByText("2500")).toBeInTheDocument();
	});

	it("falls back to zero when a team score is missing", () => {
		const initialScores = [
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 50,
				updated_at: "",
				team: { id: "t2", class_id: "c1", country: "China", balance: 50 },
			},
		];

		render(<Scoreboard initialScores={initialScores as any} />);

		expect(screen.getByText("USA")).toBeInTheDocument();
		expect(screen.getByText("China")).toBeInTheDocument();
		expect(screen.getByText("50")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});
});
