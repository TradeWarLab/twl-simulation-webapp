import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClass } from "@/app/actions/classes";
import { CreateClassForm } from "@/components/instructor/create-class-form";

vi.mock("@/app/actions/classes", () => ({
	createClass: vi.fn(),
}));

describe("CreateClassForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders required elements", () => {
		render(<CreateClassForm />);
		expect(screen.getByText("Create New Class")).toBeInTheDocument();
		expect(screen.getByLabelText(/Class Name/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create Class" }),
		).toBeInTheDocument();
	});

	it("renders the NotebookLM URL field with a default value", () => {
		render(<CreateClassForm />);
		const urlInput = screen.getByLabelText(/NotebookLM URL/i);
		expect(urlInput).toBeInTheDocument();
		expect(urlInput).toHaveValue(
			"https://notebooklm.google.com/notebook/6a4d5fed-304b-4640-b573-ae55edd18d91",
		);
	});

	it("disables submit until the questionnaire checkbox is ticked", () => {
		render(<CreateClassForm />);
		expect(
			screen.getByRole("button", { name: "Create Class" }),
		).toBeDisabled();

		fireEvent.click(screen.getByLabelText(/completed the instructor questionnaire/i));

		expect(screen.getByRole("button", { name: "Create Class" })).toBeEnabled();
	});

	it("does not call createClass while the questionnaire is unconfirmed", () => {
		const mockCreate = vi.mocked(createClass) as unknown as ReturnType<
			typeof vi.fn
		>;
		render(<CreateClassForm />);

		const form = screen
			.getByRole("button", { name: "Create Class" })
			.closest("form");
		if (form) fireEvent.submit(form);

		expect(mockCreate).not.toHaveBeenCalled();
	});

	it("submits once the questionnaire is confirmed", () => {
		const mockCreate = vi.mocked(createClass) as unknown as ReturnType<
			typeof vi.fn
		>;
		mockCreate.mockResolvedValueOnce(undefined);

		render(<CreateClassForm />);

		fireEvent.change(screen.getByLabelText(/Class Name/i), {
			target: { value: "Advanced Econ" },
		});
		fireEvent.click(screen.getByLabelText(/completed the instructor questionnaire/i));

		const form = screen
			.getByRole("button", { name: "Create Class" })
			.closest("form");
		if (form) fireEvent.submit(form);

		expect(mockCreate).toHaveBeenCalledTimes(1);
	});

	it("points the questionnaire link at the configured form", () => {
		render(<CreateClassForm />);
		const link = screen.getByRole("link", { name: /open questionnaire/i });
		expect(link).toHaveAttribute(
			"href",
			expect.stringContaining("docs.google.com/forms"),
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});
});

// Separate file-level mock: the shipped form URL is non-empty, so the
// unconfigured branch is unreachable without replacing the module.
describe("CreateClassForm with no questionnaire configured", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("hides the block and leaves creation ungated", async () => {
		vi.doMock("@/lib/intake-survey", () => ({
			isIntakeSurveyConfigured: () => false,
			buildIntakeSurveyUrl: () => "",
		}));

		const { CreateClassForm: Unconfigured } = await import(
			"@/components/instructor/create-class-form"
		);
		render(<Unconfigured />);

		expect(
			screen.queryByRole("link", { name: /open questionnaire/i }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Create Class" })).toBeEnabled();
	});
});
