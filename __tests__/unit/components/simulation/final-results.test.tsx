import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinalResults } from "@/components/simulation/final-results";

describe("FinalResults Component", () => {
	it("displays USA as winner when USA has higher score", () => {
		const scores = [
			{
				id: "s1",
				class_id: "c1",
				team_id: "t1",
				score: 150,
				updated_at: "",
				team: { country: "USA" },
			},
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 100,
				updated_at: "",
				team: { country: "China" },
			},
		];

		render(<FinalResults scores={scores as any} />);

		expect(screen.getByText("USA Wins!")).toBeInTheDocument();
		expect(screen.getByText("150")).toBeInTheDocument();
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(screen.getByText("Winner")).toBeInTheDocument();
	});

	it("displays China as winner when China has higher score", () => {
		const scores = [
			{
				id: "s1",
				class_id: "c1",
				team_id: "t1",
				score: 80,
				updated_at: "",
				team: { country: "USA" },
			},
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 120,
				updated_at: "",
				team: { country: "China" },
			},
		];

		render(<FinalResults scores={scores as any} />);

		expect(screen.getByText("PRC Wins!")).toBeInTheDocument();
		expect(screen.getByText("80")).toBeInTheDocument();
		expect(screen.getByText("120")).toBeInTheDocument();
	});

	it("displays draw when scores are equal", () => {
		const scores = [
			{
				id: "s1",
				class_id: "c1",
				team_id: "t1",
				score: 100,
				updated_at: "",
				team: { country: "USA" },
			},
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 100,
				updated_at: "",
				team: { country: "China" },
			},
		];

		render(<FinalResults scores={scores as any} />);

		expect(screen.getByText("It's a Draw!")).toBeInTheDocument();
		expect(screen.getAllByText("100")).toHaveLength(2);
		expect(screen.getByText("Draw")).toBeInTheDocument();
	});

	it("displays simulation complete message", () => {
		const scores = [
			{
				id: "s1",
				class_id: "c1",
				team_id: "t1",
				score: 50,
				updated_at: "",
				team: { country: "USA" },
			},
			{
				id: "s2",
				class_id: "c1",
				team_id: "t2",
				score: 75,
				updated_at: "",
				team: { country: "China" },
			},
		];

		render(<FinalResults scores={scores as any} />);

		expect(screen.getByText("Simulation Complete")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Thank you for participating in the trade war simulation!",
			),
		).toBeInTheDocument();
	});
});
