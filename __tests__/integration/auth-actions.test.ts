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

		it("returns a clear error when a student class code is invalid", async () => {
			mockClient._mockTable("classes", {
				data: null,
				error: { message: "No rows found" },
			});

			const formData = new FormData();
			formData.set("email", "student@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "Student User");
			formData.set("role", "student");
			formData.set("class_code", "bad-code");

			const result = await signUp(formData);

			expect(mockClient.auth.signUp).not.toHaveBeenCalled();
			expect(result).toEqual({
				error:
					'Class code "bad-code" was not found. Please double-check the code your instructor gave you and try again.',
			});
		});

		it("validates the class code and passes trimmed signup metadata into Supabase", async () => {
			mockClient._mockTable("classes", {
				data: { id: "class-1" },
				error: null,
			});
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: null,
				data: { session: null, user: { id: "user-student" } },
			});

			const formData = new FormData();
			formData.set("email", "student@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "Student User");
			formData.set("role", "student");
			formData.set("class_code", "  TWL-AB12CD  ");

			const result = await signUp(formData);

			expect(mockClient.from).toHaveBeenCalledWith("classes");
			expect(mockClient.auth.signUp).toHaveBeenCalledWith({
				email: "student@example.com",
				password: "valid",
				options: {
					data: {
						full_name: "Student User",
						role: "student",
						class_code: "TWL-AB12CD",
					},
					emailRedirectTo: "http://localhost:3000/auth/confirm",
				},
			});
			expect(result).toEqual({ success: true });
		});

		it("repairs roster enrollment for immediate student signup with a validated class code", async () => {
			mockClient._mockTable("classes", {
				data: { id: "class-1" },
				error: null,
			});
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: null,
				data: {
					session: { access_token: "token" },
					user: { id: "user-new" },
				},
			});
			mockClient._mockTable("class_invites", {
				data: { affiliation: "USA", interest_block: "Industry" },
				error: null,
			});
			mockClient._mockTable("teams", {
				data: { id: "team-usa" },
				error: null,
			});
			mockClient._mockTable("students_classes", {
				data: null,
				error: null,
			});
			mockClient._mockTable("users", {
				data: { role: "student" },
				error: null,
			});

			const formData = new FormData();
			formData.set("email", "new@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "New User");
			formData.set("class_code", "TWL-AB12CD");

			try {
				await signUp(formData);
				expect.fail("signUp should redirect");
			} catch (error) {
				expect(mockClient.from).toHaveBeenCalledWith("class_invites");
				expect(mockClient.from).toHaveBeenCalledWith("teams");
				expect(mockClient.from).toHaveBeenCalledWith("students_classes");
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/student/dashboard");
			}
		});

		it("redirects to instructor dashboard after immediate instructor signup", async () => {
			mockClient.auth.signUp.mockResolvedValueOnce({
				error: null,
				data: {
					session: { access_token: "token" },
					user: { id: "user-instructor" },
				},
			});
			mockClient._mockTable("users", {
				data: { role: "instructor" },
				error: null,
			});

			const formData = new FormData();
			formData.set("email", "prof@example.com");
			formData.set("password", "valid");
			formData.set("full_name", "Professor");
			formData.set("role", "instructor");

			try {
				await signUp(formData);
				expect.fail("signUp should redirect");
			} catch (error) {
				expect((error as any).name).toBe("RedirectError");
				expect((error as any).url).toBe("/instructor/dashboard");
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
