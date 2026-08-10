/**
 * Instructor intake questionnaire (Google Form).
 *
 * Answered once per class, before the simulation runs. Responses land in a
 * single linked spreadsheet. The prefilled class name is what ties a row back
 * to a `classes` record, together with the instructor's verified email — which
 * the form collects itself via Settings → Collect email addresses → Verified,
 * so it needs no entry id here.
 */

/**
 * Canonical share URL. This is the `/viewform` address; the editor's
 * `?usp=publish-editor` link is not shareable.
 */
export const INTAKE_SURVEY_FORM_URL =
	"https://docs.google.com/forms/d/e/1FAIpQLSfaNZEmc3f1mGfkebJyjekENLVloRrs_KXKltqsDPWJWjJtuA/viewform";

/**
 * Entry id of the form's "Class name" short-answer question.
 *
 * Obtain via ⋮ → "Get pre-filled link" in the Form editor: fill the class-name
 * field with any value, copy the generated URL, and read `entry.<id>` from it.
 * Stable across edits to the question's *text*, NOT across deleting and
 * recreating the question. Empty disables prefill — the link still works.
 */
export const INTAKE_SURVEY_CLASS_NAME_ENTRY = "";

/**
 * False when no form URL is configured. The questionnaire block is then hidden
 * and class creation is ungated, rather than shipping a broken link — the same
 * degradation `sendStudentInviteEmail` uses when RESEND_API_KEY is absent.
 */
export function isIntakeSurveyConfigured(
	formUrl: string = INTAKE_SURVEY_FORM_URL,
): boolean {
	return formUrl.length > 0;
}

/**
 * Form URL with the class name prefilled, when both an entry id and a name are
 * available. Otherwise the bare form URL, which is still a working link.
 */
export function buildIntakeSurveyUrl(
	className: string,
	entryId: string = INTAKE_SURVEY_CLASS_NAME_ENTRY,
	formUrl: string = INTAKE_SURVEY_FORM_URL,
): string {
	const trimmed = className.trim();
	if (!entryId || trimmed.length === 0) return formUrl;

	const params = new URLSearchParams({ usp: "pp_url", [entryId]: trimmed });
	return `${formUrl}?${params.toString()}`;
}
