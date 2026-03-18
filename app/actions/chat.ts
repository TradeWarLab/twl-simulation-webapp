"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Message = {
    id: string;
    class_id: string;
    sender_id: string;
    channel: string;
    content: string;
    created_at: string;
    users?: { full_name: string | null };
};

export async function sendMessage(classId: string, channel: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !content.trim()) return { error: "Unauthorized or empty message" };

    const { error } = await supabase
        .from("messages")
        .insert({
            class_id: classId,
            sender_id: user.id,
            channel: channel,
            content: content.trim()
        });

    if (error) {
        console.error("Error sending message:", error);
        return { error: error.message };
    }

    // Usually realtime handles UI updates, but we can also revalidate
    // in case this is called in a context without realtime
    revalidatePath(`/student/simulation/${classId}`);
    return { success: true };
}

export async function getMessages(classId: string, channel: string): Promise<Message[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("messages")
        .select(`
            *,
            users:sender_id (full_name)
        `)
        .eq("class_id", classId)
        .eq("channel", channel)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching messages:", error);
        return [];
    }

    // Cast the mapped data to Message Array to satisfy TS
    return (data as unknown) as Message[];
}
