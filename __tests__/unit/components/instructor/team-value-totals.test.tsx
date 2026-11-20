import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamValueTotals } from "@/components/instructor/team-value-totals";

describe("TeamValueTotals", () => {
	it("sums asks and concessions against their targets", () => {
		render(
			<TeamValueTotals
				items={[
					{ role: "ask", value: 40 },
					{ role: "ask", value: 25 },
					{ role: "concession", value: -100 },
				]}
			/>,
		);

		expect(screen.getByText("65 / 100")).toBeInTheDocument();
		expect(screen.getByText("-100 / -100")).toHaveClass("text-emerald-700");
	});

	it("marks a total that goes past its target", () => {
		render(<TeamValueTotals items={[{ role: "ask", value: 120 }]} />);

		expect(screen.getByText("120 / 100")).toHaveClass("text-red-700");
		expect(screen.getByText("0 / -100")).toBeInTheDocument();
	});
});
