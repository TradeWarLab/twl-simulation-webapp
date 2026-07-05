"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Shared Deal Board Actions ──────────────────────────
// See docs/superpowers/specs/2026-07-04-shared-deal-board-design.md.
// The board is the phase-2 negotiation surface: rows in deal_board_items,
// two-team ratification handshake in deal_ratification_calls, final vote
// via a trade_proposals row with is_package = true.

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function getStudentContext(classId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: "Unauthorized" as const };

	const { data: enrollment, error: enrollmentError } = await supabase
		.from("students_classes")
		.select("team_id")
		.eq("student_id", user.id)
		.eq("class_id", classId)
		.maybeSingle();
	if (enrollmentError) {
		console.error("Error checking enrollment:", enrollmentError);
		return { error: "Failed to verify your enrollment" as const };
	}
	if (!enrollment?.team_id) {
		return { error: "You are not enrolled in this class" as const };
	}

	const { data: classData, error: classError } = await supabase
		.from("classes")
		.select("current_period")
		.eq("id", classId)
		.maybeSingle();
	if (classError) {
		console.error("Error checking simulation phase:", classError);
		return { error: "Failed to verify the simulation phase" as const };
	}
	if (!classData || classData.current_period !== 2) {
		return {
			error:
				"The deal board is only open during the Bilateral Negotiation phase" as const,
		};
	}

	return { supabase, user, teamId: enrollment.team_id as string };
}

async function findPendingPackage(supabase: Supabase, classId: string) {
	const { data, error } = await supabase
		.from("trade_proposals")
		.select("id")
		.eq("class_id", classId)
		.eq("is_package", true)
		.eq("status", "pending")
		.maybeSingle();
	if (error) {
		console.error("Error checking pending package:", error);
		return { pending: null, error: "unknown" as const };
	}
	return { pending: data ?? null, error: null };
}

async function clearRatificationCalls(supabase: Supabase, classId: string) {
	await supabase
		.from("deal_ratification_calls")
		.delete()
		.eq("class_id", classId);
}

