/**
 * Post-simulation survey. Students answer it in the End period; submitting it
 * unlocks their results. Question text is from the research team.
 */

import type { TeamCountry } from "@/lib/types/domain";

/** Points on every agreement scale. Change here to move to an 11-point scale. */
export const SCALE_POINTS = 7;

export type SurveyQuestion =
	| { id: string; kind: "choice"; prompt: string; options: string[] }
	| { id: string; kind: "scale"; prompt: string; low: string; high: string };

export type SurveyAnswers = Record<string, string | number>;

/** Item 4 refers to a joint statement that exists only if a deal ratified. */
export function getSurveyQuestions(dealReached: boolean): SurveyQuestion[] {
	return [
		{
			id: "intention_accuracy",
			kind: "choice",
			prompt:
				"Which type of issue was the other team's highest priority in this negotiation?",
			options: [
				"Tariffs and trade balance",
				"Market access, investment, and treatment of companies and workers",
				"Technology, export controls, and intellectual property",
				"National security and sovereignty",
				"I could not tell",
			],
		},
		{
			id: "intention_understanding",
			kind: "scale",
			prompt:
				"How confident are you that you understood which issues the other team cared about most?",
			low: "Not at all confident",
			high: "Completely confident",
		},
		{
			id: "predictability",
			kind: "scale",
			prompt:
				"The other team's offers and counteroffers followed a pattern I could predict.",
			low: "Strongly disagree",
			high: "Strongly agree",
		},
		{
			id: "trust",
			kind: "scale",
			prompt: dealReached
				? "I believe the other team would carry out its commitments in the joint statement, even if doing so became costly for them."
				: "I believe the other team would have carried out its commitments in a joint statement, even if doing so became costly for them.",
			low: "Strongly disagree",
			high: "Strongly agree",
		},
		{
			id: "own_frustration",
			kind: "scale",
			prompt: "During the negotiation, how frustrated did you feel?",
			low: "Not at all",
			high: "Extremely",
		},
		{
			id: "other_frustration",
			kind: "scale",
			prompt:
				"During the negotiation, how frustrated do you think the other team felt?",
			low: "Not at all",
			high: "Extremely",
		},
		{
			id: "nonverbal_reliance",
			kind: "scale",
			prompt:
				"How much did the other team's tone of voice, facial expressions, or body language shape your sense of their intentions?",
			low: "Not at all",
			high: "A great deal",
		},
		{
			id: "communication_mode",
			kind: "choice",
			prompt: "How did your team negotiate with the other team?",
			options: ["Face-to-face", "Zoom, audio only"],
		},
	];
}

/**
 * Reads and checks every answer. Server-side: the browser's `required` and
 * option lists are not a guarantee.
 */
export function parseSurveyAnswers(
	formData: FormData,
	questions: SurveyQuestion[],
): { answers: SurveyAnswers } | { error: string } {
	const answers: SurveyAnswers = {};

	for (const question of questions) {
		const raw = formData.get(question.id);
		if (typeof raw !== "string" || raw.length === 0) {
			return { error: "Please answer every question." };
		}

		if (question.kind === "choice") {
			if (!question.options.includes(raw)) {
				return { error: "One of the answers is not a valid option." };
			}
			answers[question.id] = raw;
		} else {
			const value = Number(raw);
			if (!Number.isInteger(value) || value < 1 || value > SCALE_POINTS) {
				return { error: "One of the answers is not a valid option." };
			}
			answers[question.id] = value;
		}
	}

	return { answers };
}

/** Column order of the research Sheet. Its first row must match. */
export const SHEET_COLUMNS = [
	"submitted_at",
	"class_id",
	"class_name",
	"team",
	"student_id",
	"own_no_deal_cost",
	"deal_reached",
	...getSurveyQuestions(true).map((question) => question.id),
];

export function buildSheetRow(details: {
	submittedAt: string;
	classId: string;
	className: string;
	team: TeamCountry;
	studentId: string;
	ownNoDealCost: number | null;
	dealReached: boolean;
	answers: SurveyAnswers;
}): (string | number)[] {
	return [
		details.submittedAt,
		details.classId,
		details.className,
		details.team,
		details.studentId,
		details.ownNoDealCost ?? "",
		details.dealReached ? "yes" : "no",
		...getSurveyQuestions(details.dealReached).map(
			(question) => details.answers[question.id],
		),
	];
}
