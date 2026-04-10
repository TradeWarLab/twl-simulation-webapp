import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";

// We mock passing an action function
describe("SessionControlPanel Component", () => {
	const periods = [
		"Preparation",
		"Negotiation 1",
		"Review 1",
		"Negotiation 2",
		"Final Review",
	];

	it("renders correctly with current period", () => {
		const advanceAction = vi.fn();
		const goBackAction = vi.fn();

		render(
			<SessionControlPanel
				currentPeriod={1}
				periods={periods}
				advanceAction={advanceAction}
				goBackAction={goBackAction}
			/>,
		);

		expect(screen.getByText("Session Control")).toBeInTheDocument();
		expect(screen.getByText("Current Period")).toBeInTheDocument();
		// "2. Negotiation 1" because current period is 0-indexed
		expect(screen.getByText("2. Negotiation 1")).toBeInTheDocument();
	});

	it("disables the previous button when on the first period", () => {
		const advanceAction = vi.fn();
		const goBackAction = vi.fn();

		render(
			<SessionControlPanel
				currentPeriod={0}
				periods={periods}
				advanceAction={advanceAction}
				goBackAction={goBackAction}
			/>,
		);

		const prevBtn = screen.getByRole("button", { name: /Previous Period/i });
		expect(prevBtn).toBeDisabled();
	});

	it("updates button text when at the end of the simulation", () => {
		const advanceAction = vi.fn();
		const goBackAction = vi.fn();

		render(
			<SessionControlPanel
				currentPeriod={periods.length - 1} // Final Review
				periods={periods}
				advanceAction={advanceAction}
				goBackAction={goBackAction}
			/>,
		);

		const advanceBtn = screen.getByRole("button", { name: /End Simulation/i });
		expect(advanceBtn).toBeInTheDocument();
		// In this strict implementation, the advanceBtn disabled state bounds checks currentPeriod >= periods.length. So it remains enabled if currentPeriod == length - 1.
	});
});
