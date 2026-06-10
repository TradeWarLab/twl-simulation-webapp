import { describe, expect, it } from "vitest";
import { buildViewerValueMap, enrichProposal } from "@/lib/realtime/derive";
import type { TradeItem, TradeProposal, Vote } from "@/lib/types/domain";

const viewerItems: TradeItem[] = [
	{
		id: "ti-1",
		class_id: "class-1",
		team_id: "team-usa",
		issue_id: "issue-9",
		name: "Tariffs",
		value: 15,
		role: "ask",
		is_resolved: false,
		created_at: "2026-01-01T00:00:00Z",
	},
	{
		id: "ti-2",
		class_id: "class-1",
		team_id: "team-usa",
		issue_id: null,
		name: "Soybeans",
		value: -20,
		role: "concession",
		is_resolved: false,
		created_at: "2026-01-01T00:00:00Z",
	},
];

function makeProposal(overrides: Partial<TradeProposal> = {}): TradeProposal {
	return {
		id: "p1",
		class_id: "class-1",
		proposing_team_id: "team-usa",
		receiving_team_id: "team-prc",
		offered_items: [{ item_id: "other-id", name: "Soybeans" }],
		requested_items: [{ item_id: "issue-9", name: "Tariffs" }],
		status: "pending",
		created_by: "u1",
		created_at: "2026-01-02T00:00:00Z",
		...overrides,
	};
}

const teamById = new Map([
	["team-usa", { id: "team-usa", country: "USA" as const }],
	["team-prc", { id: "team-prc", country: "China" as const }],
]);

const votes: Vote[] = [
	{
		id: "v1",
		proposal_id: "p1",
		user_id: "u1",
		team_id: "team-usa",
		vote: "approve",
		created_at: "2026-01-02T01:00:00Z",
	},
	{
		id: "v2",
		proposal_id: "p1",
		user_id: "u2",
		team_id: "team-prc",
		vote: "reject",
		created_at: "2026-01-02T02:00:00Z",
	},
	{
		id: "v3",
		proposal_id: "OTHER",
		user_id: "u3",
		team_id: "team-prc",
		vote: "approve",
		created_at: "2026-01-02T03:00:00Z",
	},
];

describe("buildViewerValueMap", () => {
	it("keys by issue_id and by name", () => {
		const map = buildViewerValueMap(viewerItems);
		expect(map.get("issue-9")).toBe(15);
		expect(map.get("Tariffs")).toBe(15);
		expect(map.get("Soybeans")).toBe(-20);
	});
});

describe("enrichProposal", () => {
	it("maps viewer values by item_id then falls back to name, defaulting 0", () => {
		const enriched = enrichProposal(makeProposal(), {
			viewerValueMap: buildViewerValueMap(viewerItems),
			votes: [],
			totalMembers: 4,
			teamById,
			userNames: new Map(),
		});
		// "other-id" misses, "Soybeans" name hits
		expect(enriched.offered_items[0].value).toBe(-20);
		// "issue-9" item_id hits
		expect(enriched.requested_items[0].value).toBe(15);
	});

	it("leaves item values untouched when no viewerValueMap (instructor view)", () => {
		const enriched = enrichProposal(makeProposal(), {
			votes: [],
			totalMembers: 4,
			teamById,
			userNames: new Map(),
		});
		expect(enriched.offered_items[0].value).toBeUndefined();
	});

	it("computes vote_summary from this proposal's votes only", () => {
		const enriched = enrichProposal(makeProposal(), {
			votes,
			totalMembers: 5,
			teamById,
			userNames: new Map(),
		});
		expect(enriched.vote_summary).toEqual({
			total_members: 5,
			votes_cast: 2,
			approvals: 1,
			rejections: 1,
		});
	});

	it("hydrates team countries and creator name from lookups", () => {
		const enriched = enrichProposal(makeProposal(), {
			votes: [],
			totalMembers: 0,
			teamById,
			userNames: new Map([["u1", "Ada"]]),
		});
		expect(enriched.proposing_team).toEqual({ id: "team-usa", country: "USA" });
		expect(enriched.receiving_team).toEqual({ country: "China" });
		expect(enriched.creator).toEqual({ full_name: "Ada" });
	});

	it("prefers an existing creator join over the userNames cache", () => {
		const enriched = enrichProposal(
			makeProposal({ creator: { full_name: "Joined Name" } }),
			{
				votes: [],
				totalMembers: 0,
				teamById,
				userNames: new Map([["u1", "Cached Name"]]),
			},
		);
		expect(enriched.creator).toEqual({ full_name: "Joined Name" });
	});
});
