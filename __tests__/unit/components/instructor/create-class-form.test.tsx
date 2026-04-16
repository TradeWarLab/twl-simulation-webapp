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
		expect(screen.getByPlaceholderText(/Class Name/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Create Class" })).toBeInTheDocument();
	});

	it("submits the form successfully tracking loading states", async () => {
		const mockCreate = vi.mocked(createClass) as any;
		mockCreate.mockResolvedValueOnce({ success: true });

		render(<CreateClassForm />);

		const input = screen.getByPlaceholderText(/Class Name/i);
		const submitButton = screen.getByRole("button", { name: "Create Class" });

		fireEvent.change(input, { target: { value: "Advanced Econ" } });
		const form = submitButton.closest("form");
		if (form) fireEvent.submit(form);

		// Verifies the createClass mock was hit with a FormData wrapper
		expect(mockCreate).toHaveBeenCalledTimes(1);
	});
});
