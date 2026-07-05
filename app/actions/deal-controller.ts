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

	const { data: enrollment } = await supabase
		.from("students_classes")
		.select("team_id")
		.eq("student_id", user.id)
		.eq("class_id", classId)
		.maybeSingle();
	if (!enrollment?.team_id) {
		return { error: "You are not enrolled in this class" as const };
	}

	const { data: classData } = await supabase
		.from("classes")
		.select("current_period")
		.eq("id", classId)
		.maybeSingle();
	if (!classData || classData.current_period !== 2) {
		return {
			error:
				"The deal board is only open during the Bilateral Negotiation phase" as const,
		};
	}

	return { supabase, user, teamId: enrollment.team_id as string };
}

async function findPendingPackage(supabase: Supabase, classId: string) {
	const { data } = await supabase
		.from("trade_proposals")
		.select("id")
		.eq("class_id", classId)
		.eq("is_package", true)
		.eq("status", "pending")
		.maybeSingle();
	return data ?? null;
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

	if (await findPendingPackage(supabase, classId)) {
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

	if (await findPendingPackage(supabase, classId)) {
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
