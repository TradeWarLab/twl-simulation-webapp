import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimulationHeader } from "@/components/simulation/simulation-header";

describe("SimulationHeader Component", () => {
	const classRecord = {
		id: "cls-1",
		name: "Global Economics",
		status: "active",
		current_period: 1,
	};

	const periods = [
		"Preparation",
		"Negotiation 1",
		"Market Update",
		"Final Results",
	];

	it("renders active session properly for a student in a team", () => {
		const teamRecord = { id: "team-1", country: "USA" };

		render(
			<SimulationHeader
				classRecord={classRecord as any}
				teamRecord={teamRecord as any}
				periods={periods}
			/>,
		);

		expect(screen.getByText("Global Economics")).toBeInTheDocument();
		expect(screen.getByText("USA")).toBeInTheDocument();

		// The phase is 'Negotiation 1' (index 1)
		expect(screen.getByText("Negotiation 1")).toBeInTheDocument();
	});

	it("renders observer mode for unassigned or instructor user", () => {
		// pass no teamRecord
		render(
			<SimulationHeader
				classRecord={classRecord as any}
				teamRecord={null}
				periods={periods}
			/>,
		);

		expect(screen.getByText("Global Economics")).toBeInTheDocument();
		expect(screen.getByText("Unassigned")).toBeInTheDocument();
	});
});
