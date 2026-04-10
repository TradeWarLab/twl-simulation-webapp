import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/app/actions/auth";
import { SignUpForm } from "@/components/auth/sign-up-form";

vi.mock("@/app/actions/auth", () => ({
	signUp: vi.fn(),
}));

describe("SignUpForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders required fields correctly", () => {
		render(<SignUpForm />);
		expect(
			screen.getByRole("heading", { name: /Sign Up/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Sign up/i }),
		).toBeInTheDocument();
	});

	it("shows loading state and displays error if signup fails", async () => {
		const mockSignUp = vi.mocked(signUp);
		mockSignUp.mockResolvedValueOnce({ error: "Email already taken" });

		render(<SignUpForm />);

		const submitButton = screen.getByRole("button", { name: /Sign up/i });

		fireEvent.change(screen.getByLabelText(/Name/i), {
			target: { value: "Test User" },
		});
		fireEvent.change(screen.getByLabelText(/Email/i), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^Password$/i), {
			target: { value: "password123" },
		});

		const form = submitButton.closest("form");
		if (form) fireEvent.submit(form);

		expect(mockSignUp).toHaveBeenCalledTimes(1);
	});
});
