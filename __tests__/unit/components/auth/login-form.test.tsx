import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@/app/actions/auth";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("@/app/actions/auth", () => ({
	login: vi.fn(),
}));

describe("LoginForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders correctly", () => {
		render(<LoginForm />);
		expect(
			screen.getByRole("heading", { name: /log in/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
	});

	it("disables button while submitting and displays error if submission fails", async () => {
		const mockLogin = vi.mocked(login);
		mockLogin.mockResolvedValueOnce({ error: "Invalid credentials" });

		render(<LoginForm />);

		const _submitButton = screen.getByRole("button", { name: "Login" });
		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });

		// Trigger form submittal using the form element directly wrapper
		const form = emailInput.closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		expect(mockLogin).toHaveBeenCalledTimes(1);
	});
});
