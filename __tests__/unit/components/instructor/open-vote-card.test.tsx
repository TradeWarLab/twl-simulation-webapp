import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forceAcceptVotes } from "@/app/actions/trade-controller";
import { OpenVoteCard } from "@/components/instructor/open-vote-card";
import { createClassStore } from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import type { Vote } from "@/lib/types/domain";
import { makeProposal, makeSnapshot } from "../../../helpers/realtime-fixtures";

vi.mock("@/app/actions/trade-controller", () => ({
	forceAcceptVotes: vi.fn(),
}));

function vote(userId: string, choice: Vote["vote"]): Vote {
	return {
		id: `v-${userId}`,
		proposal_id: "pkg-1",
		user_id: userId,
		team_id: "team-usa",
		vote: choice,
		created_at: "2026-11-18T20:00:00Z",
	};
}

// 5 members (2 USA, 3 China).
function renderCard(votes: Vote[], status: "pending" | "executed" = "pending") {
	const store = createClassStore(
		makeSnapshot({
			proposals: [makeProposal({ id: "pkg-1", is_package: true, status })],
			votes,
		}),
	);
	return render(
		<ClassStoreContext.Provider value={store}>
			<OpenVoteCard classId="class-1" />
		</ClassStoreContext.Provider>,
	);
}

describe("OpenVoteCard", () => {
	beforeEach(() => {
		vi.mocked(forceAcceptVotes).mockReset();
		vi.spyOn(window, "confirm").mockReturnValue(true);
	});

	it("shows nothing when no vote is open", () => {
		const { container } = renderCard([], "executed");

		expect(container).toBeEmptyDOMElement();
	});

	it("shows the vote progress and approves for those who have not voted", async () => {
		vi.mocked(forceAcceptVotes).mockResolvedValue({
			success: true,
			result: "executed",
			votesAdded: 3,
		});
		renderCard([vote("u1", "approve"), vote("u2", "approve")]);

		expect(screen.getByText(/approve, 0 reject/)).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Approve for 3 who have not voted" }),
		);

		await waitFor(() =>
			expect(forceAcceptVotes).toHaveBeenCalledWith("class-1", "pkg-1"),
		);
	});

	it("warns that a reject fails the deal and reports the failure", async () => {
		vi.mocked(forceAcceptVotes).mockResolvedValue({
			success: true,
			result: "rejected",
			votesAdded: 4,
		});
		renderCard([vote("u1", "reject")]);

		fireEvent.click(
			screen.getByRole("button", { name: "Approve for 4 who have not voted" }),
		);

		expect(window.confirm).toHaveBeenCalledWith(
			expect.stringContaining("A student rejected this deal"),
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"The deal failed because a student rejected it.",
		);
	});

	it("does nothing when the instructor cancels", () => {
		vi.mocked(window.confirm).mockReturnValue(false);
		renderCard([]);

		fireEvent.click(
			screen.getByRole("button", { name: "Approve for 5 who have not voted" }),
		);

		expect(forceAcceptVotes).not.toHaveBeenCalled();
	});

	it("hides the button when everyone has voted", () => {
		renderCard([
			vote("u1", "approve"),
			vote("u2", "approve"),
			vote("u3", "approve"),
			vote("u4", "approve"),
			vote("u5", "reject"),
		]);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
