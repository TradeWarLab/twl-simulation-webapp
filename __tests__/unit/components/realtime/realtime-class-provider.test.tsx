import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClassProvider } from "@/components/realtime/realtime-class-provider";
import { useClassRecord, useTradeItems, useVotes } from "@/lib/realtime/hooks";
import {
	makeSnapshot,
	makeTradeItem,
	makeVote,
} from "../../../helpers/realtime-fixtures";
import { mockClient } from "../../../helpers/supabase-mock";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: refreshMock }),
}));

type CapturedHandler = {
	filter: { table: string; event: string };
	callback: (payload: Record<string, unknown>) => void;
};

let handlers: CapturedHandler[] = [];
let subscribeCallback: ((status: string) => void) | null = null;

const channelStub = {
	on: vi.fn(
		(
			_type: string,
			filter: CapturedHandler["filter"],
			callback: CapturedHandler["callback"],
		) => {
			handlers.push({ filter, callback });
			return channelStub;
		},
	),
	subscribe: vi.fn((cb?: (status: string) => void) => {
		subscribeCallback = cb ?? null;
		return channelStub;
	}),
};

function emit(table: string, payload: Record<string, unknown>) {
	for (const handler of handlers.filter((h) => h.filter.table === table)) {
		handler.callback(payload);
	}
}

function Probe() {
	const classRecord = useClassRecord();
	const items = useTradeItems();
	const votes = useVotes();
	return (
		<div data-testid="probe">
			period:{classRecord.current_period};items:
			{items.map((i) => `${i.name}=${i.value}`).join(",")};votes:{votes.length}
		</div>
	);
}

describe("RealtimeClassProvider", () => {
	beforeEach(() => {
		handlers = [];
		subscribeCallback = null;
		refreshMock.mockClear();
		channelStub.on.mockClear();
		channelStub.subscribe.mockClear();
		mockClient.channel.mockReturnValue(channelStub);
	});

	function renderProvider(
		refetchSnapshot?: (classId: string) => Promise<never>,
	) {
		return render(
			<RealtimeClassProvider
				classId="class-1"
				snapshot={makeSnapshot({
					tradeItems: [makeTradeItem({ id: "a", name: "Tariffs", value: 10 })],
				})}
				refetchSnapshot={refetchSnapshot}
			>
				<Probe />
			</RealtimeClassProvider>,
		);
	}

	it("opens one channel and subscribes", () => {
		renderProvider();
		expect(mockClient.channel).toHaveBeenCalledTimes(1);
		expect(mockClient.channel).toHaveBeenCalledWith("class:class-1");
		expect(channelStub.subscribe).toHaveBeenCalledTimes(1);
	});

	it("applies trade_items UPDATE and DELETE to the store", () => {
		renderProvider();
		act(() => {
			emit("trade_items", {
				eventType: "UPDATE",
				new: makeTradeItem({ id: "a", name: "Tariffs", value: 42 }),
				old: { id: "a" },
			});
		});
		expect(screen.getByTestId("probe").textContent).toContain("Tariffs=42");
		act(() => {
			emit("trade_items", { eventType: "DELETE", new: {}, old: { id: "a" } });
		});
		expect(screen.getByTestId("probe").textContent).toContain("items:;");
	});

	it("refreshes the router only when current_period changes", () => {
		renderProvider();
		act(() => {
			emit("classes", {
				eventType: "UPDATE",
				new: { id: "class-1", name: "Renamed", current_period: 1 },
				old: {},
			});
		});
		expect(refreshMock).not.toHaveBeenCalled();
		act(() => {
			emit("classes", {
				eventType: "UPDATE",
				new: { id: "class-1", current_period: 2 },
				old: {},
			});
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("probe").textContent).toContain("period:2");
	});

	it("ignores votes from teams outside this class", () => {
		renderProvider();
		act(() => {
			emit("votes", {
				eventType: "INSERT",
				new: makeVote({ id: "v-out", team_id: "team-elsewhere" }),
				old: {},
			});
			emit("votes", {
				eventType: "INSERT",
				new: makeVote({ id: "v-in", team_id: "team-usa" }),
				old: {},
			});
		});
		expect(screen.getByTestId("probe").textContent).toContain("votes:1");
	});

	it("removes the channel on unmount", () => {
		const { unmount } = renderProvider();
		unmount();
		expect(mockClient.removeChannel).toHaveBeenCalled();
	});

	it("rehydrates from refetchSnapshot after a dropped connection resubscribes", async () => {
		const fresh = makeSnapshot({
			tradeItems: [makeTradeItem({ id: "z", name: "Fresh", value: 7 })],
		});
		const refetch = vi.fn().mockResolvedValue(fresh);
		renderProvider(refetch as never);
		await act(async () => {
			subscribeCallback?.("CHANNEL_ERROR");
			subscribeCallback?.("SUBSCRIBED");
			await Promise.resolve();
		});
		expect(refetch).toHaveBeenCalledWith("class-1");
		expect(screen.getByTestId("probe").textContent).toContain("Fresh=7");
	});
});
