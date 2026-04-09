"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
	TeamScore,
	TradeProposal,
	TradeProposalItem,
	Vote,
	VoteChoice,
} from "@/lib/types/domain";

// ─── Queries ────────────────────────────────────────────

/**
 * Fetch all trade proposals for a class, with team info and vote counts.
 */
export async function getTradeProposals(
	classId: string,
): Promise<TradeProposal[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data, error } = await supabase
		.from("trade_proposals")
		.select(`
            *,
            proposing_team:proposing_team_id (country),
            receiving_team:receiving_team_id (country),
            creator:created_by (full_name)
        `)
		.eq("class_id", classId)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching trade proposals:", error);
		return [];
	}

	// Enrich with vote summaries
	const proposals = (data ?? []) as TradeProposal[];

	for (const proposal of proposals) {
		// Count total team members for both teams
		const { count: totalMembers } = await supabase
			.from("students_classes")
			.select("*", { count: "exact", head: true })
			.in("team_id", [proposal.proposing_team_id, proposal.receiving_team_id]);

		// Get vote breakdown
		const { data: votes } = await supabase
			.from("votes")
			.select("vote")
			.eq("proposal_id", proposal.id);

		const votesList = votes ?? [];
		proposal.vote_summary = {
			total_members: totalMembers ?? 0,
			votes_cast: votesList.length,
			approvals: votesList.filter((v) => v.vote === "approve").length,
			rejections: votesList.filter((v) => v.vote === "reject").length,
		};
	}

	return proposals;
}

/**
 * Fetch all votes for a specific proposal, with voter names.
 */
export async function getVotesForProposal(proposalId: string): Promise<Vote[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data, error } = await supabase
		.from("votes")
		.select(`
            *,
            user:user_id (full_name)
        `)
		.eq("proposal_id", proposalId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("Error fetching votes:", error);
		return [];
	}

	return (data ?? []) as unknown as Vote[];
}

/**
 * Fetch team scores for a class.
 */
export async function getScoreboard(classId: string): Promise<TeamScore[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const { data, error } = await supabase
		.from("team_scores")
		.select(`
            *,
            team:team_id (country)
        `)
		.eq("class_id", classId);

	if (error) {
		console.error("Error fetching scoreboard:", error);
		return [];
	}

	return (data ?? []) as unknown as TeamScore[];
}

// ─── Mutations ──────────────────────────────────────────

/**
 * 1️⃣ Create a trade proposal from selected items.
 */
export async function createTradeProposal(
	classId: string,
	proposingTeamId: string,
	receivingTeamId: string,
	offeredItems: TradeProposalItem[],
	requestedItems: TradeProposalItem[],
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	if (offeredItems.length === 0 && requestedItems.length === 0) {
		return { error: "Trade must include at least one item" };
	}

	if (proposingTeamId === receivingTeamId) {
		return { error: "Cannot trade with your own team" };
	}

	// Verify user belongs to the proposing team
	const { data: enrollment } = await supabase
		.from("students_classes")
		.select("id")
		.eq("student_id", user.id)
		.eq("team_id", proposingTeamId)
		.single();

	if (!enrollment) {
		return { error: "You are not on the proposing team" };
	}

	// Verify the class is in the Negotiation period (period 3)
	const { data: classData } = await supabase
		.from("classes")
		.select("current_period")
		.eq("id", classId)
		.single();

	if (!classData || classData.current_period !== 3) {
		return {
			error: "Trade proposals can only be created during the Negotiation phase",
		};
	}

	const { data: proposal, error } = await supabase
		.from("trade_proposals")
		.insert({
			class_id: classId,
			proposing_team_id: proposingTeamId,
			receiving_team_id: receivingTeamId,
			offered_items: offeredItems,
			requested_items: requestedItems,
			status: "pending",
			created_by: user.id,
		})
		.select()
		.single();

	if (error) {
		console.error("Error creating trade proposal:", error);
		return { error: error.message };
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true, proposalId: proposal.id };
}

/**
 * 2️⃣ Submit a vote on a trade proposal.
 * Automatically resolves the proposal when all votes are in.
 */
