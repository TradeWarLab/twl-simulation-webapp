"use server";

import type { Message } from "@/app/actions/chat";
import type {
	LiveClassRecord,
	RealtimeSnapshot,
} from "@/lib/realtime/class-store";
import { createClient } from "@/lib/supabase/server";
import type {
	DealBoardItem,
	DealRatificationCall,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";

/**
 * Initial data + reconnect-resync payload for RealtimeClassProvider.
 * Row-level security scopes the result per role: students receive only
 * their own team's trade items and their channels' messages; instructors
 * receive everything in their class.
 */
export async function getRealtimeSnapshot(
	classId: string,
): Promise<RealtimeSnapshot | null> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	const { data: classRecord } = await supabase
		.from("classes")
		.select("id, name, class_code, current_period, status")
		.eq("id", classId)
		.single();
	if (!classRecord) return null;

	const { data: teams } = await supabase
		.from("teams")
		.select("id, country")
		.eq("class_id", classId);
	const teamIds = (teams ?? []).map((team) => team.id);

	const [
		enrollments,
		tradeItems,
		proposals,
		votes,
		messages,
		dealBoardItems,
		ratificationCalls,
	] = await Promise.all([
		supabase.from("students_classes").select("team_id").eq("class_id", classId),
		supabase
			.from("trade_items")
			.select("*")
			.eq("class_id", classId)
			.order("name", { ascending: true }),
		supabase
			.from("trade_proposals")
			.select("*, creator:created_by (full_name)")
			.eq("class_id", classId)
			.order("created_at", { ascending: true }),
		teamIds.length > 0
			? supabase
					.from("votes")
					.select("*, user:user_id (full_name)")
					.in("team_id", teamIds)
					.order("created_at", { ascending: true })
			: Promise.resolve({ data: [] as Vote[] }),
		supabase
			.from("messages")
			.select("*, users:sender_id (full_name)")
			.eq("class_id", classId)
			.order("created_at", { ascending: true }),
		supabase
			.from("deal_board_items")
			.select("*")
			.eq("class_id", classId)
			.order("created_at", { ascending: true }),
		supabase
			.from("deal_ratification_calls")
			.select("*")
			.eq("class_id", classId)
			.order("created_at", { ascending: true }),
	]);

	const teamMemberCounts: Record<string, number> = {};
	for (const row of enrollments.data ?? []) {
		if (!row.team_id) continue;
		teamMemberCounts[row.team_id] = (teamMemberCounts[row.team_id] ?? 0) + 1;
	}

	return {
		classRecord: classRecord as LiveClassRecord,
		teams: (teams ?? []) as RealtimeSnapshot["teams"],
		teamMemberCounts,
		tradeItems: (tradeItems.data ?? []) as TradeItem[],
		proposals: (proposals.data ?? []) as unknown as TradeProposal[],
		votes: (votes.data ?? []) as unknown as Vote[],
		messages: (messages.data ?? []) as unknown as Message[],
		dealBoardItems: (dealBoardItems.data ?? []) as DealBoardItem[],
		ratificationCalls: (ratificationCalls.data ?? []) as DealRatificationCall[],
	};
}
