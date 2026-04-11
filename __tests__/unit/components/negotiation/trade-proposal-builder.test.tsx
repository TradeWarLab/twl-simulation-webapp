import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TradeProposalBuilder } from "@/components/negotiation/trade-proposal-builder";

// We simply test that it mounts its child and can be interacted with.
describe("TradeProposalBuilder Component", () => {
	const _teamRecord = {
		id: "team-1",
		class_id: "cls-1",
		country: "USA",
		balance: 1000,
	};
	const _availableItems = [
		{
			id: "item-1",
			name: "Soybeans",
			description: "Agri",
			initial_owner_id: "team-1",
			current_owner_id: "team-1",
			value: 50,
		},
		{
			id: "item-2",
			name: "Microchips",
			description: "Tech",
			initial_owner_id: "team-2",
			current_owner_id: "team-2",
			value: 150,
		},
	];
	const _otherTeams = [
		{ id: "team-2", country: "China", class_id: "cls-1", balance: 2000 },
	];

	it("renders correctly", () => {
		render(
			<TradeProposalBuilder
				classId="cls-1"
				myTeamId="team-1"
				opponentTeamId="team-2"
				myTeamCountry="USA"
				opponentTeamCountry="China"
				myTeamItems={[]}
				opponentTeamItems={[]}
				proposals={[]}
				onProposalSelect={vi.fn()}
			/>,
		);

		// Verifies the child builder toggle appears
		expect(
			screen.getByRole("button", { name: /\+ New Trade Proposal/i }),
		).toBeInTheDocument();
	});
});
