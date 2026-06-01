import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimulationHeader } from "@/components/simulation/simulation-header";

vi.mock("next/navigation", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: vi.fn().mockReturnValue({
			push: vi.fn(),
			replace: vi.fn(),
			refresh: vi.fn(),
			back: vi.fn(),
			forward: vi.fn(),
			prefetch: vi.fn(),
		}),
	};
});

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
				userEmail="student@test.com"
			/>,
		);

		expect(screen.getByText("Global Economics")).toBeInTheDocument();
		expect(screen.getByText("USA")).toBeInTheDocument();
		expect(screen.getByText("Negotiation 1")).toBeInTheDocument();
	});

	it("renders unassigned state when no team", () => {
		render(
			<SimulationHeader
				classRecord={classRecord as any}
				teamRecord={null}
				periods={periods}
				userEmail="student@test.com"
			/>,
		);

		expect(screen.getByText("Global Economics")).toBeInTheDocument();
		expect(screen.getByText("Unassigned")).toBeInTheDocument();
	});

	it("shows the profile menu with user initial", () => {
		render(
			<SimulationHeader
				classRecord={classRecord as any}
				teamRecord={{ id: "t1", country: "China" } as any}
				periods={periods}
				userEmail="student@test.com"
			/>,
		);

		expect(screen.getByLabelText("Profile menu")).toBeInTheDocument();
		expect(screen.getByText("S")).toBeInTheDocument();
	});

	it("shows exit simulation and theme toggle buttons", () => {
		render(
			<SimulationHeader
				classRecord={classRecord as any}
				teamRecord={{ id: "t1", country: "USA" } as any}
				periods={periods}
				userEmail="test@test.com"
			/>,
		);

		expect(screen.getByLabelText("Exit simulation")).toBeInTheDocument();
		expect(screen.getByLabelText(/Switch to .* mode/)).toBeInTheDocument();
	});
});