export async function submitVote(proposalId: string, vote: VoteChoice) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	// Fetch the proposal
	const { data: proposal, error: proposalError } = await supabase
		.from("trade_proposals")
		.select("*")
		.eq("id", proposalId)
		.single();

	if (proposalError || !proposal) {
		return { error: "Proposal not found" };
	}

	if (proposal.status !== "pending") {
		return { error: "This proposal has already been resolved" };
	}

	// Verify user belongs to one of the two teams
	const { data: enrollment } = await supabase
		.from("students_classes")
		.select("team_id")
		.eq("student_id", user.id)
		.in("team_id", [proposal.proposing_team_id, proposal.receiving_team_id])
		.single();

	if (!enrollment) {
		return { error: "You are not part of this trade" };
	}

	// Upsert the vote (unique on proposal_id + user_id)
	const { error: voteError } = await supabase.from("votes").upsert(
		{
			proposal_id: proposalId,
			user_id: user.id,
			team_id: enrollment.team_id,
			vote,
		},
		{ onConflict: "proposal_id,user_id" },
	);

	if (voteError) {
		console.error("Error submitting vote:", voteError);
		return { error: voteError.message };
	}

	// ─── Auto-resolve: check if all team members have voted ───

	// Count total team members across both teams
	const { count: totalMembers } = await supabase
		.from("students_classes")
		.select("*", { count: "exact", head: true })
		.in("team_id", [proposal.proposing_team_id, proposal.receiving_team_id]);

	// Count votes cast so far
	const { data: allVotes } = await supabase
		.from("votes")
		.select("vote")
		.eq("proposal_id", proposalId);

	const votesList = allVotes ?? [];
	const votesCast = votesList.length;

	if (votesCast >= (totalMembers ?? 0) && (totalMembers ?? 0) > 0) {
		// All votes are in — check for any rejections
		const hasRejection = votesList.some((v) => v.vote === "reject");

		if (hasRejection) {
			// Mark as rejected
			await supabase
				.from("trade_proposals")
				.update({ status: "rejected" })
				.eq("id", proposalId);
		} else {
			// All approved → execute the trade
			await executeTrade(proposalId);
		}
	}

	revalidatePath(`/student/simulation/${proposal.class_id}`);
	return { success: true };
}

/**
 * 3️⃣ Execute a trade: swap item ownership between teams.
 * Called automatically when both teams unanimously approve.
 */
export async function executeTrade(proposalId: string) {
	const supabase = await createClient();

	const { data: proposal, error: proposalError } = await supabase
		.from("trade_proposals")
		.select("*")
		.eq("id", proposalId)
		.single();

	if (proposalError || !proposal) {
		return { error: "Proposal not found" };
	}

	const offeredItems = proposal.offered_items as TradeProposalItem[];
	const requestedItems = proposal.requested_items as TradeProposalItem[];

	// Transfer offered items: proposing team → receiving team
	for (const item of offeredItems) {
		const { error } = await supabase
			.from("trade_items")
			.update({ team_id: proposal.receiving_team_id })
			.eq("id", item.item_id);

		if (error) {
			console.error(`Error transferring offered item ${item.item_id}:`, error);
			return { error: `Failed to transfer item: ${item.name}` };
		}
	}

	// Transfer requested items: receiving team → proposing team
	for (const item of requestedItems) {
		const { error } = await supabase
			.from("trade_items")
			.update({ team_id: proposal.proposing_team_id })
			.eq("id", item.item_id);

		if (error) {
			console.error(
				`Error transferring requested item ${item.item_id}:`,
				error,
			);
			return { error: `Failed to transfer item: ${item.name}` };
		}
	}

	// Mark proposal as executed
	await supabase
		.from("trade_proposals")
		.update({ status: "executed" })
		.eq("id", proposalId);

	// Update scores
	await updateScores(proposal.class_id);

	revalidatePath(`/student/simulation/${proposal.class_id}`);
	return { success: true };
}

/**
 * 4️⃣ Recalculate team scores by summing trade_items.value owned by each team.
 */
export async function updateScores(classId: string) {
	const supabase = await createClient();

	// Get all teams in the class
	const { data: teams } = await supabase
		.from("teams")
		.select("id")
		.eq("class_id", classId);

	if (!teams) return { error: "No teams found" };

	for (const team of teams) {
		// Sum values of all trade items owned by this team
		const { data: items } = await supabase
			.from("trade_items")
			.select("value")
			.eq("class_id", classId)
			.eq("team_id", team.id);

		const totalScore = (items ?? []).reduce(
			(sum, item) => sum + Number(item.value),
			0,
		);

		// Upsert score
		await supabase.from("team_scores").upsert(
			{
				class_id: classId,
				team_id: team.id,
				score: totalScore,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "class_id,team_id" },
		);
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}
