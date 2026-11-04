import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClass } from "@/app/actions/classes";
import { CreateClassForm } from "@/components/instructor/create-class-form";

vi.mock("@/app/actions/classes", () => ({
	createClass: vi.fn(),
}));

function submitButton() {
	return screen.getByRole("button", { name: "Create Class" });
}

describe("CreateClassForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders required elements", () => {
		render(<CreateClassForm />);
		expect(screen.getByText("Create New Class")).toBeInTheDocument();
		expect(screen.getByLabelText(/Class Name/i)).toBeInTheDocument();
		expect(submitButton()).toBeInTheDocument();
	});

	it("renders the NotebookLM URL field with a default value", () => {
		render(<CreateClassForm />);
		const urlInput = screen.getByLabelText(/NotebookLM URL/i);
		expect(urlInput).toBeInTheDocument();
		expect(urlInput).toHaveValue(
			"https://notebooklm.google.com/notebook/6a4d5fed-304b-4640-b573-ae55edd18d91",
		);
	});

	it("asks the intake questions in the form, with no external link", () => {
		render(<CreateClassForm />);
		expect(screen.getAllByRole("group")).toHaveLength(3);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		for (const radio of screen.getAllByRole("radio")) {
			expect(radio).toBeRequired();
		}
	});

	it("disables submit until a student level is selected", () => {
		render(<CreateClassForm />);
		expect(submitButton()).toBeDisabled();

		fireEvent.click(screen.getByLabelText(/^Graduate/));
		expect(submitButton()).toBeEnabled();

		fireEvent.click(screen.getByLabelText(/^Graduate/));
		expect(submitButton()).toBeDisabled();
	});

	it("does not call createClass with no student level", () => {
		render(<CreateClassForm />);
		const form = submitButton().closest("form");
		if (form) fireEvent.submit(form);
		expect(createClass).not.toHaveBeenCalled();
	});

	it("asks for detail only for Other and outside the US", () => {
		render(<CreateClassForm />);
		expect(
			screen.queryByLabelText("Describe your institution"),
		).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/^Where\?/)).not.toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Other"));
		fireEvent.click(screen.getByLabelText("Outside the United States"));

		expect(screen.getByLabelText("Describe your institution")).toBeRequired();
		expect(screen.getByLabelText(/^Where\?/)).not.toBeRequired();
	});

	it("clears its state when the form resets after a submit", () => {
		render(<CreateClassForm />);
		fireEvent.click(screen.getByLabelText(/^Graduate/));
		fireEvent.click(screen.getByLabelText("Other"));

		const form = submitButton().closest("form");
		act(() => form?.reset());

		expect(submitButton()).toBeDisabled();
		expect(
			screen.queryByLabelText("Describe your institution"),
		).not.toBeInTheDocument();
	});
});
