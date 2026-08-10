import { describe, expect, it } from "vitest";
import {
	buildIntakeSurveyUrl,
	INTAKE_SURVEY_FORM_URL,
	isIntakeSurveyConfigured,
} from "@/lib/intake-survey";

const ENTRY = "entry.123456789";

describe("isIntakeSurveyConfigured", () => {
	it("is true for the shipped form URL", () => {
		expect(isIntakeSurveyConfigured()).toBe(true);
	});

	it("is false when the form URL is blank", () => {
		expect(isIntakeSurveyConfigured("")).toBe(false);
	});
});

describe("buildIntakeSurveyUrl", () => {
	it("prefills the class name when an entry id is configured", () => {
		const url = buildIntakeSurveyUrl("POLS 170", ENTRY);
		expect(url).toContain("usp=pp_url");
		expect(url).toContain(`${ENTRY}=POLS+170`);
	});

	it("percent-encodes characters that are unsafe in a query string", () => {
		const url = buildIntakeSurveyUrl("Econ & Trade / 2026", ENTRY);
		expect(url).toContain("Econ+%26+Trade+%2F+2026");
	});

	it("returns the bare form URL when no entry id is configured", () => {
		expect(buildIntakeSurveyUrl("POLS 170", "")).toBe(INTAKE_SURVEY_FORM_URL);
	});

	it("returns the bare form URL when the class name is blank", () => {
		expect(buildIntakeSurveyUrl("   ", ENTRY)).toBe(INTAKE_SURVEY_FORM_URL);
	});

	it("trims the class name before prefilling", () => {
		expect(buildIntakeSurveyUrl("  Econ  ", ENTRY)).toContain(`${ENTRY}=Econ`);
	});
});
