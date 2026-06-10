import { describe, expect, it, vi } from "vitest";
import {
	applyRowEvent,
	byName,
	createClassStore,
	createSlice,
	type RealtimeSnapshot,
	removeRow,
	upsertRow,
} from "@/lib/realtime/class-store";
import type { TradeItem } from "@/lib/types/domain";

function makeItem(overrides: Partial<TradeItem> = {}): TradeItem {
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

function makeSnapshot(
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

describe("createSlice", () => {
	it("returns the initial value and notifies subscribers on set", () => {
		const slice = createSlice(1);
		const listener = vi.fn();
		slice.subscribe(listener);
		expect(slice.get()).toBe(1);
		slice.set(2);
		expect(slice.get()).toBe(2);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("does not notify when set with an identical value", () => {
		const slice = createSlice(1);
		const listener = vi.fn();
		slice.subscribe(listener);
		slice.set(1);
		expect(listener).not.toHaveBeenCalled();
	});

	it("stops notifying after unsubscribe", () => {
		const slice = createSlice(1);
		const listener = vi.fn();
		const unsubscribe = slice.subscribe(listener);
		unsubscribe();
		slice.set(2);
		expect(listener).not.toHaveBeenCalled();
	});
});

describe("upsertRow / removeRow", () => {
	it("inserts a new row sorted by the comparator", () => {
		const a = makeItem({ id: "a", name: "Beta" });
		const b = makeItem({ id: "b", name: "Alpha" });
		const result = upsertRow([a], b, byName);
		expect(result.map((r) => r.id)).toEqual(["b", "a"]);
	});

	it("merges into an existing row by id", () => {
		const a = makeItem({ id: "a", value: 10 });
		const result = upsertRow([a], makeItem({ id: "a", value: 25 }), byName);
		expect(result).toHaveLength(1);
		expect(result[0].value).toBe(25);
	});

	it("removeRow drops the matching id and returns the same array when absent", () => {
		const a = makeItem({ id: "a" });
		const rows = [a];
		expect(removeRow(rows, "a")).toEqual([]);
		expect(removeRow(rows, "zzz")).toBe(rows);
	});
});

describe("applyRowEvent", () => {
	it("applies INSERT, UPDATE, and DELETE to a slice", () => {
		const slice = createSlice<TradeItem[]>([]);
		applyRowEvent(slice, "INSERT", makeItem({ id: "a" }), null, byName);
		expect(slice.get()).toHaveLength(1);
		applyRowEvent(
			slice,
			"UPDATE",
			makeItem({ id: "a", value: 99 }),
			null,
			byName,
		);
		expect(slice.get()[0].value).toBe(99);
		applyRowEvent(slice, "DELETE", null, "a", byName);
		expect(slice.get()).toHaveLength(0);
	});

	it("ignores DELETE without an old row id", () => {
		const slice = createSlice<TradeItem[]>([makeItem({ id: "a" })]);
		applyRowEvent(slice, "DELETE", null, null, byName);
		expect(slice.get()).toHaveLength(1);
	});
});

describe("createClassStore", () => {
	it("seeds slices sorted and exposes static team data", () => {
		const store = createClassStore(
			makeSnapshot({
				tradeItems: [
					makeItem({ id: "b", name: "Zinc" }),
					makeItem({ id: "a", name: "Apples" }),
				],
			}),
		);
		expect(store.tradeItems.get().map((i) => i.name)).toEqual([
			"Apples",
			"Zinc",
		]);
		expect(store.teams).toHaveLength(2);
		expect(store.teamMemberCounts["team-prc"]).toBe(3);
	});

	it("seeds userNames from snapshot vote and message joins", () => {
		const store = createClassStore(
			makeSnapshot({
				votes: [
					{
						id: "v1",
						proposal_id: "p1",
						user_id: "u1",
						team_id: "team-usa",
						vote: "approve",
						created_at: "2026-01-01T00:00:00Z",
						user: { full_name: "Ada" },
					},
				],
				messages: [
					{
						id: "m1",
						class_id: "class-1",
						sender_id: "u2",
						channel: "global",
						content: "hi",
						created_at: "2026-01-01T00:00:00Z",
						users: { full_name: "Bob" },
					},
				],
			}),
		);
		expect(store.userNames.get().get("u1")).toBe("Ada");
		expect(store.userNames.get().get("u2")).toBe("Bob");
	});

	it("hydrate replaces slice contents and notifies", () => {
		const store = createClassStore(makeSnapshot());
		const listener = vi.fn();
		store.tradeItems.subscribe(listener);
		store.hydrate(makeSnapshot({ tradeItems: [makeItem({ id: "x" })] }));
		expect(store.tradeItems.get()).toHaveLength(1);
		expect(listener).toHaveBeenCalled();
	});

	it("cacheUserName adds names to the cache", () => {
		const store = createClassStore(makeSnapshot());
		store.cacheUserName("u9", "Zoe");
		expect(store.userNames.get().get("u9")).toBe("Zoe");
	});
});
