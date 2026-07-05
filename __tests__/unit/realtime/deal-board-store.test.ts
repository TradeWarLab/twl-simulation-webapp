import { describe, expect, it } from "vitest";
import {
	applyRowEvent,
	byCreatedAt,
	createClassStore,
	type RealtimeSnapshot,
} from "@/lib/realtime/class-store";
import type { DealBoardItem } from "@/lib/types/domain";

const BOARD_ROW: DealBoardItem = {
	id: "board-1",
	class_id: "class-1",
	item_id: "item-1",
	issue_id: "issue-1",
	name: "Steel Tariffs",
	giving_team_id: "team-usa",
	added_by_team_id: "team-usa",
	added_by: "user-1",
	created_at: "2026-07-04T00:00:00Z",
};

function baseSnapshot(): RealtimeSnapshot {
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
		teamMemberCounts: { "team-usa": 1, "team-china": 1 },
		tradeItems: [],
		proposals: [],
		votes: [],
		messages: [],
		dealBoardItems: [BOARD_ROW],
		ratificationCalls: [],
	};
}

describe("class store — deal board slices", () => {
	it("hydrates board items and ratification calls from the snapshot", () => {
		const store = createClassStore(baseSnapshot());
		expect(store.dealBoardItems.get()).toEqual([BOARD_ROW]);
		expect(store.ratificationCalls.get()).toEqual([]);
	});

	it("applies INSERT and DELETE row events to the board slice", () => {
		const store = createClassStore({ ...baseSnapshot(), dealBoardItems: [] });

		applyRowEvent(store.dealBoardItems, "INSERT", BOARD_ROW, null, byCreatedAt);
		expect(store.dealBoardItems.get()).toHaveLength(1);

		applyRowEvent(store.dealBoardItems, "DELETE", null, "board-1", byCreatedAt);
		expect(store.dealBoardItems.get()).toHaveLength(0);
	});

	it("re-hydrates both slices on reconnect resync", () => {
		const store = createClassStore(baseSnapshot());
		store.hydrate({
			...baseSnapshot(),
			dealBoardItems: [],
			ratificationCalls: [],
		});
		expect(store.dealBoardItems.get()).toEqual([]);
	});
});
