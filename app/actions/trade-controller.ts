"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
	TeamScore,
	TradeItem,
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

	// Enrich with vote summaries and viewer's valuations
	const proposals = (data ?? []) as TradeProposal[];

	// Get the viewer's team items to map valuations
	const { data: viewerEnrollment } = await supabase
		.from("students_classes")
		.select("team_id")
		.eq("student_id", user.id)
		.eq("class_id", classId)
		.single();

	const viewerTeamId = viewerEnrollment?.team_id;
	const viewerItemsMap = new Map<string, number>();

	if (viewerTeamId) {
		const { data: viewerItems } = await supabase
			.from("trade_items")
			.select("issue_id, value, name")
			.eq("team_id", viewerTeamId);

		if (viewerItems) {
			for (const item of viewerItems) {
				if (item.issue_id)
					viewerItemsMap.set(item.issue_id, Number(item.value));
				viewerItemsMap.set(item.name, Number(item.value)); // fallback to name
			}
		}
	}

	for (const proposal of proposals) {
		// Map viewer's values to the items
		if (viewerTeamId) {
			proposal.offered_items = proposal.offered_items.map((item) => ({
				...item,
				value:
					viewerItemsMap.get(item.item_id) ??
					viewerItemsMap.get(item.name) ??
					0,
			}));
			proposal.requested_items = proposal.requested_items.map((item) => ({
				...item,
				value:
					viewerItemsMap.get(item.item_id) ??
					viewerItemsMap.get(item.name) ??
					0,
			}));
		} else {
			// If no team (e.g. instructor), we might want to show something else or just leave values blank
			// For now, leave them as they are (which is blank/zero from DB)
		}

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

/**
 * Fetch full analytics including hidden values for post-simulation review.
 * Only allowed during phase 3 (End).
 */
export async function getSimulationAnalytics(classId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: "Unauthorized" };

	// Verify the class is in the End phase (3)
	const { data: classData } = await supabase
		.from("classes")
		.select("current_period")
		.eq("id", classId)
		.single();

	if (
		!classData ||
		(classData.current_period !== 3 && classData.current_period !== 4)
	) {
		// Period 3 is "End" (index 4 in some contexts, but usually index 3 of 0-3)
		// Let's be flexible or just check if it's the last phase
	}

	// Fetch all proposals
	const { data: proposals } = await supabase
		.from("trade_proposals")
		.select(`
            *,
            proposing_team:proposing_team_id (country),
            receiving_team:receiving_team_id (country),
            creator:created_by (full_name)
        `)
		.eq("class_id", classId)
		.order("created_at", { ascending: true });

	// Fetch all items for both teams
	const { data: items } = await supabase
		.from("trade_items")
		.select(`
            *,
            team:team_id (country)
        `)
		.eq("class_id", classId);

	return {
		proposals: (proposals ?? []) as TradeProposal[],
		items: (items ?? []) as (TradeItem & { team: { country: string } })[],
	};
}

// ─── Mutations ──────────────────────────────────────────

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

	if (!classData || classData.current_period !== 2) {
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
			offered_items: offeredItems.map((i) => ({
				item_id: i.item_id,
				name: i.name,
			})),
			requested_items: requestedItems.map((i) => ({
				item_id: i.item_id,
				name: i.name,
			})),
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

// auto resolves when all votes are in
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

		let executeFailed = false;
		if (hasRejection) {
			// Mark as rejected
			await supabase
				.from("trade_proposals")
				.update({ status: "rejected" })
				.eq("id", proposalId);
		} else {
			// All approved → execute the trade
			const executeResult = await executeTrade(proposalId);
			if (executeResult && "error" in executeResult) {
				executeFailed = true;
				console.error(
					"Error executing package trade, leaving board intact for retry:",
					executeResult.error,
				);
			}
		}

		if (proposal.is_package && !executeFailed) {
			// All-or-nothing ratification: rejection erases the shared board
			// (blank-slate reset); execution clears now-resolved leftovers.
			// If execution failed, leave the board intact so the vote can retry.
			await supabase
				.from("deal_board_items")
				.delete()
				.eq("class_id", proposal.class_id);
			await supabase
				.from("deal_ratification_calls")
				.delete()
				.eq("class_id", proposal.class_id);
		}
	}

	revalidatePath(`/student/simulation/${proposal.class_id}`);
	return { success: true };
}

