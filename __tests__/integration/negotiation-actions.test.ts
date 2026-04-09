import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createAsk,
	createBundle,
	respondToBundle,
} from "@/app/actions/negotiations";
import { mockClient } from "../helpers/supabase-mock";
import { revalidatePath } from "next/cache";

describe("Negotiation Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createAsk", () => {
		it("inserts an ask and revalidates path", async () => {
			const insertMock = vi.fn().mockResolvedValue({ error: null });
			mockClient.from.mockReturnValue({ insert: insertMock } as any);

			const result = await createAsk("class-1", "team-a", "We want Steel");

			expect(insertMock).toHaveBeenCalledWith({
				class_id: "class-1",
				team_id: "team-a",
				type: "ask",
				details: "We want Steel",
				status: "draft",
			});
			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/student/simulation/class-1",
			);
		});
	});

	describe("createBundle", () => {
		it("creates bundle and links actions", async () => {
			// 1. Mock the bundle insert and single() to return a bundle object
			const bundleId = "bundle-123";
			const bundleSingleMock = vi.fn().mockResolvedValue({
				data: { id: bundleId },
				error: null,
			});
			const bundleSelectMock = vi
				.fn()
				.mockReturnValue({ single: bundleSingleMock });
			const bundleInsertMock = vi
				.fn()
				.mockReturnValue({ select: bundleSelectMock });

			// 2. Mock the action linking update and in() array
			const actionInMock = vi.fn().mockResolvedValue({ error: null });
			const actionUpdateMock = vi.fn().mockReturnValue({ in: actionInMock });

			// Route the mock client "from" based on the table name
			mockClient.from.mockImplementation((table: string) => {
				if (table === "negotiation_bundles") {
					return { insert: bundleInsertMock } as any;
				}
				if (table === "negotiation_actions") {
					return { update: actionUpdateMock } as any;
				}
				return {} as any;
			});

			const result = await createBundle("class-1", "team-a", [
				"act-1",
				"act-2",
			]);

			// Verify bundle creation
			expect(bundleInsertMock).toHaveBeenCalledWith({
				class_id: "class-1",
				proposing_team_id: "team-a",
				status: "proposed",
			});

			// Verify action linking
			expect(actionUpdateMock).toHaveBeenCalledWith({ bundle_id: bundleId });
			expect(actionInMock).toHaveBeenCalledWith("id", ["act-1", "act-2"]);

			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/student/simulation/class-1",
			);
		});

		it("returns error if bundle creation fails", async () => {
			const bundleSingleMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Bundle creation failed" },
			});
			const bundleSelectMock = vi
				.fn()
				.mockReturnValue({ single: bundleSingleMock });
			const bundleInsertMock = vi
				.fn()
				.mockReturnValue({ select: bundleSelectMock });

			mockClient.from.mockReturnValue({ insert: bundleInsertMock } as any);

			const result = await createBundle("c1", "t1", ["a1"]);
			expect(result).toEqual({ error: "Bundle creation failed" });
		});
	});

	describe("respondToBundle", () => {
		it("updates bundle status to accepted", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ update: updateMock } as any);

			const result = await respondToBundle("bun-1", "accepted");

			expect(updateMock).toHaveBeenCalledWith({ status: "accepted" });
			expect(eqMock).toHaveBeenCalledWith("id", "bun-1");
			expect(result).toEqual({ success: true });
			expect(revalidatePath).toHaveBeenCalledWith("/student/simulation");
		});
	});
});
