"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const supabase = await createClient();

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		return { error: error.message };
	}

	// Check user role to redirect appropriately
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (user) {
		const { data: profile } = await supabase
			.from("users")
			.select("role")
			.eq("id", user.id)
			.single();

		if (profile?.role === "instructor") {
			redirect("/instructor/dashboard");
		} else {
			redirect("/student/dashboard");
		}
	}

	redirect("/student/dashboard");
}

export async function signUp(formData: FormData) {
	const origin = (await headers()).get("origin");
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const full_name = formData.get("full_name") as string;
	const role = (formData.get("role") as string) || "student"; // Default to student
	const class_code = (formData.get("class_code") as string)?.trim() || null;

	const supabase = await createClient();

	// If a student provided a class code, validate it exists before creating the account
	let validatedClassId: string | null = null;
	if (role !== "instructor" && class_code) {
		const { data: classRecord, error: classLookupError } = await supabase
			.from("classes")
			.select("id")
			.ilike("class_code", class_code)
			.single();

		if (classLookupError || !classRecord) {
			return {
				error: `Class code "${class_code}" was not found. Please double-check the code your instructor gave you and try again.`,
			};
		}
		validatedClassId = classRecord.id;
	}

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				full_name,
				role,
				class_code: class_code || null,
			},
			emailRedirectTo: `${origin}/auth/confirm`,
		},
	});

	if (error) {
		return { error: error.message };
	}

	// If email confirmation is disabled, the user is signed in immediately
	if (data.session && data.user) {
		// Repair enrollment: the DB trigger may have enrolled without team/interest
		// if the invite lookup failed. Fix it here using the validated class info.
		if (role !== "instructor" && validatedClassId) {
			await repairEnrollment(supabase, data.user.id, email, validatedClassId);
		}

		const { data: profile } = await supabase
			.from("users")
			.select("role")
			.eq("id", data.user.id)
			.single();

		if (profile?.role === "instructor") {
			redirect("/instructor/dashboard");
		} else {
			redirect("/student/dashboard");
		}
	}

	return { success: true };
}

/**
 * After sign-up, ensure the student's enrollment has the correct team and
 * interest group from a matching invite. The DB trigger `handle_new_user`
 * attempts this, but can fail if the invite lookup doesn't match. This
 * function acts as a safety net.
 */
async function repairEnrollment(
	supabase: Awaited<ReturnType<typeof createClient>>,
	userId: string,
	userEmail: string,
	classId: string,
) {
	// Look up the matching invite
	const { data: invite } = await supabase
		.from("class_invites")
		.select("affiliation, interest_block")
		.eq("class_id", classId)
		.ilike("email", userEmail)
		.order("invited_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	// Resolve team_id from invite affiliation
	let teamId: string | null = null;
	const interestBlock: string | null = invite?.interest_block ?? null;

	if (invite?.affiliation) {
		const { data: team } = await supabase
			.from("teams")
			.select("id")
			.eq("class_id", classId)
			.eq("country", invite.affiliation)
			.maybeSingle();

		teamId = team?.id ?? null;
	}

	// Upsert the enrollment — updates team/interest if already enrolled by trigger
	await supabase.from("students_classes").upsert(
		{
			student_id: userId,
			class_id: classId,
			team_id: teamId,
			interest_block: interestBlock,
		},
		{ onConflict: "student_id,class_id" },
	);

	// Mark the invite as consumed
	if (invite) {
		await supabase
			.from("class_invites")
			.update({ status: "account_created" })
			.eq("class_id", classId)
			.ilike("email", userEmail);
	}
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect("/auth/login");
}
