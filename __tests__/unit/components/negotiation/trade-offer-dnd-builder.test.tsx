import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TradeOfferDndBuilder } from "@/components/negotiation/trade-offer-dnd-builder";

// Mock matchMedia for dnd-kit sensor
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe("TradeOfferDndBuilder Component", () => {
	const availableItems = [
		{ id: "item-1", name: "Soybeans", current_owner_id: "team-1", value: 50 },
	];
	const opponentItems = [
		{
			id: "item-2",
			name: "Microchips",
			current_owner_id: "team-2",
			value: 150,
		},
	];

	const baseProps = {
		classId: "cls-1",
		myTeamId: "team-1",
		opponentTeamId: "team-2",
		myTeamItems: availableItems as any,
		opponentTeamItems: opponentItems as any,
		myTeamCountry: "USA",
		opponentTeamCountry: "China",
	};

	it("renders item cards in corresponding lanes", () => {
		render(<TradeOfferDndBuilder {...baseProps} />);

		expect(screen.getByText("Soybeans")).toBeInTheDocument();
		expect(screen.getByText("Microchips")).toBeInTheDocument();

		expect(screen.getByText(/Items We Offer/i)).toBeInTheDocument();
		expect(screen.getByText(/Items We Request/i)).toBeInTheDocument();
	});

	it("displays submit button but disabled initially since offers are empty by default", () => {
		render(<TradeOfferDndBuilder {...baseProps} />);

		const submitButton = screen.getByRole("button", {
			name: "Submit Trade Offer",
		});
		expect(submitButton).toBeDisabled();
	});
});
