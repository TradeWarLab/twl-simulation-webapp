import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InstructorGuide } from "@/components/instructor/instructor-guide";
import { SIMULATION_PERIODS } from "@/lib/constants";

describe("InstructorGuide", () => {
	it("welcomes the instructor and states the round structure", () => {
		render(<InstructorGuide />);
		expect(screen.getByText(/two 50-minute rounds/i)).toBeInTheDocument();
	});

	it("names every simulation period, so the guide cannot drift from the app", () => {
		render(<InstructorGuide />);
		for (const period of SIMULATION_PERIODS) {
			expect(screen.getAllByText(new RegExp(period, "i")).length).toBeGreaterThan(0);
		}
	});

	it("uses the run-guide role labels, not the stored values", () => {
		render(<InstructorGuide />);
		// getAllByText, not getByText: the "National Security" label and the
		// blurb "…national security concerns tied to economic issues…" both match.
		expect(screen.getAllByText(/globalist/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/protectionist/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/national security/i).length).toBeGreaterThan(0);
		expect(screen.queryByText(/pro-decoupling/i)).not.toBeInTheDocument();
	});

	it("explains the point budgets for both scales", () => {
		render(<InstructorGuide />);
		expect(screen.getByText(/100 positive points/i)).toBeInTheDocument();
		expect(screen.getByText(/-100 points/i)).toBeInTheDocument();
	});

	it("states the unanimity rule and the randomized failure cost", () => {
		render(<InstructorGuide />);
		expect(
			screen.getByText(/every student on both teams must vote yes/i),
		).toBeInTheDocument();
		expect(screen.getByText("no-deal cost")).toBeInTheDocument();
		expect(screen.getByText(/you cannot change it/i)).toBeInTheDocument();
	});

	it("hides the documentary link when no URL is configured", () => {
		render(<InstructorGuide />);
		expect(
			screen.queryByRole("link", { name: /documentary/i }),
		).not.toBeInTheDocument();
	});
});
