import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRealtimeSnapshot } from "@/app/actions/realtime-snapshot";
import { mockClient } from "../helpers/supabase-mock";

describe("getRealtimeSnapshot", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when there is no signed-in user", async () => {
		mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
		expect(await getRealtimeSnapshot("class-1")).toBeNull();
	});

	it("returns null when the class is not visible", async () => {
		mockClient._mockTable("classes", { data: null, error: null });
		expect(await getRealtimeSnapshot("class-1")).toBeNull();
	});

	it("aggregates class, teams, counts, items, proposals, votes, and messages", async () => {
		mockClient._mockTable("classes", {
			data: {
				id: "class-1",
				name: "Econ 101",
				class_code: "ABC",
				current_period: 1,
				status: "active",
			},
			error: null,
		});
		mockClient._mockTable("teams", {
			data: [
				{ id: "team-usa", country: "USA" },
				{ id: "team-prc", country: "China" },
			],
			error: null,
		});
		mockClient._mockTable("students_classes", {
			data: [
				{ team_id: "team-usa" },
				{ team_id: "team-usa" },
				{ team_id: "team-prc" },
				{ team_id: null },
			],
			error: null,
		});
		mockClient._mockTable("trade_items", {
			data: [{ id: "ti-1", name: "Tariffs" }],
			error: null,
		});
		mockClient._mockTable("trade_proposals", {
			data: [{ id: "p1" }],
			error: null,
		});
		mockClient._mockTable("votes", { data: [{ id: "v1" }], error: null });
		mockClient._mockTable("messages", { data: [{ id: "m1" }], error: null });

		const snapshot = await getRealtimeSnapshot("class-1");

		expect(snapshot).not.toBeNull();
		expect(snapshot?.classRecord.name).toBe("Econ 101");
		expect(snapshot?.teams).toHaveLength(2);
		expect(snapshot?.teamMemberCounts).toEqual({
			"team-usa": 2,
			"team-prc": 1,
		});
		expect(snapshot?.tradeItems).toEqual([{ id: "ti-1", name: "Tariffs" }]);
		expect(snapshot?.proposals).toEqual([{ id: "p1" }]);
		expect(snapshot?.votes).toEqual([{ id: "v1" }]);
		expect(snapshot?.messages).toEqual([{ id: "m1" }]);
	});

	it("returns empty votes without querying when the class has no teams", async () => {
		mockClient._mockTable("classes", {
			data: {
				id: "class-1",
				name: "Econ 101",
				class_code: "ABC",
				current_period: 0,
				status: "active",
			},
			error: null,
		});
		mockClient._mockTable("teams", { data: [], error: null });
		mockClient._mockTable("students_classes", { data: [], error: null });
		mockClient._mockTable("trade_items", { data: [], error: null });
		mockClient._mockTable("trade_proposals", { data: [], error: null });
		mockClient._mockTable("messages", { data: [], error: null });

		const snapshot = await getRealtimeSnapshot("class-1");

		expect(snapshot?.votes).toEqual([]);
		expect(mockClient.from).not.toHaveBeenCalledWith("votes");
	});
});
