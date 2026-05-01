import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInstructorDashboardSnapshot } from "@/app/actions/instructor-dashboard";
import { createClient } from "@/lib/supabase/server";
import { createChainableBuilder } from "../helpers/supabase-mock";

vi.mock("@/app/actions/classes", () => ({
	getClassRoster: vi.fn(),
}));

describe("getInstructorDashboardSnapshot", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns an empty snapshot when there is no signed-in instructor", async () => {
		vi.mocked(createClient).mockResolvedValueOnce({
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		} as any);

		const snapshot = await getInstructorDashboardSnapshot("class-1");

		expect(snapshot).toEqual({
			roster: [],
			teams: [],
			teamScores: [],
			teamMemberCounts: {},
			tradeItems: [],
			proposals: [],
			votes: [],
			messages: [],
		});
	});

	it("returns an empty snapshot when the class is not owned by the instructor", async () => {
		const client = {
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: { user: { id: "instructor-1" } },
				}),
			},
			from: vi.fn((table: string) => {
				if (table === "classes") {
					return createChainableBuilder({ data: null, error: null });
				}
				throw new Error(`Unexpected table lookup: ${table}`);
			}),
		};
		vi.mocked(createClient).mockResolvedValueOnce(client as any);

		const snapshot = await getInstructorDashboardSnapshot("class-1");

		expect(client.from).toHaveBeenCalledWith("classes");
		expect(snapshot.teams).toEqual([]);
		expect(snapshot.roster).toEqual([]);
	});

	it("aggregates roster, team counts, items, proposals, votes, and messages", async () => {
		const { getClassRoster } = await import("@/app/actions/classes");
		vi.mocked(getClassRoster).mockResolvedValueOnce([
			{
				id: "student-1",
				full_name: "Ada Lovelace",
				email: "ada@example.com",
				interest_block: "Industry",
				team_id: "team-usa",
				team_country: "USA",
				invite_status: "joined",
			},
		] as any);

		let teamCallCount = 0;
		const client = {
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: { user: { id: "instructor-1" } },
				}),
			},
			from: vi.fn((table: string) => {
				switch (table) {
					case "classes":
						return createChainableBuilder({
							data: { id: "class-1" },
							error: null,
						});
					case "teams":
						teamCallCount += 1;
						return teamCallCount === 1
							? createChainableBuilder({
									data: [
										{ id: "team-usa", country: "USA" },
										{ id: "team-china", country: "China" },
									],
									error: null,
								})
							: createChainableBuilder({
									data: [{ id: "team-usa" }, { id: "team-china" }],
									error: null,
								});
					case "team_scores":
						return createChainableBuilder({
							data: [
								{
									id: "score-1",
									class_id: "class-1",
									team_id: "team-usa",
									score: 18,
									team: { country: "USA" },
								},
							],
							error: null,
						});
					case "students_classes":
						return createChainableBuilder({
							data: [
								{ team_id: "team-usa" },
								{ team_id: "team-usa" },
								{ team_id: "team-china" },
								{ team_id: null },
							],
							error: null,
						});
					case "trade_items":
						return createChainableBuilder({
							data: [
								{
									id: "item-1",
									class_id: "class-1",
									name: "Tariff rollback",
									team_id: "team-usa",
									value: 15,
								},
							],
							error: null,
						});
					case "trade_proposals":
						return createChainableBuilder({
							data: [
								{
									id: "proposal-1",
									class_id: "class-1",
									proposing_team_id: "team-usa",
									receiving_team_id: "team-china",
									status: "pending",
								},
							],
							error: null,
						});
					case "votes":
						return createChainableBuilder({
							data: [
								{
									id: "vote-1",
									proposal_id: "proposal-1",
									team_id: "team-usa",
									user_id: "student-1",
								},
							],
							error: null,
						});
					case "messages":
						return createChainableBuilder({
							data: [
								{
									id: "message-1",
									class_id: "class-1",
									channel: "global",
									content: "Offer updated",
									created_at: "2026-05-01T10:00:00.000Z",
									sender: {
										full_name: "Ada Lovelace",
										email: "ada@example.com",
									},
								},
							],
							error: null,
						});
					default:
						throw new Error(`Unexpected table lookup: ${table}`);
				}
			}),
		};
		vi.mocked(createClient).mockResolvedValueOnce(client as any);

		const snapshot = await getInstructorDashboardSnapshot("class-1");

		expect(getClassRoster).toHaveBeenCalledWith("class-1");
		expect(snapshot.roster).toHaveLength(1);
		expect(snapshot.teams).toEqual([
			{ id: "team-usa", country: "USA" },
			{ id: "team-china", country: "China" },
		]);
		expect(snapshot.teamScores[0]?.score).toBe(18);
		expect(snapshot.teamMemberCounts).toEqual({
			"team-usa": 2,
			"team-china": 1,
		});
		expect(snapshot.tradeItems[0]?.name).toBe("Tariff rollback");
		expect(snapshot.proposals[0]?.id).toBe("proposal-1");
		expect(snapshot.votes[0]?.id).toBe("vote-1");
		expect(snapshot.messages[0]?.content).toBe("Offer updated");
	});
});
