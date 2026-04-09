import { beforeEach, describe, expect, it, vi } from "vitest";
import { login, signOut, signUp } from "@/app/actions/auth";
import { mockClient } from "../helpers/supabase-mock";

describe("Auth Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("login", () => {
		it("returns error on failed login", async () => {
			// Mock auth failure
			mockClient.auth.signInWithPassword.mockResolvedValueOnce({
				error: { message: "Invalid credentials" },
			});

			const formData = new FormData();
			formData.set("email", "test@example.com");
			formData.set("password", "wrong");

			const result = await login(formData);

			expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "wrong",
			});
			expect(result).toEqual({ error: "Invalid credentials" });
		});

		it("redirects to instructor dashboard on instructor login", async () => {
			// Mock auth success
			mockClient.auth.signInWithPassword.mockResolvedValueOnce({ error: null });
			// Mock user role query
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});
			mockClient._mockTable("users", {
				data: { role: "instructor" },
				error: null,
			});

			const formData = new FormData();
			formData.set("email", "prof@example.com");
			formData.set("password", "valid");

			try {
				await login(formData);
				expect.fail("login should redirect");
			} catch (error) {
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/instructor/dashboard");
			}
		});

		it("redirects to student dashboard on student login", async () => {
			// Mock auth success
			mockClient.auth.signInWithPassword.mockResolvedValueOnce({ error: null });
			// Mock user role query
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-2" } },
			});
			mockClient._mockTable("users", {
				data: { role: "student" },
				error: null,
			});

			const formData = new FormData();
			formData.set("email", "student@example.com");
			formData.set("password", "valid");

			try {
				await login(formData);
				expect.fail("login should redirect");
			} catch (error) {
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/student/dashboard");
			}
		});
	});

	describe("signUp", () => {
		it("returns error on failed signup", async () => {
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: { message: "User exists" },
				data: { user: null, session: null },
			});

			const formData = new FormData();
			formData.set("email", "exists@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "Test User");

			const result = await signUp(formData);
			expect(result).toEqual({ error: "User exists" });
		});

		it("redirects to student dashboard if signup succeeds immediately (no email confirm)", async () => {
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: null,
				data: { session: { access_token: "token" }, user: { id: "user-new" } },
			});
			mockClient._mockTable("users", {
				data: { role: "student" },
				error: null,
			});

			const formData = new FormData();
			formData.set("email", "new@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "New User");

			try {
				await signUp(formData);
				expect.fail("signUp should redirect");
			} catch (error) {
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/student/dashboard");
			}
		});

		it("returns success without redirect if email confirmation is required", async () => {
			// Session null means waiting for email confirm
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: null,
				data: { session: null, user: { id: "user-unconfirmed" } },
			});

			const formData = new FormData();
			formData.set("email", "verify@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "Verify User");

			const result = await signUp(formData);
			expect(result).toEqual({ success: true });
		});
	});

	describe("signOut", () => {
		it("calls auth.signOut and redirects to login", async () => {
			try {
				await signOut();
				expect.fail("signOut should redirect");
			} catch (error) {
				expect(mockClient.auth.signOut).toHaveBeenCalled();
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/auth/login");
			}
		});
	});
});
