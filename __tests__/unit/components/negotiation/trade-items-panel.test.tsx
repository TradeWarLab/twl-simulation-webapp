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

function setup(country: "USA" | "China" = "USA", noDealCost = -10) {
	const store = createClassStore(
		makeSnapshot({
			tradeItems: [
				makeTradeItem({ id: "a", name: "Tariffs", value: 10, role: "ask" }),
			],
		}),
	);
	render(
		<ClassStoreContext.Provider value={store}>
			<TradeItemsPanel
				classId="class-1"
				teamId="team-usa"
				country={country}
				noDealCost={noDealCost}
				isLocked={false}
			/>
		</ClassStoreContext.Provider>,
	);
	return store;
}

describe("TradeItemsPanel cost briefing", () => {
	it("gives the USA delegation the USTR wording and its own cost", () => {
		setup("USA", 0);
		expect(screen.getByText(/USTR analysts/)).toBeInTheDocument();
		expect(screen.getByText(/The Chinese team/)).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("gives the China delegation the MOFCOM wording and its own cost", () => {
		// Not -20 or -5: the briefing's range sentence already shows those.
		setup("China", -10);
		expect(screen.getByText(/MOFCOM analysts/)).toBeInTheDocument();
		expect(screen.getByText(/The American team/)).toBeInTheDocument();
		expect(screen.getByText("-10")).toBeInTheDocument();
	});
});

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
