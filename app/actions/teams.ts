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

    // Find the class team by country, auto-create if missing
    let newTeamId = null;
    if (newTeamCountry) {
        const { data: teamData } = await supabase
            .from("teams")
            .select("id")
            .eq("class_id", classId)
            .eq("country", newTeamCountry)
            .maybeSingle();

        if (teamData?.id) {
            newTeamId = teamData.id;
        } else {
            // Team doesn't exist yet — create it on the fly
            const { data: createdTeam, error: createError } = await supabase
                .from("teams")
                .insert({ class_id: classId, country: newTeamCountry })
                .select("id")
                .single();

            if (createError || !createdTeam) {
                console.error("Error auto-creating team:", createError);
                return { error: `Failed to create Team ${newTeamCountry}` };
            }
            newTeamId = createdTeam.id;
        }
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

export async function removeStudentFromClass(
    classId: string,
    email: string,
    userId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    const { data: classRow, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("id", classId)
        .eq("instructor_id", user.id)
        .single();

    if (classError || !classRow) {
        return { error: "Unauthorized" };
    }

    let resolvedUserId = userId ?? null;

    if (!resolvedUserId) {
        const { data: foundUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();
        resolvedUserId = foundUser?.id ?? null;
    }

    if (resolvedUserId) {
        const { error: enrollmentError } = await supabase
            .from("students_classes")
            .delete()
            .eq("class_id", classId)
            .eq("student_id", resolvedUserId);

        if (enrollmentError) {
            console.error("Failed to remove student enrollment:", enrollmentError);
            return { error: "Failed to remove student enrollment" };
        }
    }

    const { error: inviteError } = await supabase
        .from("class_invites")
        .delete()
        .eq("class_id", classId)
        .eq("email", email.toLowerCase());

    if (inviteError) {
        console.error("Failed to remove class invite:", inviteError);
        return { error: "Failed to remove class invite" };
    }

    revalidatePath(`/instructor/classes/${classId}`);
    revalidatePath(`/instructor/classes/${classId}/teams`);
    return { success: true };
}
