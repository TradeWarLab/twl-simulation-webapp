"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStudentTeam(
    classId: string, 
    userId: string, 
    newTeamCountry: "USA" | "China" | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    // Find the class team by country
    let newTeamId = null;
    if (newTeamCountry) {
        const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("id")
            .eq("class_id", classId)
            .eq("country", newTeamCountry)
            .single();

        if (teamError || !teamData) {
            return { error: `Team ${newTeamCountry} not found for this class` };
        }
        newTeamId = teamData.id;
    }

    const { error } = await supabase
        .from("students_classes")
        .update({ team_id: newTeamId })
        .eq("class_id", classId)
        .eq("student_id", userId);

    if (error) {
        console.error("Failed to update student team:", error);
        return { error: "Failed to update team" };
    }

    revalidatePath(`/instructor/classes/${classId}/teams`);
    return { success: true };
}

export async function updateInviteAffiliation(
    classId: string,
    email: string,
    newTeamCountry: "USA" | "China"
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const { error } = await supabase
        .from("class_invites")
        .update({ affiliation: newTeamCountry })
        .eq("class_id", classId)
        .eq("email", email);

    if (error) {
        console.error("Failed to update invite affiliation:", error);
        return { error: "Failed to update invite" };
    }

    revalidatePath(`/instructor/classes/${classId}/teams`);
    return { success: true };
}

export async function updateStudentInterest(
    classId: string, 
    userId: string, 
    newInterest: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const { error } = await supabase
        .from("students_classes")
        .update({ interest_block: newInterest })
        .eq("class_id", classId)
        .eq("student_id", userId);

    if (error) {
        console.error("Failed to update student interest:", error);
        return { error: "Failed to update interest group" };
    }

    revalidatePath(`/instructor/classes/${classId}/teams`);
    return { success: true };
}

export async function updateInviteInterest(
    classId: string,
    email: string,
    newInterest: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const { error } = await supabase
        .from("class_invites")
        .update({ interest_block: newInterest })
        .eq("class_id", classId)
        .eq("email", email);

    if (error) {
        console.error("Failed to update invite interest:", error);
        return { error: "Failed to update invite" };
    }

    revalidatePath(`/instructor/classes/${classId}/teams`);
    return { success: true };
}
