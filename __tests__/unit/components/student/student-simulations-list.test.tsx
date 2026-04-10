import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentSimulationsList } from "@/components/student/student-simulations-list";

describe("StudentSimulationsList Component", () => {
	it("renders empty state correctly", () => {
		render(<StudentSimulationsList enrolledClasses={[]} />);
		expect(screen.getByText(/My Simulations/i)).toBeInTheDocument();
		expect(
			screen.getByText(/You are not enrolled in any simulations yet/i),
		).toBeInTheDocument();
	});

	it("renders list of enrolled classes correctly", () => {
		const mockClasses = [
			{
				id: "1",
				name: "History 101",
				status: "active",
				class_id: "cls-1",
				team_id: "team-1",
				team_country: "USA",
			},
			{
				id: "2",
				name: "Econ 201",
				status: "setup",
				class_id: "cls-2",
				team_id: null,
				team_country: null,
			},
		];

		render(<StudentSimulationsList enrolledClasses={mockClasses} />);

		expect(screen.getByText("History 101")).toBeInTheDocument();
		expect(screen.getByText("Econ 201")).toBeInTheDocument();

		// Team country checking
		expect(screen.getByText(/USA/)).toBeInTheDocument();
		expect(screen.getByText(/Econ 201/)).toBeInTheDocument();

		// Ensure buttons correct route link
		const links = screen.getAllByRole("link");
		expect(links[0]).toHaveAttribute("href", "/student/simulation/1");
		expect(links[1]).toHaveAttribute("href", "/student/simulation/2");
	});
});
