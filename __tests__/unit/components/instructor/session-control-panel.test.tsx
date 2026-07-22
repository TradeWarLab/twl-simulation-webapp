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
				status="active"
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
				status="active"
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

	it("labels the advance button by period", () => {
		const { rerender } = render(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={1}
				status="active"
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /advance to next period/i }),
		).toBeInTheDocument();

		rerender(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={periods.length - 2}
				status="active"
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /end simulation/i }),
		).toBeInTheDocument();
	});

	it("offers archiving at the final period, which ratification can reach on its own", () => {
		// finalize_ratified_package advances the class to the final period
		// (schema.sql:768-770). Before this, the button was disabled there, so a
		// class that actually reached a deal could never be archived.
		render(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={periods.length - 1}
				status="active"
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		const button = screen.getByRole("button", { name: /archive simulation/i });
		expect(button).toBeInTheDocument();
		expect(button).toBeEnabled();
	});

	it("disables the button only once the class is archived", () => {
		render(
			<SessionControlPanel
				classId="class-1"
				classCode="TWL-123456"
				currentPeriod={periods.length - 1}
				status="archived"
				periods={periods}
				advanceAction={vi.fn()}
				goBackAction={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /simulation archived/i }),
		).toBeDisabled();
	});
});
