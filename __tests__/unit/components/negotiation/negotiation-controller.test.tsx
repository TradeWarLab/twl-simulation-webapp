import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NegotiationController } from "@/components/negotiation/negotiation-controller";
import {
	createClassStore,
	type RealtimeSnapshot,
} from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import type { TradeProposal } from "@/lib/types/domain";

vi.mock("@/app/actions/deal-controller", () => ({
	addBoardItem: vi.fn(),
	removeBoardItem: vi.fn(),
	callForRatification: vi.fn(),
	withdrawRatificationCall: vi.fn(),
}));

const PACKAGE: TradeProposal = {
	id: "pkg-1",
	class_id: "class-1",
	proposing_team_id: "team-usa",
	receiving_team_id: "team-china",
	offered_items: [{ item_id: "item-1", name: "Steel Tariffs" }],
	requested_items: [],
	status: "pending",
	is_package: true,
	created_by: "user-9",
	created_at: "2026-07-04T00:00:00Z",
};

function snapshot(proposals: TradeProposal[] = []): RealtimeSnapshot {
	return {
		classRecord: {
			id: "class-1",
			name: "Test",
			class_code: "ABC",
			current_period: 2,
			status: "active",
		},
		teams: [
			{ id: "team-usa", country: "USA" },
			{ id: "team-china", country: "China" },
		],
		teamMemberCounts: { "team-usa": 2, "team-china": 2 },
		tradeItems: [],
		proposals,
		votes: [],
		messages: [],
		dealBoardItems: [],
		ratificationCalls: [],
	};
}

function renderController(proposals: TradeProposal[] = []) {
	const store = createClassStore(snapshot(proposals));
	return render(
		<ClassStoreContext.Provider value={store}>
			<NegotiationController
				classId="class-1"
				currentUserId="user-1"
				myTeamId="team-usa"
				opponentTeamId="team-china"
				myTeamCountry="USA"
				opponentTeamCountry="China"
			/>
		</ClassStoreContext.Provider>,
	);
}

describe("NegotiationController", () => {
	it("renders the shared deal board by default", () => {
		renderController();
		expect(screen.getByText(/shared deal board/i)).toBeInTheDocument();
		// The legacy builder is gone
		expect(screen.queryByText(/new trade proposal/i)).not.toBeInTheDocument();
	});

	it("shows the voting panel when a package vote is pending", () => {
		renderController([PACKAGE]);
		expect(screen.getByText(/final trade deal/i)).toBeInTheDocument();
	});

	it("shows the reset banner after a package is rejected", () => {
		renderController([{ ...PACKAGE, status: "rejected" }]);
		expect(
			screen.getByText(/deal was rejected — the board has been reset/i),
		).toBeInTheDocument();
	});
});
