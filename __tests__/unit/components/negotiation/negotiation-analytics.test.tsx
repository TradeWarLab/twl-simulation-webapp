import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NegotiationAnalytics } from "@/components/negotiation/negotiation-analytics";
import type { TradeItem } from "@/lib/types/domain";
import { makeProposal, makeTradeItem } from "../../../helpers/realtime-fixtures";

// The component expects each item to carry a joined `team.country`, so wrap the
// base fixture to attach it.
function makeAnalyticsItem(
	overrides: Partial<TradeItem> & { country?: string } = {},
) {
	const { country = "USA", ...itemOverrides } = overrides;
	return { ...makeTradeItem(itemOverrides), team: { country } };
}

function makeData() {
	return {
		proposals: [makeProposal({ id: "p1", status: "executed" as const })],
		items: [
			makeAnalyticsItem({
				id: "usa-tariffs",
				issue_id: "iss-1",
				name: "Tariffs",
				value: 20,
				is_resolved: true,
				country: "USA",
			}),
			makeAnalyticsItem({
				id: "china-tariffs",
				team_id: "team-prc",
				issue_id: "iss-1",
				name: "Tariffs",
				value: -5,
				is_resolved: true,
				country: "China",
			}),
			// Unresolved → excluded from the Agreement tab, still shown under Reveal.
			makeAnalyticsItem({
				id: "usa-sanctions",
				issue_id: "iss-2",
				name: "Sanctions",
				value: 8,
				is_resolved: false,
				country: "USA",
			}),
		],
	};
}

describe("NegotiationAnalytics", () => {
	it("defaults to the Agreement tab and lists ratified clauses with totals", () => {
		render(<NegotiationAnalytics data={makeData()} />);

		expect(
			screen.getByRole("heading", { name: /final ratified clauses/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Tariffs")).toBeInTheDocument();

		// Only resolved items form clauses, so the totals reflect Tariffs alone.
		expect(screen.getByText("USA total")).toBeInTheDocument();
		expect(screen.getByText("PRC total")).toBeInTheDocument();
		// +20 shows for the USA clause value and the USA total; -5 for both China spots.
		expect(screen.getAllByText("+20").length).toBeGreaterThanOrEqual(2);
		expect(screen.getAllByText("-5").length).toBeGreaterThanOrEqual(2);

		// The unresolved item is not a ratified clause.
		expect(screen.queryByText("Sanctions")).not.toBeInTheDocument();
	});

	it("shows an empty state when no agreements were ratified", () => {
		const data = makeData();
		data.proposals = [makeProposal({ id: "p1", status: "pending" as const })];
		render(<NegotiationAnalytics data={data} />);

		expect(
			screen.getByText(/no agreements were ratified/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /final ratified clauses/i }),
		).not.toBeInTheDocument();
	});

	it("reveals both sides' values when switching to the Revealed Values tab", () => {
		render(<NegotiationAnalytics data={makeData()} />);

		fireEvent.click(screen.getByRole("button", { name: /revealed values/i }));

		expect(screen.getByText("USA Value")).toBeInTheDocument();
		expect(screen.getByText("PRC Value")).toBeInTheDocument();
		// Reveal groups every item, so the unresolved Sanctions issue appears here.
		expect(screen.getByText("Sanctions")).toBeInTheDocument();
		// USA valued Sanctions at 8; China never valued it, so it defaults to 0.
		expect(screen.getByText("+8")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();

		// The Agreement tab's content is unmounted after switching.
		expect(
			screen.queryByRole("heading", { name: /final ratified clauses/i }),
		).not.toBeInTheDocument();
	});
});
