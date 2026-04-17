"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Briefing } from "@/lib/types/domain";


export async function getClassBriefings(classId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

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

export async function getStudentBriefings(
	classId: string,
	teamCountry: string | null,
	interestGroup: string | null,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	let query = supabase
		.from("briefings")
		.select("*")
		.eq("class_id", classId)
		.order("created_at", { ascending: false });

	// In a real app we might construct an `or` string, but we can also fetch all and filter
	// because Supabase SDK's `.or` is sometimes tricky with nulls.
	// However, `.or` works well too:
	if (teamCountry) {
		const orConditions = [
			`target_role.eq.All`,
			`target_role.eq.${teamCountry}`,
		];
		query = query.or(orConditions.join(","));
	} else {
		query = query.eq("target_role", "All");
	}

	const { data, error } = await query;

	if (error) {
		console.error("Error fetching student briefings:", error);
		return [];
	}

	// Filter by interest group in memory for simplicity to handle null logic safely
	const filtered = (data || []).filter((briefing: Briefing) => {
		if (!briefing.interest_group || briefing.interest_group === "All")
			return true;
		return briefing.interest_group === interestGroup;
	});

	return filtered;
}

export async function deleteBriefing(classId: string, briefingId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

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
