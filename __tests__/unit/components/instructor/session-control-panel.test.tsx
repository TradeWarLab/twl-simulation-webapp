import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";

describe("SessionControlPanel", () => {
	const periods = [
		"Preparation",
		"Domestic Negotiation",
		"Bilateral Negotiation",
		"Final Review",
	];

	it("renders the merged session controls, quick actions, and class code", () => {
		render(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={1}
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(screen.getByText("Session Control")).toBeInTheDocument();
		expect(screen.getByText("Current Period")).toBeInTheDocument();
		expect(screen.getByText("2. Domestic Negotiation")).toBeInTheDocument();
		expect(screen.getByText("Quick Actions")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Briefings" })).toHaveAttribute(
			"href",
			"/instructor/classes/class-1/briefings",
		);
		expect(screen.getByRole("link", { name: "Trade Items" })).toHaveAttribute(
			"href",
			"/instructor/classes/class-1/items",
		);
		expect(screen.getByRole("link", { name: "Full Log" })).toHaveAttribute(
			"href",
			"/instructor/classes/class-1/log",
		);
		expect(screen.getByText("Class Code")).toBeInTheDocument();
		expect(screen.getByText("TWL-123456")).toBeInTheDocument();
	});

	it("disables previous at the first period and shows unavailable code fallback", () => {
		render(
			<SessionControlPanel
				classId="class-1"
				classCode={null}
				currentPeriod={0}
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /previous period/i }),
		).toBeDisabled();
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
	});

	it("switches the advance button label near the final period and disables it at the end", () => {
		const { rerender } = render(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={periods.length - 2}
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /end simulation/i }),
		).toBeInTheDocument();

		rerender(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={periods.length - 1}
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /end simulation/i }),
		).toBeDisabled();
	});
});
