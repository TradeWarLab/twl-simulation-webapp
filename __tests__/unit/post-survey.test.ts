import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildSheetRow,
	getSurveyQuestions,
	parseSurveyAnswers,
	SHEET_COLUMNS,
} from "@/lib/post-survey";

const QUESTIONS = getSurveyQuestions(true);

function validForm(): FormData {
	const form = new FormData();
	for (const question of QUESTIONS) {
		form.set(
			question.id,
			question.kind === "choice" ? question.options[0] : "4",
		);
	}
	return form;
}

describe("getSurveyQuestions", () => {
	it("refers to the joint statement only when a deal ratified", () => {
		const trust = (deal: boolean) =>
			getSurveyQuestions(deal).find((q) => q.id === "trust")?.prompt;
		expect(trust(true)).toMatch(
			/would carry out its commitments in the joint statement/,
		);
		expect(trust(false)).toMatch(
			/would have carried out its commitments in a joint statement/,
		);
	});

	it("asks for the communication mode", () => {
		expect(QUESTIONS.map((q) => q.id)).toContain("communication_mode");
	});
});

describe("parseSurveyAnswers", () => {
	it("returns choices as text and scales as numbers", () => {
		const result = parseSurveyAnswers(validForm(), QUESTIONS);
		if ("error" in result) throw new Error(result.error);
		expect(result.answers.intention_accuracy).toBe(
			"Tariffs and trade balance",
		);
		expect(result.answers.trust).toBe(4);
	});

	it("rejects a missing answer", () => {
		const form = validForm();
		form.delete("trust");
		expect(parseSurveyAnswers(form, QUESTIONS)).toEqual({
			error: "Please answer every question.",
		});
	});

	it("rejects a scale value outside 1 to 7", () => {
		for (const bad of ["0", "8", "2.5", "x"]) {
			const form = validForm();
			form.set("predictability", bad);
			expect(parseSurveyAnswers(form, QUESTIONS)).toHaveProperty("error");
		}
	});

	it("rejects a choice that is not an option", () => {
		const form = validForm();
		form.set("communication_mode", "Carrier pigeon");
		expect(parseSurveyAnswers(form, QUESTIONS)).toHaveProperty("error");
	});
});

describe("Sheet columns", () => {
	it("builds a row in column order", () => {
		const result = parseSurveyAnswers(validForm(), QUESTIONS);
		if ("error" in result) throw new Error(result.error);
		const row = buildSheetRow({
			submittedAt: "2026-11-02T00:00:00.000Z",
			classId: "class-1",
			className: "POLS 170",
			team: "China",
			studentId: "user-1",
			ownNoDealCost: -20,
			dealReached: false,
			answers: result.answers,
		});
		expect(row).toHaveLength(SHEET_COLUMNS.length);
		expect(row.slice(0, 7)).toEqual([
			"2026-11-02T00:00:00.000Z",
			"class-1",
			"POLS 170",
			"China",
			"user-1",
			-20,
			"no",
		]);
		expect(row[SHEET_COLUMNS.indexOf("trust")]).toBe(4);
	});

	it("matches the header row documented for the research Sheet", () => {
		const setup = readFileSync("docs/setup.md", "utf-8");
		expect(setup).toContain(SHEET_COLUMNS.join(", "));
	});
});
