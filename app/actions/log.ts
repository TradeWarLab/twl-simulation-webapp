"use server";

import { getTradeProposals } from "@/app/actions/trade-controller";
import { createClient } from "@/lib/supabase/server";

type MessageRecord = {
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

export type LogEvent =
	| { type: "message"; timestamp: string; data: MessageRecord }
	| {
			type: "trade";
			timestamp: string;
			data: Awaited<ReturnType<typeof getTradeProposals>>[0];
	  };

export async function getSimulationLog(classId: string): Promise<LogEvent[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	// Fetch messages
	const { data: messages, error: msgError } = await supabase
		.from("messages")
		.select(`
            *,
            sender:sender_id (full_name, email)
        `)
		.eq("class_id", classId)
		.order("created_at", { ascending: false });

	if (msgError) {
		console.error("Error fetching messages for log:", msgError);
	}

	// Fetch trade proposals
	const proposals = await getTradeProposals(classId);

	const logList: LogEvent[] = [];

	if (messages) {
		for (const msg of messages) {
			logList.push({
				type: "message",
				timestamp: msg.created_at,
				data: msg as unknown as MessageRecord,
			});
		}
	}

	if (proposals) {
		for (const prop of proposals) {
			logList.push({
				type: "trade",
				timestamp: prop.created_at,
				data: prop,
			});
		}
	}

	// Sort by chronological order (oldest first or newest first)
	// We'll give newest first
	logList.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	return logList;
}
