import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
	byName,
	createClassStore,
	upsertRow,
} from "@/lib/realtime/class-store";
import {
	ClassStoreContext,
	useClassRecord,
	useMessages,
	useTradeItems,
	useVotes,
} from "@/lib/realtime/hooks";
import {
	makeMessage,
	makeSnapshot,
	makeTradeItem,
	makeVote,
} from "../../helpers/realtime-fixtures";

function wrapperFor(store: ReturnType<typeof createClassStore>) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClassStoreContext.Provider value={store}>
				{children}
			</ClassStoreContext.Provider>
		);
	};
}

describe("realtime hooks", () => {
	it("useTradeItems returns all items, or filters by team", () => {
		const store = createClassStore(
			makeSnapshot({
				tradeItems: [
					makeTradeItem({ id: "a", team_id: "team-usa" }),
					makeTradeItem({ id: "b", team_id: "team-prc", name: "Zinc" }),
				],
			}),
		);
		const all = renderHook(() => useTradeItems(), {
			wrapper: wrapperFor(store),
		});
		expect(all.result.current).toHaveLength(2);
		const filtered = renderHook(() => useTradeItems("team-prc"), {
			wrapper: wrapperFor(store),
		});
		expect(filtered.result.current.map((i) => i.id)).toEqual(["b"]);
	});

	it("re-renders with new values when the slice changes", () => {
		const store = createClassStore(makeSnapshot());
		const { result } = renderHook(() => useTradeItems(), {
			wrapper: wrapperFor(store),
		});
		expect(result.current).toHaveLength(0);
		act(() => {
			store.tradeItems.set(
				upsertRow(store.tradeItems.get(), makeTradeItem({ id: "n" }), byName),
			);
		});
		expect(result.current).toHaveLength(1);
	});

	it("useVotes filters by proposal id and useMessages by channel", () => {
		const store = createClassStore(
			makeSnapshot({
				votes: [
					makeVote({ id: "v1", proposal_id: "p1" }),
					makeVote({ id: "v2", proposal_id: "p2" }),
				],
				messages: [
					makeMessage({ id: "m1", channel: "team_usa" }),
					makeMessage({ id: "m2", channel: "global" }),
				],
			}),
		);
		const votes = renderHook(() => useVotes("p2"), {
			wrapper: wrapperFor(store),
		});
		expect(votes.result.current.map((v) => v.id)).toEqual(["v2"]);
		const messages = renderHook(() => useMessages("global"), {
			wrapper: wrapperFor(store),
		});
		expect(messages.result.current.map((m) => m.id)).toEqual(["m2"]);
	});

	it("useClassRecord exposes the live class record", () => {
		const store = createClassStore(makeSnapshot());
		const { result } = renderHook(() => useClassRecord(), {
			wrapper: wrapperFor(store),
		});
		expect(result.current.current_period).toBe(1);
		act(() => {
			store.classRecord.set({ ...store.classRecord.get(), current_period: 2 });
		});
		expect(result.current.current_period).toBe(2);
	});

	it("throws when used outside the provider", () => {
		expect(() => renderHook(() => useClassRecord())).toThrow(
			/RealtimeClassProvider/,
		);
	});
});
