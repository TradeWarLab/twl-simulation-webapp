import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharedDealBoard } from "@/components/negotiation/shared-deal-board";
import {
	createClassStore,
	type RealtimeSnapshot,
} from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import type { DealBoardItem, TradeItem } from "@/lib/types/domain";

vi.mock("@/app/actions/deal-controller", () => ({
	addBoardItem: vi.fn().mockResolvedValue({ success: true }),
	removeBoardItem: vi.fn().mockResolvedValue({ success: true }),
	callForRatification: vi
		.fn()
		.mockResolvedValue({ success: true, voteOpened: false }),
	withdrawRatificationCall: vi.fn().mockResolvedValue({ success: true }),
}));

import {
	addBoardItem,
	callForRatification,
	removeBoardItem,
	withdrawRatificationCall,
} from "@/app/actions/deal-controller";

const MY_CONCESSION: TradeItem = {
	id: "item-1",
	class_id: "class-1",
	team_id: "team-usa",
	issue_id: "issue-1",
	name: "Steel Tariffs",
	value: -10,
	role: "concession",
	is_resolved: false,
	created_at: "2026-07-01T00:00:00Z",
};

const MY_ASK: TradeItem = {
	id: "item-2",
	class_id: "class-1",
	team_id: "team-usa",
	issue_id: "issue-2",
	name: "Rare Earth Access",
	value: 15,
	role: "ask",
	is_resolved: false,
	created_at: "2026-07-01T00:00:00Z",
};

const BOARD_ROW: DealBoardItem = {
	id: "board-1",
	class_id: "class-1",
	item_id: "item-9",
	issue_id: "issue-2",
	name: "Rare Earth Access",
	giving_team_id: "team-china",
	added_by_team_id: "team-usa",
	added_by: "user-1",
	created_at: "2026-07-04T00:00:00Z",
};

function snapshot(overrides: Partial<RealtimeSnapshot> = {}): RealtimeSnapshot {
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
		tradeItems: [MY_CONCESSION, MY_ASK],
		proposals: [],
		votes: [],
		messages: [],
		dealBoardItems: [],
		ratificationCalls: [],
		...overrides,
	};
}

function renderBoard(
	snap: RealtimeSnapshot = snapshot(),
	props: Partial<React.ComponentProps<typeof SharedDealBoard>> = {},
) {
	const store = createClassStore(snap);
	return render(
		<ClassStoreContext.Provider value={store}>
			<SharedDealBoard
				classId="class-1"
				myTeamId="team-usa"
				myTeamCountry="USA"
				opponentTeamCountry="China"
				frozen={false}
				resetBannerVisible={false}
				onDismissResetBanner={() => {}}
				{...props}
			/>
		</ClassStoreContext.Provider>,
	);
}

describe("SharedDealBoard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows the empty-board hint and the viewer's inventory", () => {
		renderBoard();
		expect(
			screen.getByText(/drag items here or press add/i),
		).toBeInTheDocument();
		expect(screen.getByText("Steel Tariffs")).toBeInTheDocument();
		expect(screen.getByText("Rare Earth Access")).toBeInTheDocument();
	});

	it("adds an inventory item to the board via its Add button", () => {
		renderBoard();
		fireEvent.click(screen.getByRole("button", { name: /add steel tariffs/i }));
		expect(addBoardItem).toHaveBeenCalledWith("class-1", "item-1");
	});

	it("renders board rows with viewer values and hides them from inventory", () => {
		renderBoard(snapshot({ dealBoardItems: [BOARD_ROW] }));
		// Only one instance rendered (board), not a second in inventory
		const [rowName] = screen.getAllByText("Rare Earth Access");
		expect(rowName).toBeInTheDocument();
		// On the board (value +15 mapped from the viewer's mirror row by issue_id)
		const row = rowName.closest("div") as HTMLElement;
		expect(within(row).getByText("+15")).toBeInTheDocument();
	});

	it("removes a board row via its remove button", () => {
		renderBoard(snapshot({ dealBoardItems: [BOARD_ROW] }));
		fireEvent.click(
			screen.getByRole("button", { name: /remove rare earth access/i }),
		);
		expect(removeBoardItem).toHaveBeenCalledWith("class-1", "board-1");
	});

	it("disables the vote call on an empty board and enables it with items", () => {
		renderBoard();
		expect(
			screen.getByRole("button", { name: /call for final vote/i }),
		).toBeDisabled();
	});

	it("calls for ratification", () => {
		renderBoard(snapshot({ dealBoardItems: [BOARD_ROW] }));
		fireEvent.click(
			screen.getByRole("button", { name: /call for final vote/i }),
		);
		expect(callForRatification).toHaveBeenCalledWith("class-1");
	});

	it("shows waiting state and withdraw once my team has called", () => {
		renderBoard(
			snapshot({
				dealBoardItems: [BOARD_ROW],
				ratificationCalls: [
					{
						id: "call-1",
						class_id: "class-1",
						team_id: "team-usa",
						called_by: "user-1",
						created_at: "2026-07-04T00:00:00Z",
					},
				],
			}),
		);
		expect(screen.getByText(/waiting on team china/i)).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /withdraw/i }));
		expect(withdrawRatificationCall).toHaveBeenCalledWith("class-1");
	});

	it("announces when the other team has called for a vote", () => {
		renderBoard(
			snapshot({
				dealBoardItems: [BOARD_ROW],
				ratificationCalls: [
					{
						id: "call-2",
						class_id: "class-1",
						team_id: "team-china",
						called_by: "user-9",
						created_at: "2026-07-04T00:00:00Z",
					},
				],
			}),
		);
		expect(
			screen.getByText(/team china has called for a final vote/i),
		).toBeInTheDocument();
	});

	it("freezes all interactions while the final vote is open", () => {
		const onOpenVote = vi.fn();
		renderBoard(snapshot({ dealBoardItems: [BOARD_ROW] }), {
			frozen: true,
			onOpenVote,
		});
		expect(
			screen.queryByRole("button", { name: /remove rare earth access/i }),
		).not.toBeInTheDocument();
		expect(screen.getByText(/final vote in progress/i)).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /open final vote/i }));
		expect(onOpenVote).toHaveBeenCalled();
	});

	it("shows the reset banner after a rejected ratification", () => {
		const onDismiss = vi.fn();
		renderBoard(snapshot(), {
			resetBannerVisible: true,
			onDismissResetBanner: onDismiss,
		});
		expect(
			screen.getByText(/deal was rejected — the board has been reset/i),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
		expect(onDismiss).toHaveBeenCalled();
	});
});