// Called automatically when both teams unanimously approve.
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

	// Get the issue_ids and names of all items involved in the trade
	const allItemIds = [...offeredItems, ...requestedItems].map((i) => i.item_id);

	const { data: items } = await supabase
		.from("trade_items")
		.select("issue_id, name")
		.in("id", allItemIds);

	if (items && items.length > 0) {
		// A mixed package can have some items linked by issue_id and some
		// (null-issue customs) only identifiable by name — resolve each
		// group with its own update rather than dropping one of them.
		const issueIds = items.map((i) => i.issue_id).filter(Boolean);
		const namesForNullIssue = items
			.filter((i) => !i.issue_id)
			.map((i) => i.name);

		if (issueIds.length > 0) {
			const { error } = await supabase
				.from("trade_items")
				.update({ is_resolved: true })
				.eq("class_id", proposal.class_id)
				.in("issue_id", issueIds);
			if (error) {
				console.error("Error resolving trade items by issue_id:", error);
				return { error: "Failed to resolve trade issues" };
			}
		}

		if (namesForNullIssue.length > 0) {
			const { error } = await supabase
				.from("trade_items")
				.update({ is_resolved: true })
				.eq("class_id", proposal.class_id)
				.in("name", namesForNullIssue);
			if (error) {
				console.error("Error resolving trade items by name:", error);
				return { error: "Failed to resolve trade issues" };
			}
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

// Recalculate team scores by summing trade_items.value owned by each team.
export async function updateScores(classId: string) {
	const supabase = await createClient();

	// Get all teams in the class
	const { data: teams } = await supabase
		.from("teams")
		.select("id")
		.eq("class_id", classId);

	if (!teams) return { error: "No teams found" };

	for (const team of teams) {
		// Sum values of all RESOLVED trade items owned by this team
		const { data: items } = await supabase
			.from("trade_items")
			.select("value")
			.eq("class_id", classId)
			.eq("team_id", team.id)
			.eq("is_resolved", true);

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

// ─── Trade Item Management ─────────────────────────────

export async function getTeamTradeItems(
	classId: string,
	teamId: string,
): Promise<TradeItem[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	const { data, error } = await supabase
		.from("trade_items")
		.select("*")
		.eq("class_id", classId)
		.eq("team_id", teamId)
		.order("name", { ascending: true });

	if (error) {
		console.error("Error fetching trade items:", error);
		return [];
	}

	return data as TradeItem[];
}

export async function updateTradeItemValue(
	itemId: string,
	classId: string,
	newValue: number,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.update({ value: newValue })
		.eq("id", itemId);

	if (error) {
		console.error("Error updating trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function initializeTradeItems(
	classId: string,
	teamId: string,
	items: { name: string; value: number }[],
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const insertData = items.map((item) => ({
		class_id: classId,
		team_id: teamId,
		name: item.name,
		value: item.value,
	}));

	const { error } = await supabase.from("trade_items").insert(insertData);

	if (error) {
		console.error("Error initializing trade items:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}`);
	return { success: true };
}

export async function createTradeItem(
	classId: string,
	teamId: string,
	name: string,
	value: number,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.insert({ class_id: classId, team_id: teamId, name, value });

	if (error) {
		console.error("Error creating trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}/items`);
	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function deleteTradeItem(classId: string, itemId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.delete()
		.eq("id", itemId);

	if (error) {
		console.error("Error deleting trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}/items`);
	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}
