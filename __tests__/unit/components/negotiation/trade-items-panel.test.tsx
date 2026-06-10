import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TradeItemsPanel } from "@/components/negotiation/trade-items-panel";
import {
	byName,
	createClassStore,
	upsertRow,
} from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import {
	makeSnapshot,
	makeTradeItem,
} from "../../../helpers/realtime-fixtures";

vi.mock("@/app/actions/trade-controller", () => ({
	updateTradeItemValue: vi.fn().mockResolvedValue({ success: true }),
}));

function setup() {
	const store = createClassStore(
		makeSnapshot({
			tradeItems: [
				makeTradeItem({ id: "a", name: "Tariffs", value: 10, role: "ask" }),
			],
		}),
	);
	render(
		<ClassStoreContext.Provider value={store}>
			<TradeItemsPanel classId="class-1" teamId="team-usa" isLocked={false} />
		</ClassStoreContext.Provider>,
	);
	return store;
}

describe("TradeItemsPanel (store-driven)", () => {
	it("renders items from the store and live-updates values", () => {
		const store = setup();
		const input = screen.getByLabelText("Tariffs") as HTMLInputElement;
		expect(input.value).toBe("10");
		act(() => {
			store.tradeItems.set(
				upsertRow(
					store.tradeItems.get(),
					makeTradeItem({ id: "a", name: "Tariffs", value: 33 }),
					byName,
				),
			);
		});
		expect(input.value).toBe("33");
	});

	it("keeps an in-progress edit when a different store value arrives", () => {
		const store = setup();
		const input = screen.getByLabelText("Tariffs") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "55" } });
		act(() => {
			store.tradeItems.set(
				upsertRow(
					store.tradeItems.get(),
					makeTradeItem({ id: "a", name: "Tariffs", value: 20 }),
					byName,
				),
			);
		});
		// the local edit wins until the store echoes it back
		expect(input.value).toBe("55");
	});

	it("releases the local edit once the store catches up", () => {
		const store = setup();
		const input = screen.getByLabelText("Tariffs") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "55" } });
		act(() => {
			store.tradeItems.set(
				upsertRow(
					store.tradeItems.get(),
					makeTradeItem({ id: "a", name: "Tariffs", value: 55 }),
					byName,
				),
			);
		});
		expect(input.value).toBe("55");
		// later live updates flow through again
		act(() => {
			store.tradeItems.set(
				upsertRow(
					store.tradeItems.get(),
					makeTradeItem({ id: "a", name: "Tariffs", value: 60 }),
					byName,
				),
			);
		});
		expect(input.value).toBe("60");
	});

	it("submits the validated value on blur", async () => {
		const { updateTradeItemValue } = await import(
			"@/app/actions/trade-controller"
		);
		setup();
		const input = screen.getByLabelText("Tariffs") as HTMLInputElement;
		// asks are forced positive
		fireEvent.change(input, { target: { value: "-12" } });
		fireEvent.blur(input);
		await act(async () => {});
		expect(updateTradeItemValue).toHaveBeenCalledWith("a", "class-1", 12);
	});
});
