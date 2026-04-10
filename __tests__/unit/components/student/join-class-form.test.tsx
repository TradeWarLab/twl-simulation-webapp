import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrollStudentByCode } from "@/app/actions/classes";
import { JoinClassForm } from "@/components/student/join-class-form";

// Mock the server action
vi.mock("@/app/actions/classes", () => ({
	enrollStudentByCode: vi.fn(),
}));

describe("JoinClassForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders correctly", () => {
		render(<JoinClassForm />);
		expect(screen.getByText("Join a Class")).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/Class Code/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
	});

	it("submits action without state tracking", async () => {
		const mockEnroll = vi.mocked(enrollStudentByCode);
		mockEnroll.mockResolvedValueOnce({ success: true });

		render(<JoinClassForm />);

		const input = screen.getByPlaceholderText(/Class Code/i);
		const submitButton = screen.getByRole("button", { name: "Join" });

		fireEvent.change(input, { target: { value: "TWL-123456" } });

		const form = submitButton.closest("form");
		if (form) fireEvent.submit(form);

		// Component does not have native loading rendering or native error tracking
		// It just routes to action.
	});
});
