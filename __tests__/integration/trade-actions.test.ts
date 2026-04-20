import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getTeamTradeItems,
	initializeTradeItems,
	updateTradeItemValue,
} from "@/app/actions/trade-controller";
import { mockClient } from "../helpers/supabase-mock";

describe("Trade Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getTeamTradeItems", () => {
		it("returns empty array if unauthorized", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

			const items = await getTeamTradeItems("class-1", "team-a");
			expect(items).toEqual([]);
		});

		it("queries and returns items", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			const mockData = [{ id: "item-1", name: "Steel", value: 10 }];

			const orderMock = vi
				.fn()
				.mockResolvedValue({ data: mockData, error: null });
			const eqTeamMock = vi.fn().mockReturnValue({ order: orderMock });
			const eqClassMock = vi.fn().mockReturnValue({ eq: eqTeamMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqClassMock });

			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const items = await getTeamTradeItems("class-1", "team-a");

			expect(selectMock).toHaveBeenCalledWith("*");
			expect(eqClassMock).toHaveBeenCalledWith("class_id", "class-1");
			expect(eqTeamMock).toHaveBeenCalledWith("team_id", "team-a");
			expect(items).toEqual(mockData);
		});
	});

	describe("updateTradeItemValue", () => {
		it("returns error if unauthorized", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

			const result = await updateTradeItemValue("item-1", "class-1", 15);
			expect(result).toEqual({ error: "Unauthorized" });
		});

		it("updates value and revalidates path", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ update: updateMock } as any);

			const result = await updateTradeItemValue("item-1", "class-1", 20);

			expect(updateMock).toHaveBeenCalledWith({ value: 20 });
			expect(eqMock).toHaveBeenCalledWith("id", "item-1");
			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/student/simulation/class-1",
			);
		});
	});

	describe("initializeTradeItems", () => {
		it("returns error if unauthorized", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

			const result = await initializeTradeItems("c1", "t1", [
				{ name: "A", value: 1 },
			]);
			expect(result).toEqual({ error: "Unauthorized" });
		});

		it("inserts multiple items and revalidates path", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-prog" } },
			});

			const insertMock = vi.fn().mockResolvedValue({ error: null });
			mockClient.from.mockReturnValue({ insert: insertMock } as any);

			const itemsToInit = [
				{ name: "Gold", value: 50 },
				{ name: "Silver", value: 20 },
			];

			const result = await initializeTradeItems(
				"class-9",
				"team-x",
				itemsToInit,
			);

			expect(insertMock).toHaveBeenCalledWith([
				{ class_id: "class-9", team_id: "team-x", name: "Gold", value: 50 },
				{ class_id: "class-9", team_id: "team-x", name: "Silver", value: 20 },
			]);
			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/instructor/classes/class-9",
			);
		});
	});
});
