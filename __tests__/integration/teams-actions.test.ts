import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	removeStudentFromClass,
	updateStudentTeam,
} from "@/app/actions/teams";
import { createClient } from "@/lib/supabase/server";
import { createChainableBuilder } from "../helpers/supabase-mock";

describe("Team Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns an auth error when updating a team without a logged-in instructor", async () => {
		vi.mocked(createClient).mockResolvedValueOnce({
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		} as any);

		await expect(
			updateStudentTeam("class-1", "student-1", "USA"),
		).resolves.toEqual({
			error: "Not logged in",
		});
	});

	it("creates a missing team before updating the student's enrollment", async () => {
		const teamsLookupBuilder = createChainableBuilder({
			data: null,
			error: null,
		});
		const teamsInsertBuilder = createChainableBuilder({
			data: { id: "team-created" },
			error: null,
		});
		const studentUpdateBuilder = createChainableBuilder({
			data: null,
			error: null,
		});

		const client = {
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: { user: { id: "instructor-1" } },
				}),
			},
			from: vi.fn((table: string) => {
				if (table === "teams") {
					return {
						select: vi
							.fn()
							.mockReturnValueOnce(teamsLookupBuilder)
							.mockReturnValueOnce(teamsInsertBuilder),
						insert: teamsInsertBuilder.insert,
						eq: teamsLookupBuilder.eq,
						maybeSingle: teamsLookupBuilder.maybeSingle,
						single: teamsInsertBuilder.single,
					};
				}
				if (table === "students_classes") {
					return studentUpdateBuilder;
				}
				throw new Error(`Unexpected table: ${table}`);
			}),
		};
		vi.mocked(createClient).mockResolvedValueOnce(client as any);

		const result = await updateStudentTeam("class-1", "student-1", "China");

		expect(result).toEqual({ success: true });
		expect(client.from).toHaveBeenCalledWith("teams");
		expect(client.from).toHaveBeenCalledWith("students_classes");
		expect(studentUpdateBuilder.update).toHaveBeenCalledWith({
			team_id: "team-created",
		});
	});

	it("removes both enrollment and invite data for an authorized instructor", async () => {
		const classBuilder = createChainableBuilder({
			data: { id: "class-1" },
			error: null,
		});
		const usersBuilder = createChainableBuilder({
			data: { id: "student-9" },
			error: null,
		});
		const enrollmentDeleteBuilder = createChainableBuilder({
			data: null,
			error: null,
		});
		const inviteDeleteBuilder = createChainableBuilder({
			data: null,
			error: null,
		});

		const client = {
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: { user: { id: "instructor-1" } },
				}),
			},
			from: vi.fn((table: string) => {
				switch (table) {
					case "classes":
						return classBuilder;
					case "users":
						return usersBuilder;
					case "students_classes":
						return enrollmentDeleteBuilder;
					case "class_invites":
						return inviteDeleteBuilder;
					default:
						throw new Error(`Unexpected table: ${table}`);
				}
			}),
		};
		vi.mocked(createClient).mockResolvedValueOnce(client as any);

		const result = await removeStudentFromClass(
			"class-1",
			"Student@Example.com",
		);

		expect(result).toEqual({ success: true });
		expect(usersBuilder.eq).toHaveBeenCalledWith(
			"email",
			"Student@Example.com",
		);
		expect(enrollmentDeleteBuilder.delete).toHaveBeenCalled();
		expect(inviteDeleteBuilder.eq).toHaveBeenCalledWith(
			"email",
			"student@example.com",
		);
	});
});