export async function addBoardItem(classId: string, itemId: string) {
	const ctx = await getStudentContext(classId);
	if ("error" in ctx) return { error: ctx.error };
	const { supabase, user, teamId } = ctx;

	const pendingPackage = await findPendingPackage(supabase, classId);
	if (pendingPackage.error) {
		return { error: "Could not verify the board status" };
	}
	if (pendingPackage.pending) {
		return { error: "The board is frozen while the final vote is open" };
	}

	const { data: item } = await supabase
		.from("trade_items")
		.select("id, class_id, team_id, issue_id, name, role, is_resolved")
		.eq("id", itemId)
		.maybeSingle();

	if (!item || item.class_id !== classId) return { error: "Item not found" };
	if (item.is_resolved) {
		return { error: "This issue has already been resolved" };
	}
	if (item.team_id !== teamId) {
		return { error: "You can only add items from your own team's list" };
	}

	// trade_items are per-team mirror rows: 'concession' = our team gives it,
	// 'ask' = we are asking the opposing team to give it.
	const { data: teams } = await supabase
		.from("teams")
		.select("id")
		.eq("class_id", classId);
	const otherTeamId = (teams ?? [])
		.map((team) => team.id)
		.find((id) => id !== teamId);
	if (!otherTeamId) return { error: "Opposing team not found" };

	const givingTeamId = item.role === "concession" ? teamId : otherTeamId;

	const { error } = await supabase.from("deal_board_items").insert({
		class_id: classId,
		item_id: item.id,
		issue_id: item.issue_id,
		name: item.name,
		giving_team_id: givingTeamId,
		added_by_team_id: teamId,
		added_by: user.id,
	});
	if (error) {
		// unique(class_id, name): a concurrent duplicate add is a silent no-op.
		if ((error as { code?: string }).code === "23505") {
			return { success: true };
		}
		console.error("Error adding board item:", error);
		return { error: error.message };
	}

	// Stale-handshake rule: any board change voids pending ratification calls.
	await clearRatificationCalls(supabase, classId);

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function removeBoardItem(classId: string, boardItemId: string) {
	const ctx = await getStudentContext(classId);
	if ("error" in ctx) return { error: ctx.error };
	const { supabase } = ctx;

	const pendingPackage = await findPendingPackage(supabase, classId);
	if (pendingPackage.error) {
		return { error: "Could not verify the board status" };
	}
	if (pendingPackage.pending) {
		return { error: "The board is frozen while the final vote is open" };
	}

	const { error } = await supabase
		.from("deal_board_items")
		.delete()
		.eq("id", boardItemId)
		.eq("class_id", classId);
	if (error) {
		console.error("Error removing board item:", error);
		return { error: error.message };
	}

	await clearRatificationCalls(supabase, classId);

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function callForRatification(classId: string) {
	const ctx = await getStudentContext(classId);
	if ("error" in ctx) return { error: ctx.error };
	const { supabase, user, teamId } = ctx;

	const pendingPackage = await findPendingPackage(supabase, classId);
	if (pendingPackage.error) {
		return { error: "Could not verify the board status" };
	}
	if (pendingPackage.pending) {
		return { error: "A final vote is already open" };
	}

	const { data: boardRows } = await supabase
		.from("deal_board_items")
		.select("item_id, name, giving_team_id")
		.eq("class_id", classId);
	if (!boardRows || boardRows.length === 0) {
		return {
			error: "Add at least one item to the board before calling a vote",
		};
	}

	const { error: callError } = await supabase
		.from("deal_ratification_calls")
		.upsert(
			{ class_id: classId, team_id: teamId, called_by: user.id },
			{ onConflict: "class_id,team_id" },
		);
	if (callError) {
		console.error("Error recording ratification call:", callError);
		return { error: callError.message };
	}

	const { data: calls } = await supabase
		.from("deal_ratification_calls")
		.select("team_id")
		.eq("class_id", classId);
	const teamsCalled = new Set((calls ?? []).map((call) => call.team_id));

	if (teamsCalled.size < 2) {
		revalidatePath(`/student/simulation/${classId}`);
		return { success: true, voteOpened: false };
	}

	// Handshake complete — snapshot the board into a package proposal.
	// Convention: proposing team = the team whose call completed the handshake.
	const otherTeamId = [...teamsCalled].find((id) => id !== teamId);
	if (!otherTeamId) return { error: "Opposing team not found" };

	const offered = boardRows
		.filter((row) => row.giving_team_id === teamId)
		.map((row) => ({ item_id: row.item_id, name: row.name }));
	const requested = boardRows
		.filter((row) => row.giving_team_id !== teamId)
		.map((row) => ({ item_id: row.item_id, name: row.name }));

	const { error: proposalError } = await supabase
		.from("trade_proposals")
		.insert({
			class_id: classId,
			proposing_team_id: teamId,
			receiving_team_id: otherTeamId,
			offered_items: offered,
			requested_items: requested,
			status: "pending",
			is_package: true,
			created_by: user.id,
		});
	if (proposalError) {
		console.error("Error creating package proposal:", proposalError);
		return { error: proposalError.message };
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true, voteOpened: true };
}

export async function withdrawRatificationCall(classId: string) {
	const ctx = await getStudentContext(classId);
	if ("error" in ctx) return { error: ctx.error };
	const { supabase, teamId } = ctx;

	const pendingPackage = await findPendingPackage(supabase, classId);
	if (pendingPackage.error) {
		return { error: "Could not verify the board status" };
	}
	if (pendingPackage.pending) {
		return { error: "The final vote has already opened" };
	}

	const { error } = await supabase
		.from("deal_ratification_calls")
		.delete()
		.eq("class_id", classId)
		.eq("team_id", teamId);
	if (error) {
		console.error("Error withdrawing ratification call:", error);
		return { error: error.message };
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}
