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

	it("submits the form successfully", async () => {
		const mockCreate = vi.mocked(createClass) as any;
		mockCreate.mockResolvedValueOnce({ success: true });

		render(<CreateClassForm />);

		const input = screen.getByLabelText(/Class Name/i);
		const submitButton = screen.getByRole("button", { name: "Create Class" });

		fireEvent.change(input, { target: { value: "Advanced Econ" } });
		const form = submitButton.closest("form");
		if (form) fireEvent.submit(form);

		expect(mockCreate).toHaveBeenCalledTimes(1);
	});
});
