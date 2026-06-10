import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteBriefing,
	getClassBriefings,
	getStudentBriefings,
} from "@/app/actions/briefings";
import { mockClient } from "../helpers/supabase-mock";

describe("Briefing Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getClassBriefings", () => {
		it("returns empty array if user is not authenticated", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: null },
			});

			const result = await getClassBriefings("class-1");
			expect(result).toEqual([]);
		});

		it("returns briefings for a class", async () => {
			const briefings = [
				{ id: "b1", title: "USA Briefing", class_id: "class-1" },
				{ id: "b2", title: "China Briefing", class_id: "class-1" },
			];

			const orderMock = vi
				.fn()
				.mockResolvedValue({ data: briefings, error: null });
			const eqMock = vi.fn().mockReturnValue({ order: orderMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const result = await getClassBriefings("class-1");

			expect(mockClient.from).toHaveBeenCalledWith("briefings");
			expect(selectMock).toHaveBeenCalledWith("*");
			expect(eqMock).toHaveBeenCalledWith("class_id", "class-1");
			expect(result).toEqual(briefings);
		});

		it("returns empty array on query error", async () => {
			const orderMock = vi
				.fn()
				.mockResolvedValue({ data: null, error: { message: "DB error" } });
			const eqMock = vi.fn().mockReturnValue({ order: orderMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const result = await getClassBriefings("class-1");
			expect(result).toEqual([]);
		});
	});

	describe("getStudentBriefings", () => {
		it("returns empty array if user is not authenticated", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: null },
			});

			const result = await getStudentBriefings(
				"class-1",
				"USA",
				"Pro-Globalization",
			);
			expect(result).toEqual([]);
		});

		it("filters briefings by interest group in memory", async () => {
			const briefings = [
				{
					id: "b1",
					title: "USA Pro-Glob",
					target_role: "USA",
					interest_group: "Pro-Globalization",
				},
				{
					id: "b2",
					title: "USA Pro-Decoupling",
					target_role: "USA",
					interest_group: "Pro-Decoupling",
				},
				{
					id: "b3",
					title: "General Briefing",
					target_role: "All",
					interest_group: null,
				},
			];

			const orMock = vi
				.fn()
				.mockResolvedValue({ data: briefings, error: null });
			const orderMock = vi.fn().mockReturnValue({ or: orMock });
			const eqMock = vi.fn().mockReturnValue({ order: orderMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const result = await getStudentBriefings(
				"class-1",
				"USA",
				"Pro-Globalization",
			);

			expect(result).toEqual([
				expect.objectContaining({ id: "b1" }),
				expect.objectContaining({ id: "b3" }),
			]);
		});

		it("includes briefings with interest_group 'All'", async () => {
			const briefings = [
				{
					id: "b1",
					title: "All Groups",
					target_role: "USA",
					interest_group: "All",
				},
			];

			const orMock = vi
				.fn()
				.mockResolvedValue({ data: briefings, error: null });
			const orderMock = vi.fn().mockReturnValue({ or: orMock });
			const eqMock = vi.fn().mockReturnValue({ order: orderMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const result = await getStudentBriefings(
				"class-1",
				"USA",
				"Strategic Rivalry",
			);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("b1");
		});
	});

	describe("deleteBriefing", () => {
		it("returns error if user is not authenticated", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: null },
			});

			const result = await deleteBriefing("class-1", "b1");
			expect(result).toEqual({ error: "Not logged in" });
		});

		it("deletes a briefing and revalidates", async () => {
			const eqClassMock = vi.fn().mockResolvedValue({ error: null });
			const eqIdMock = vi.fn().mockReturnValue({ eq: eqClassMock });
			const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
			mockClient.from.mockReturnValue({ delete: deleteMock } as any);

			const result = await deleteBriefing("class-1", "b1");

			expect(mockClient.from).toHaveBeenCalledWith("briefings");
			expect(deleteMock).toHaveBeenCalled();
			expect(eqIdMock).toHaveBeenCalledWith("id", "b1");
			expect(eqClassMock).toHaveBeenCalledWith("class_id", "class-1");
			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/instructor/classes/class-1/briefings",
			);
		});

		it("returns error if delete fails", async () => {
			const eqClassMock = vi
				.fn()
				.mockResolvedValue({ error: { message: "delete failed" } });
			const eqIdMock = vi.fn().mockReturnValue({ eq: eqClassMock });
			const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
			mockClient.from.mockReturnValue({ delete: deleteMock } as any);

			const result = await deleteBriefing("class-1", "b1");
			expect(result).toEqual({ error: "Failed to delete briefing" });
		});
	});
});
