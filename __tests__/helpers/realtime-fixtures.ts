import type { Message } from "@/app/actions/chat";
import type { RealtimeSnapshot } from "@/lib/realtime/class-store";
import type { TradeItem, TradeProposal, Vote } from "@/lib/types/domain";

export function makeSnapshot(
	overrides: Partial<RealtimeSnapshot> = {},
): RealtimeSnapshot {
	return {
		classRecord: {
			id: "class-1",
			name: "Test Class",
			class_code: "ABC123",
			current_period: 1,
			status: "active",
		},
		teams: [
			{ id: "team-usa", country: "USA" },
			{ id: "team-prc", country: "China" },
		],
		teamMemberCounts: { "team-usa": 2, "team-prc": 3 },
		tradeItems: [],
		proposals: [],
		votes: [],
		messages: [],
		...overrides,
	};
}

export function makeTradeItem(overrides: Partial<TradeItem> = {}): TradeItem {
	return {
		id: "item-1",
		class_id: "class-1",
		team_id: "team-usa",
		issue_id: null,
		name: "Tariffs",
		value: 10,
		role: "ask",
		is_resolved: false,
		created_at: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

export function makeProposal(
	overrides: Partial<TradeProposal> = {},
): TradeProposal {
	return {
		id: "p1",
		class_id: "class-1",
		proposing_team_id: "team-usa",
		receiving_team_id: "team-prc",
		offered_items: [],
		requested_items: [],
		status: "pending",
		created_by: "u1",
		created_at: "2026-01-02T00:00:00Z",
		...overrides,
	};
}

export function makeVote(overrides: Partial<Vote> = {}): Vote {
	return {
		id: "v1",
		proposal_id: "p1",
		user_id: "u1",
		team_id: "team-usa",
		vote: "approve",
		created_at: "2026-01-02T01:00:00Z",
		...overrides,
	};
}

export function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		id: "m1",
		class_id: "class-1",
		sender_id: "u1",
		channel: "global",
		content: "hello",
		created_at: "2026-01-01T00:00:00Z",
		...overrides,
	};
}
