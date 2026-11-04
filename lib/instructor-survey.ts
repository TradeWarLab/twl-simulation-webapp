/**
 * Instructor intake survey. Answered in the Create Class form, once per class.
 * Question text is from the research team's former Google Form.
 */

export const STUDENT_LEVELS = [
	"Entry Level: Introductory or broad courses not focused specifically on this topic",
	"Upper Level: Advanced courses focused on US-China relations",
	"Graduate: Master's students or above",
];

/** "Other" adds a free-text field. The text is stored in place of "Other". */
export const INSTITUTION_TYPES = [
	"2-Year Community College",
	"4-Year Public University",
	"4-Year Private University",
	"Other",
];

export const OUTSIDE_US = "Outside the United States";

export const REGIONS = ["Northeast", "Midwest", "South", "West Coast", OUTSIDE_US];

const MAX_SHORT_TEXT = 200;
const MAX_LONG_TEXT = 2000;

export type InstructorSurveyAnswers = {
	student_levels: string[];
	institution_type: string;
	region: string;
	region_other: string;
	anything_else: string;
};

function text(formData: FormData, name: string): string {
	const raw = formData.get(name);
	return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Reads and checks every answer. Server-side: the browser's `required` and
 * option lists are not a guarantee.
 */
export function parseInstructorSurvey(
	formData: FormData,
): { answers: InstructorSurveyAnswers } | { error: string } {
	const levels = formData
		.getAll("student_levels")
		.filter((value): value is string => typeof value === "string");
	const institution = text(formData, "institution_type");
	const institutionOther = text(formData, "institution_type_other");
	const region = text(formData, "region");
	const regionOther = text(formData, "region_other");
	const anythingElse = text(formData, "anything_else");

	if (
		levels.length === 0 ||
		!institution ||
		!region ||
		(institution === "Other" && !institutionOther)
	) {
		return { error: "Please answer every required question." };
	}
	if (
		!levels.every((level) => STUDENT_LEVELS.includes(level)) ||
		!INSTITUTION_TYPES.includes(institution) ||
		!REGIONS.includes(region)
	) {
		return { error: "One of the answers is not a valid option." };
	}
	if (
		institutionOther.length > MAX_SHORT_TEXT ||
		regionOther.length > MAX_SHORT_TEXT ||
		anythingElse.length > MAX_LONG_TEXT
	) {
		return { error: "One of the answers is too long." };
	}

	return {
		answers: {
			student_levels: STUDENT_LEVELS.filter((level) => levels.includes(level)),
			institution_type: institution === "Other" ? institutionOther : institution,
			// Only asked for when the region is outside the US.
			region_other: region === OUTSIDE_US ? regionOther : "",
			region,
			anything_else: anythingElse,
		},
	};
}

/** Column order of the research Sheet tab. Its first row must match. */
export const INSTRUCTOR_SHEET_COLUMNS = [
	"submitted_at",
	"class_id",
	"class_name",
	"instructor_email",
	"student_levels",
	"institution_type",
	"region",
	"region_other",
	"anything_else",
];

export function buildInstructorSheetRow(details: {
	submittedAt: string;
	classId: string;
	className: string;
	instructorEmail: string;
	answers: InstructorSurveyAnswers;
}): string[] {
	return [
		details.submittedAt,
		details.classId,
		details.className,
		details.instructorEmail,
		details.answers.student_levels.join("; "),
		details.answers.institution_type,
		details.answers.region,
		details.answers.region_other,
		details.answers.anything_else,
	];
}
