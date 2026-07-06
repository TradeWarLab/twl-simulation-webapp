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

	it("renders the current student signup fields", () => {
		render(<SignUpForm />);

		expect(
			screen.getByRole("heading", { name: /sign up/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/class code/i)).not.toBeInTheDocument();
		expect(
			screen.getByLabelText(/sign up as instructor\?/i),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/i agree to the/i)).toBeInTheDocument();
	});

	it("requires agreeing to the policies before submitting", async () => {
		const mockSignUp = vi.mocked(signUp);
		render(<SignUpForm />);

		fireEvent.change(screen.getByLabelText(/full name/i), {
			target: { value: "Test User" },
		});
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByLabelText(/confirm password/i), {
			target: { value: "password123" },
		});

		// No consent checked → submit is blocked.
		const form = screen
			.getByRole("button", { name: /sign up/i })
			.closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		expect(mockSignUp).not.toHaveBeenCalled();
		expect(
			await screen.findByText(/agree to the privacy policy and terms of use/i),
		).toBeInTheDocument();
	});

	it("prevents submit when passwords do not match", async () => {
		const mockSignUp = vi.mocked(signUp);
		render(<SignUpForm />);

		fireEvent.change(screen.getByLabelText(/full name/i), {
			target: { value: "Test User" },
		});
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByLabelText(/confirm password/i), {
			target: { value: "different-password" },
		});
		fireEvent.click(screen.getByLabelText(/i agree to the/i));

		const form = screen
			.getByRole("button", { name: /sign up/i })
			.closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		expect(mockSignUp).not.toHaveBeenCalled();
		expect(
			await screen.findByText(/passwords do not match/i),
		).toBeInTheDocument();
	});

	it("shows the email verification state after successful signup", async () => {
		const mockSignUp = vi.mocked(signUp);
		mockSignUp.mockImplementationOnce(async (formData) => {
			expect(formData.get("class_code")).toBeNull();
			return { success: true };
		});

		render(<SignUpForm />);

		fireEvent.change(screen.getByLabelText(/full name/i), {
			target: { value: "Test User" },
		});
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByLabelText(/confirm password/i), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByLabelText(/i agree to the/i));

		const form = screen
			.getByRole("button", { name: /sign up/i })
			.closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		await waitFor(() => {
			expect(mockSignUp).toHaveBeenCalledTimes(1);
		});
		expect(
			await screen.findByRole("heading", { name: /check your inbox/i }),
		).toBeInTheDocument();
	});

	it("submits the instructor role when the checkbox is enabled", async () => {
		const mockSignUp = vi.mocked(signUp);
		mockSignUp.mockImplementationOnce(async (formData) => {
			expect(formData.get("role")).toBe("instructor");
			return { success: true };
		});

		render(<SignUpForm />);

		fireEvent.change(screen.getByLabelText(/full name/i), {
			target: { value: "Professor Plum" },
		});
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "prof@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByLabelText(/confirm password/i), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByLabelText(/sign up as instructor\?/i));
		fireEvent.click(screen.getByLabelText(/i agree to the/i));

		const form = screen
			.getByRole("button", { name: /sign up/i })
			.closest("form");
		if (form) {
			fireEvent.submit(form);
		}

		await waitFor(() => {
			expect(mockSignUp).toHaveBeenCalledTimes(1);
		});
	});
});
