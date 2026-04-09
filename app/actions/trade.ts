"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TradeItem = {
	id: string;
	class_id: string;
	team_id: string;
	name: string;
	value: number;
	created_at: string;
};

export async function getTeamTradeItems(
	classId: string,
	teamId: string,
): Promise<TradeItem[]> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	const { data, error } = await supabase
		.from("trade_items")
		.select("*")
		.eq("class_id", classId)
		.eq("team_id", teamId)
		.order("name", { ascending: true });

	if (error) {
		console.error("Error fetching trade items:", error);
		return [];
	}

	return data as TradeItem[];
}

export async function updateTradeItemValue(
	itemId: string,
	classId: string,
	newValue: number,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.update({ value: newValue })
		.eq("id", itemId);

	if (error) {
		console.error("Error updating trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function initializeTradeItems(
	classId: string,
	teamId: string,
	items: { name: string; value: number }[],
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const insertData = items.map((item) => ({
		class_id: classId,
		team_id: teamId,
		name: item.name,
		value: item.value,
	}));

	const { error } = await supabase.from("trade_items").insert(insertData);

	if (error) {
		console.error("Error initializing trade items:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}`);
	return { success: true };
}

export async function createTradeItem(
	classId: string,
	teamId: string,
	name: string,
	value: number,
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.insert({ class_id: classId, team_id: teamId, name, value });

	if (error) {
		console.error("Error creating trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}/items`);
	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}

export async function deleteTradeItem(classId: string, itemId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "Unauthorized" };

	const { error } = await supabase
		.from("trade_items")
		.delete()
		.eq("id", itemId);

	if (error) {
		console.error("Error deleting trade item:", error);
		return { error: error.message };
	}

	revalidatePath(`/instructor/classes/${classId}/items`);
	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}
