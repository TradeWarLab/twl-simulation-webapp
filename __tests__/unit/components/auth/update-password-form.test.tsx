import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { mockClient } from "../../../helpers/supabase-mock";

const mockRouter = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

vi.mock("next/navigation", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, useRouter: () => mockRouter };
});

function submitWith(password: string) {
	fireEvent.change(screen.getByLabelText(/new password/i), {
		target: { value: password },
	});
	const form = screen
		.getByRole("button", { name: /save new password/i })
		.closest("form");
	if (form) fireEvent.submit(form);
}

describe("UpdatePasswordForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClient.auth.updateUser = vi.fn().mockResolvedValue({ error: null });
	});

	it("sends a student to the student dashboard", async () => {
		mockClient._mockTable("users", { data: { role: "student" }, error: null });
		render(<UpdatePasswordForm />);
		submitWith("new-password");

		await waitFor(() => {
			expect(mockRouter.push).toHaveBeenCalledWith("/student/dashboard");
		});
	});

	it("sends an instructor to the instructor dashboard", async () => {
		mockClient._mockTable("users", {
			data: { role: "instructor" },
			error: null,
		});
		render(<UpdatePasswordForm />);
		submitWith("new-password");

		await waitFor(() => {
			expect(mockRouter.push).toHaveBeenCalledWith("/instructor/dashboard");
		});
	});

	it("never routes to the non-existent /protected page", async () => {
		mockClient._mockTable("users", { data: null, error: null });
		render(<UpdatePasswordForm />);
		submitWith("new-password");

		await waitFor(() => {
			expect(mockRouter.push).toHaveBeenCalled();
		});
		expect(mockRouter.push).not.toHaveBeenCalledWith("/protected");
	});

	it("surfaces an error without navigating", async () => {
		mockClient.auth.updateUser = vi
			.fn()
			.mockResolvedValue({ error: new Error("Password too short") });
		render(<UpdatePasswordForm />);
		submitWith("x");

		expect(await screen.findByText(/password too short/i)).toBeInTheDocument();
		expect(mockRouter.push).not.toHaveBeenCalled();
	});
});
