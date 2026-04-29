"use server";

import { getClassRoster } from "@/app/actions/classes";
import type {
	ClassRosterEntry,
	TeamCountry,
	TeamScore,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";
import { createClient } from "@/lib/supabase/server";

export type InstructorTeam = {
	id: string;
	country: TeamCountry;
};

export type InstructorMessage = {
	id: string;
	class_id: string;
	sender_id: string;
	channel: string;
	content: string;
	created_at: string;
	sender: {
		full_name: string | null;
		email: string | null;
	} | null;
};

export type InstructorDashboardSnapshot = {
	roster: ClassRosterEntry[];
	teams: InstructorTeam[];
	teamScores: TeamScore[];
	teamMemberCounts: Record<string, number>;
	tradeItems: TradeItem[];
	proposals: TradeProposal[];
	votes: Vote[];
	messages: InstructorMessage[];
};

export async function getInstructorDashboardSnapshot(
	classId: string,
): Promise<InstructorDashboardSnapshot> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return {
			roster: [],
			teams: [],
			teamScores: [],
			teamMemberCounts: {},
			tradeItems: [],
			proposals: [],
			votes: [],
			messages: [],
		};
	}

	const { data: classRow } = await supabase
		.from("classes")
		.select("id")
		.eq("id", classId)
		.eq("instructor_id", user.id)
		.single();

	if (!classRow) {
		return {
			roster: [],
			teams: [],
			teamScores: [],
			teamMemberCounts: {},
			tradeItems: [],
			proposals: [],
			votes: [],
			messages: [],
		};
	}

	const roster = await getClassRoster(classId);

	const [
		teamsResult,
		scoresResult,
		enrollmentCountsResult,
		tradeItemsResult,
		proposalsResult,
		votesResult,
		messagesResult,
	] = await Promise.all([
		supabase.from("teams").select("id, country").eq("class_id", classId),
		supabase
			.from("team_scores")
			.select(`
				*,
				team:team_id (country)
			`)
			.eq("class_id", classId),
		supabase.from("students_classes").select("team_id").eq("class_id", classId),
		supabase
			.from("trade_items")
			.select("*")
			.eq("class_id", classId)
			.order("name", { ascending: true }),
		supabase
			.from("trade_proposals")
			.select(`
				*,
				proposing_team:proposing_team_id (id, country),
				receiving_team:receiving_team_id (country),
				creator:created_by (full_name)
			`)
			.eq("class_id", classId)
			.order("created_at", { ascending: true }),
		supabase
			.from("votes")
			.select(`
				*,
				user:user_id (full_name)
			`)
			.in(
				"team_id",
				(
					(await supabase
						.from("teams")
						.select("id")
						.eq("class_id", classId)).data ?? []
				).map((team) => team.id),
			)
			.order("created_at", { ascending: true }),
		supabase
			.from("messages")
			.select(`
				*,
				sender:sender_id (full_name, email)
			`)
			.eq("class_id", classId)
			.order("created_at", { ascending: true })
			.limit(250),
	]);

	const teamMemberCounts: Record<string, number> = {};
	for (const row of enrollmentCountsResult.data ?? []) {
		if (!row.team_id) continue;
		teamMemberCounts[row.team_id] = (teamMemberCounts[row.team_id] ?? 0) + 1;
	}

	return {
		roster,
		teams: (teamsResult.data ?? []) as InstructorTeam[],
		teamScores: (scoresResult.data ?? []) as unknown as TeamScore[],
		teamMemberCounts,
		tradeItems: (tradeItemsResult.data ?? []) as TradeItem[],
		proposals: (proposalsResult.data ?? []) as unknown as TradeProposal[],
		votes: (votesResult.data ?? []) as unknown as Vote[],
		messages: (messagesResult.data ?? []) as unknown as InstructorMessage[],
	};
}
