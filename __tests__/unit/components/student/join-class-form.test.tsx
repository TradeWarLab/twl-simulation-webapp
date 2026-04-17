import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrollStudentByCode } from "@/app/actions/classes";
import { JoinClassForm } from "@/components/student/join-class-form";

vi.mock("@/app/actions/classes", () => ({
	enrollStudentByCode: vi.fn(),
}));

describe("JoinClassForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the class code join workflow", () => {
		render(<JoinClassForm />);

		expect(screen.getByText("Join a Class")).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/enter class code/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
	});

	it("trims the class code before sending it to the server action", async () => {
		const mockEnroll = vi.mocked(enrollStudentByCode);
		mockEnroll.mockResolvedValueOnce({ success: true });

		render(<JoinClassForm />);

		fireEvent.change(screen.getByPlaceholderText(/enter class code/i), {
			target: { value: "  TWL-123456  " },
		});

		const form = screen.getByRole("button", { name: "Join" }).closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		await waitFor(() => {
			expect(mockEnroll).toHaveBeenCalledWith("TWL-123456");
		});
	});
});
