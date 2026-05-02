"use server";

import { getTradeProposals } from "@/app/actions/trade-controller";
import { createClient } from "@/lib/supabase/server";
import type {
	TeamCountry,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";

export type MessageRecord = {
	id: string;
	class_id: string;
	sender_id: string;
	channel: string;
	content: string;
	created_at: string;
	sender: {
		full_name: string | null;
		email: string;
	} | null;
};

export type LogTeam = {
	id: string;
	country: TeamCountry;
};

export type LogUser = {
	id: string;
	full_name: string | null;
	email: string | null;
};

export type SimulationLogSnapshot = {
	messages: MessageRecord[];
	tradeItems: TradeItem[];
	proposals: TradeProposal[];
	votes: Vote[];
	teams: LogTeam[];
	users: LogUser[];
};

export type LogEvent =
	| { type: "message"; timestamp: string; data: MessageRecord }
	| {
			type: "trade";
			timestamp: string;
			data: Awaited<ReturnType<typeof getTradeProposals>>[0];
	  };

export async function getSimulationLog(classId: string): Promise<LogEvent[]> {
	const snapshot = await getSimulationLogSnapshot(classId);
	const logList: LogEvent[] = [];

	for (const msg of snapshot.messages) {
		logList.push({
			type: "message",
			timestamp: msg.created_at,
			data: msg,
		});
	}

	for (const prop of snapshot.proposals) {
		logList.push({
			type: "trade",
			timestamp: prop.created_at,
			data: prop,
		});
	}

	logList.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	return logList;
}

export async function getSimulationLogSnapshot(
	classId: string,
): Promise<SimulationLogSnapshot> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return {
			messages: [],
			tradeItems: [],
			proposals: [],
			votes: [],
			teams: [],
			users: [],
		};
	}

	const [messagesResult, tradeItemsResult, teamsResult, enrollmentsResult] =
		await Promise.all([
			supabase
				.from("messages")
				.select(`
            *,
            sender:sender_id (full_name, email)
        `)
				.eq("class_id", classId)
				.order("created_at", { ascending: true }),
			supabase
				.from("trade_items")
				.select("*")
				.eq("class_id", classId)
				.order("name", { ascending: true }),
			supabase.from("teams").select("id, country").eq("class_id", classId),
			supabase
				.from("students_classes")
				.select("student_id")
				.eq("class_id", classId),
		]);

	if (messagesResult.error) {
		console.error("Error fetching messages for log:", messagesResult.error);
	}
	if (tradeItemsResult.error) {
		console.error(
			"Error fetching trade items for log:",
			tradeItemsResult.error,
		);
	}
	if (teamsResult.error) {
		console.error("Error fetching teams for log:", teamsResult.error);
	}

	const teams = (teamsResult.data ?? []) as LogTeam[];
	const teamIds = teams.map((team) => team.id);
	const studentIds = (enrollmentsResult.data ?? [])
		.map((row) => row.student_id)
		.filter(Boolean);

	const [votesResult, usersResult] = await Promise.all([
		teamIds.length > 0
			? supabase
					.from("votes")
					.select(`
						*,
						user:user_id (full_name)
					`)
					.in("team_id", teamIds)
					.order("created_at", { ascending: true })
			: Promise.resolve({ data: [], error: null }),
		studentIds.length > 0
			? supabase
					.from("users")
					.select("id, full_name, email")
					.in("id", studentIds)
			: Promise.resolve({ data: [], error: null }),
	]);

	if (votesResult.error) {
		console.error("Error fetching votes for log:", votesResult.error);
	}
	if (usersResult.error) {
		console.error("Error fetching users for log:", usersResult.error);
	}

	const proposals = await getTradeProposals(classId);

	return {
		messages: (messagesResult.data ?? []) as unknown as MessageRecord[],
		tradeItems: (tradeItemsResult.data ?? []) as TradeItem[],
		proposals,
		votes: (votesResult.data ?? []) as unknown as Vote[],
		teams,
		users: (usersResult.data ?? []) as LogUser[],
	};
}
