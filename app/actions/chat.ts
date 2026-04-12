"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Message = {
	id: string;
	class_id: string;
	sender_id: string;
	channel: string;
	content: string;
	created_at: string;
	client_message_id?: string | null;
	users?: { full_name: string | null };
	local_status?: "optimistic" | "failed";
};

export async function sendMessage(
	classId: string,
	channel: string,
	content: string,
	clientMessageId?: string,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user || !content.trim())
		return { error: "Unauthorized or empty message" };

	const { data, error } = await supabase
		.from("messages")
		.insert({
			class_id: classId,
			sender_id: user.id,
			channel: channel,
			content: content.trim(),
			client_message_id: clientMessageId ?? null,
		})
		.select(
			`
			*,
			users:sender_id (full_name)
		`,
		)
		.single();

	if (error || !data) {
		console.error("Error sending message:", error);
		if (error) {
			return { error: error.message };
		}
		return { error: "Unknown error sending message" };
	}

	// Usually realtime handles UI updates, but we can also revalidate
	// in case this is called in a context without realtime
	revalidatePath(`/student/simulation/${classId}`);
	return { success: true, message: data as Message };
}

export async function getMessages(
	classId: string,
	channel: string,
): Promise<Message[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	const { data, error } = await supabase
		.from("messages")
		.select(`
            *,
            users:sender_id (full_name)
        `)
		.eq("class_id", classId)
		.eq("channel", channel)
		.order("created_at", { ascending: false })
		.limit(100);

	if (error) {
		console.error("Error fetching messages:", error);
		return [];
	}

	// Cast the mapped data to Message Array to satisfy TS
	return (data as unknown as Message[]).reverse();
}

export async function getMessagesBefore(
	classId: string,
	channel: string,
	before: string,
	limit = 50,
): Promise<Message[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	const { data, error } = await supabase
		.from("messages")
		.select(
			`
            *,
            users:sender_id (full_name)
        `,
		)
		.eq("class_id", classId)
		.eq("channel", channel)
		.lt("created_at", before)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) {
		console.error("Error fetching older messages:", error);
		return [];
	}

	return (data as unknown as Message[]).reverse();
}
