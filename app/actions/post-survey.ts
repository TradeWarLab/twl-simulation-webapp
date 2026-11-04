"use server";

import { revalidatePath } from "next/cache";
import {
	getNoDealCosts,
	getScoreboard,
} from "@/app/actions/trade-controller";
import { appendSheetRow } from "@/lib/google-sheets";
import {
	buildSheetRow,
	getSurveyQuestions,
	parseSurveyAnswers,
} from "@/lib/post-survey";
import { createClient } from "@/lib/supabase/server";
import type { TeamCountry } from "@/lib/types/domain";

/** True once the student has submitted the survey for this class. */
export async function hasSubmittedPostSurvey(classId: string): Promise<boolean> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return false;

	const { data, error } = await supabase
		.from("survey_responses")
		.select("id")
		.eq("class_id", classId)
		.eq("student_id", user.id)
		.maybeSingle();

	if (error) {
		console.error("Error checking survey response:", error);
		return false;
	}
	return data !== null;
}

/**
 * Saves the student's answers, then appends them to the research Sheet.
 *
 * Supabase first: its row unlocks results, and its unique key stops a double
 * submit from adding a second Sheet row. A failed Sheet append does not block
 * the student; the answers stay in survey_responses.
 */
export async function submitPostSurvey(classId: string, formData: FormData) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { error: "Not signed in." };

	const { data: enrollment } = await supabase
		.from("students_classes")
		.select("team_id, teams (country), classes (name, current_period)")
		.eq("class_id", classId)
		.eq("student_id", user.id)
		.single();

	const team = Array.isArray(enrollment?.teams)
		? enrollment.teams[0]
		: enrollment?.teams;
	const classRecord = Array.isArray(enrollment?.classes)
		? enrollment.classes[0]
		: enrollment?.classes;

	if (!enrollment?.team_id || !team || !classRecord) {
		return { error: "You are not on a team in this class." };
	}
	if (classRecord.current_period !== 3) {
		return { error: "The survey opens when the simulation ends." };
	}

	const dealReached = (await getScoreboard(classId)).length > 0;
	const parsed = parseSurveyAnswers(formData, getSurveyQuestions(dealReached));
	if ("error" in parsed) return { error: parsed.error };

	const { error: insertError } = await supabase.from("survey_responses").insert({
		class_id: classId,
		student_id: user.id,
		team_id: enrollment.team_id,
		answers: parsed.answers,
	});

	// 23505: already submitted. The first submit wrote the Sheet row.
	if (insertError && insertError.code !== "23505") {
		console.error("Error saving survey response:", insertError);
		return { error: "Your answers could not be saved. Please try again." };
	}

	if (!insertError) {
		const country = team.country as TeamCountry;
		const costs = await getNoDealCosts(classId);
		try {
			await appendSheetRow(
				buildSheetRow({
					submittedAt: new Date().toISOString(),
					classId,
					className: classRecord.name,
					team: country,
					studentId: user.id,
					ownNoDealCost: costs[country],
					dealReached,
					answers: parsed.answers,
				}),
			);
		} catch (error) {
			console.error(
				"Survey Sheet append failed; the response is kept in survey_responses:",
				error,
			);
		}
	}

	revalidatePath(`/student/simulation/${classId}`);
	return { success: true };
}
