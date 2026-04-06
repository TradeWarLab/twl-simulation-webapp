"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBriefing(classId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const target_role = formData.get("target_role") as "USA" | "China" | "All";

    if (!title || !content || !target_role) {
        return { error: "Missing required fields" };
    }

    const { error } = await supabase.from("briefings").insert({
        class_id: classId,
        title,
        content,
        target_role
    });

    if (error) {
        console.error("Failed to insert briefing:", error);
        return { error: "Failed to create briefing" };
    }

    revalidatePath(`/instructor/classes/${classId}/briefings`);
    return { success: true };
}

export async function getClassBriefings(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching briefings:", error);
        return [];
    }

    return data || [];
}

export async function deleteBriefing(classId: string, briefingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const { error } = await supabase
        .from("briefings")
        .delete()
        .eq("id", briefingId)
        .eq("class_id", classId);

    if (error) {
        console.error("Failed to delete briefing:", error);
        return { error: "Failed to delete briefing" };
    }

    revalidatePath(`/instructor/classes/${classId}/briefings`);
    return { success: true };
}
