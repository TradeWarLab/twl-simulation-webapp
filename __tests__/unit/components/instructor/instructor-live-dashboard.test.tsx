import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstructorLiveDashboard } from "@/components/instructor/instructor-live-dashboard";
import {
	createClassStore,
	type RealtimeSnapshot,
} from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import type { TeamScore } from "@/lib/types/domain";

// These children own their own data fetching and are irrelevant to the swap.
vi.mock("@/components/instructor/manage-items-client", () => ({
	ManageItemsClient: () => <div>Manage Items</div>,
}));
vi.mock("@/components/instructor/student-roster", () => ({
	StudentRoster: () => <div>Student Roster</div>,
}));

const SCORES: TeamScore[] = [
	{
		id: "s1",
		class_id: "class-1",
		team_id: "team-usa",
		score: 42,
		updated_at: "2026-07-21T00:00:00Z",
		team: { country: "USA" },
	},
	{
		id: "s2",
		class_id: "class-1",
		team_id: "team-china",
		score: 31,
		updated_at: "2026-07-21T00:00:00Z",
		team: { country: "China" },
	},
];

function snapshot(currentPeriod: number): RealtimeSnapshot {
	return {
		classRecord: {
			id: "class-1",
			name: "Test",
			class_code: "ABC",
			current_period: currentPeriod,
			status: "active",
		},
		teams: [
			{ id: "team-usa", country: "USA" },
			{ id: "team-china", country: "China" },
		],
		teamMemberCounts: { "team-usa": 2, "team-china": 2 },
		tradeItems: [],
		proposals: [],
		votes: [],
		messages: [],
		dealBoardItems: [],
		ratificationCalls: [],
	};
}

function renderDashboard(currentPeriod: number, scores: TeamScore[] = []) {
	const store = createClassStore(snapshot(currentPeriod));
	return render(
		<ClassStoreContext.Provider value={store}>
			<InstructorLiveDashboard roster={[]} scores={scores} />
		</ClassStoreContext.Provider>,
	);
}

describe("InstructorLiveDashboard", () => {
	it("shows the live deal board during negotiation", () => {
		renderDashboard(2);
		expect(screen.getByText(/live deal board/i)).toBeInTheDocument();
		expect(screen.queryByText(/simulation complete/i)).not.toBeInTheDocument();
	});

	it("replaces the deal board with results once the simulation ends", () => {
		renderDashboard(3, SCORES);
		expect(screen.getByText(/simulation complete/i)).toBeInTheDocument();
		expect(screen.queryByText(/live deal board/i)).not.toBeInTheDocument();
	});

	it("never shows the empty-board message after the simulation ends", () => {
		// Ratification deletes the board (schema.sql:766), so the old card would
		// claim nothing happened at the exact moment everything did.
		renderDashboard(3, SCORES);
		expect(
			screen.queryByText(/no items on the deal board yet/i),
		).not.toBeInTheDocument();
	});

	it("shows the no-deal state when the simulation ended without scores", () => {
		renderDashboard(3, []);
		expect(screen.getByText(/no deal reached/i)).toBeInTheDocument();
	});
});
