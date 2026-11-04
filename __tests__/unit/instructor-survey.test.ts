import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildInstructorSheetRow,
	INSTRUCTOR_SHEET_COLUMNS,
	OUTSIDE_US,
	parseInstructorSurvey,
	STUDENT_LEVELS,
} from "@/lib/instructor-survey";

function validForm(): FormData {
	const form = new FormData();
	form.append("student_levels", STUDENT_LEVELS[2]);
	form.append("student_levels", STUDENT_LEVELS[0]);
	form.set("institution_type", "2-Year Community College");
	form.set("region", "South");
	return form;
}

function parse(form: FormData) {
	const result = parseInstructorSurvey(form);
	if ("error" in result) throw new Error(result.error);
	return result.answers;
}

describe("parseInstructorSurvey", () => {
	it("keeps every selected level, in question order", () => {
		expect(parse(validForm()).student_levels).toEqual([
			STUDENT_LEVELS[0],
			STUDENT_LEVELS[2],
		]);
	});

	it("rejects a missing required answer", () => {
		for (const field of ["student_levels", "institution_type", "region"]) {
			const form = validForm();
			form.delete(field);
			expect(parseInstructorSurvey(form)).toEqual({
				error: "Please answer every required question.",
			});
		}
	});

	it("rejects a value that is not an option", () => {
		const form = validForm();
		form.append("student_levels", "Kindergarten");
		expect(parseInstructorSurvey(form)).toHaveProperty("error");
	});

	it("stores the typed text for Other, and requires it", () => {
		const form = validForm();
		form.set("institution_type", "Other");
		expect(parseInstructorSurvey(form)).toHaveProperty("error");

		form.set("institution_type_other", "  Military academy ");
		expect(parse(form).institution_type).toBe("Military academy");
	});

	it("keeps the region detail only for outside the US", () => {
		const form = validForm();
		form.set("region_other", "Canada");
		expect(parse(form).region_other).toBe("");

		form.set("region", OUTSIDE_US);
		expect(parse(form).region_other).toBe("Canada");
	});

	it("rejects text over the length limit", () => {
		const form = validForm();
		form.set("anything_else", "x".repeat(2001));
		expect(parseInstructorSurvey(form)).toHaveProperty("error");
	});
});

describe("Instructor Sheet columns", () => {
	it("builds a row in column order", () => {
		const row = buildInstructorSheetRow({
			submittedAt: "2026-11-04T00:00:00.000Z",
			classId: "class-1",
			className: "POLS 170",
			instructorEmail: "prof@example.edu",
			answers: parse(validForm()),
		});
		expect(row).toHaveLength(INSTRUCTOR_SHEET_COLUMNS.length);
		expect(row[INSTRUCTOR_SHEET_COLUMNS.indexOf("student_levels")]).toBe(
			`${STUDENT_LEVELS[0]}; ${STUDENT_LEVELS[2]}`,
		);
		expect(row[INSTRUCTOR_SHEET_COLUMNS.indexOf("instructor_email")]).toBe(
			"prof@example.edu",
		);
	});

	it("matches the header row documented for the research Sheet", () => {
		const setup = readFileSync("docs/setup.md", "utf-8");
		expect(setup).toContain(INSTRUCTOR_SHEET_COLUMNS.join(", "));
	});
});
