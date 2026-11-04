import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitPostSurvey } from "@/app/actions/post-survey";
import { appendSheetRow } from "@/lib/google-sheets";
import { getSurveyQuestions } from "@/lib/post-survey";
import { mockClient } from "../helpers/supabase-mock";

vi.mock("@/lib/google-sheets", () => ({ appendSheetRow: vi.fn() }));

function validForm(): FormData {
	const form = new FormData();
	for (const question of getSurveyQuestions(false)) {
		form.set(
			question.id,
			question.kind === "choice" ? question.options[0] : "5",
		);
	}
	return form;
}

function mockEnrollment(currentPeriod: number) {
	mockClient._mockTable("students_classes", {
		data: {
			team_id: "team-usa",
			teams: { country: "USA" },
			classes: { name: "POLS 170", current_period: currentPeriod },
		},
		error: null,
	});
	// No team_scores rows: no deal.
	mockClient._mockTable("team_scores", { data: [], error: null });
	mockClient.rpc.mockResolvedValue({
		data: [{ country: "USA", cost: 0 }],
		error: null,
	});
}

describe("submitPostSurvey", () => {
	beforeEach(() => {
		vi.mocked(appendSheetRow).mockReset();
	});

	it("saves the answers, then appends a row with the student's own cost", async () => {
		mockEnrollment(3);
		mockClient._mockTable("survey_responses", { data: null, error: null });

		expect(await submitPostSurvey("class-1", validForm())).toEqual({
			success: true,
		});

		const insert = mockClient._builders.get("survey_responses")?.insert;
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				class_id: "class-1",
				student_id: "user-1",
				team_id: "team-usa",
				answers: expect.objectContaining({ trust: 5 }),
			}),
		);
		const row = vi.mocked(appendSheetRow).mock.calls[0][0];
		expect(row.slice(1, 7)).toEqual([
			"class-1",
			"POLS 170",
			"USA",
			"user-1",
			0,
			"no",
		]);
	});

	it("refuses before the simulation has ended", async () => {
		mockEnrollment(2);
		expect(await submitPostSurvey("class-1", validForm())).toHaveProperty(
			"error",
		);
		expect(appendSheetRow).not.toHaveBeenCalled();
	});

	it("refuses incomplete answers without saving", async () => {
		mockEnrollment(3);
		const form = validForm();
		form.delete("trust");
		expect(await submitPostSurvey("class-1", form)).toEqual({
			error: "Please answer every question.",
		});
		expect(mockClient._builders.get("survey_responses")).toBeUndefined();
	});

	it("does not append a second row for a repeat submit", async () => {
		mockEnrollment(3);
		mockClient._mockTable("survey_responses", {
			data: null,
			error: { message: "duplicate", code: "23505" } as never,
		});
		expect(await submitPostSurvey("class-1", validForm())).toEqual({
			success: true,
		});
		expect(appendSheetRow).not.toHaveBeenCalled();
	});

	it("still unlocks results when the Sheet append fails", async () => {
		mockEnrollment(3);
		mockClient._mockTable("survey_responses", { data: null, error: null });
		vi.mocked(appendSheetRow).mockRejectedValue(new Error("403"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		expect(await submitPostSurvey("class-1", validForm())).toEqual({
			success: true,
		});
	});

	it("reports a failed save so the student can retry", async () => {
		mockEnrollment(3);
		mockClient._mockTable("survey_responses", {
			data: null,
			error: { message: "boom" },
		});
		vi.spyOn(console, "error").mockImplementation(() => {});

		expect(await submitPostSurvey("class-1", validForm())).toHaveProperty(
			"error",
		);
		expect(appendSheetRow).not.toHaveBeenCalled();
	});
});
