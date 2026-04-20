import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createClass,
	enrollStudentByCode,
	getInstructorClasses,
	getStudentClasses,
	updateClassPeriod,
} from "@/app/actions/classes";
import { DEFAULT_BRIEFINGS } from "@/lib/constants";
import { mockClient } from "../helpers/supabase-mock";

describe("Class Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createClass", () => {
		it("inserts a class with optional NotebookLM URL", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "instructor-1" } },
			});

			const classSingleMock = vi
				.fn()
				.mockResolvedValue({ data: { id: "new-cls" }, error: null });
			const classSelectMock = vi
				.fn()
				.mockReturnValue({ single: classSingleMock });
			const classInsertMock = vi
				.fn()
				.mockReturnValue({ select: classSelectMock });

			const teamsSelectMock = vi.fn().mockResolvedValue({
				data: [
					{ id: "team-usa", country: "USA" },
					{ id: "team-china", country: "China" },
				],
				error: null,
			});
			const teamsInsertMock = vi
				.fn()
				.mockReturnValue({ select: teamsSelectMock });

			const globalIssuesSelectMock = vi.fn().mockResolvedValue({
				data: [],
				error: null,
			});
			const tradeItemsInsertMock = vi.fn().mockResolvedValue({ error: null });
			const briefingsInsertMock = vi.fn().mockResolvedValue({ error: null });

			mockClient.from.mockImplementation((table: string) => {
				if (table === "classes") {
					return { insert: classInsertMock } as any;
				}
				if (table === "teams") {
					return { insert: teamsInsertMock } as any;
				}
				if (table === "global_issues") {
					return { select: globalIssuesSelectMock } as any;
				}
				if (table === "trade_items") {
					return { insert: tradeItemsInsertMock } as any;
				}
				if (table === "briefings") {
					return { insert: briefingsInsertMock } as any;
				}
				return {} as any;
			});

			const formData = new FormData();
			formData.set("name", "History 101");
			formData.set("notebooklm_url", "https://notebooklm.google.com/example");

			await createClass(formData);

			expect(classInsertMock).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "History 101",
					instructor_id: "instructor-1",
					status: "active",
					current_period: 0,
					notebooklm_url: "https://notebooklm.google.com/example",
				}),
			);
			const callArgs = classInsertMock.mock.calls[0][0];
			expect(callArgs.class_code).toMatch(/^TWL-[A-Z0-9]{6}$/);
			expect(callArgs.normalized_name).toBe("history-101");
		});

		it("seeds teams, trade items, and default briefings for a new class", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "instructor-1" } },
			});

			const classSingleMock = vi
				.fn()
				.mockResolvedValue({ data: { id: "new-cls" }, error: null });
			const classSelectMock = vi
				.fn()
				.mockReturnValue({ single: classSingleMock });
			const classInsertMock = vi
				.fn()
				.mockReturnValue({ select: classSelectMock });

			const teams = [
				{ id: "team-usa", country: "USA" },
				{ id: "team-china", country: "China" },
			];
			const teamsSelectMock = vi.fn().mockResolvedValue({
				data: teams,
				error: null,
			});
			const teamsInsertMock = vi
				.fn()
				.mockReturnValue({ select: teamsSelectMock });

			const issues = [
				{ id: "issue-1", title: "The U.S. to reduce tariffs" },
				{ id: "issue-2", title: "China to expand imports" },
			];
			const globalIssuesSelectMock = vi.fn().mockResolvedValue({
				data: issues,
				error: null,
			});
			const tradeItemsInsertMock = vi.fn().mockResolvedValue({ error: null });
			const briefingsInsertMock = vi.fn().mockResolvedValue({ error: null });

			mockClient.from.mockImplementation((table: string) => {
				if (table === "classes") {
					return { insert: classInsertMock } as any;
				}
				if (table === "teams") {
					return { insert: teamsInsertMock } as any;
				}
				if (table === "global_issues") {
					return { select: globalIssuesSelectMock } as any;
				}
				if (table === "trade_items") {
					return { insert: tradeItemsInsertMock } as any;
				}
				if (table === "briefings") {
					return { insert: briefingsInsertMock } as any;
				}
				return {} as any;
			});

			const formData = new FormData();
			formData.set("name", "History 101");

			await createClass(formData);

			expect(teamsInsertMock).toHaveBeenCalledWith([
				{ class_id: "new-cls", country: "USA" },
				{ class_id: "new-cls", country: "China" },
			]);
			expect(tradeItemsInsertMock).toHaveBeenCalledWith([
				{
					class_id: "new-cls",
					team_id: "team-usa",
					issue_id: "issue-1",
					name: "The U.S. to reduce tariffs",
					value: 0,
					role: "concession",
					is_resolved: false,
				},
				{
					class_id: "new-cls",
					team_id: "team-usa",
					issue_id: "issue-2",
					name: "China to expand imports",
					value: 0,
					role: "ask",
					is_resolved: false,
				},
				{
					class_id: "new-cls",
					team_id: "team-china",
					issue_id: "issue-1",
					name: "The U.S. to reduce tariffs",
					value: 0,
					role: "ask",
					is_resolved: false,
				},
				{
					class_id: "new-cls",
					team_id: "team-china",
					issue_id: "issue-2",
					name: "China to expand imports",
					value: 0,
					role: "concession",
					is_resolved: false,
				},
			]);
			expect(briefingsInsertMock).toHaveBeenCalledWith(
				expect.arrayContaining(
					DEFAULT_BRIEFINGS.map((briefing) =>
						expect.objectContaining({
							class_id: "new-cls",
							title: briefing.title,
							target_role: briefing.target_role,
							interest_group: briefing.interest_group,
							file_url: briefing.file_url,
						}),
					),
				),
			);
		});

		it("aborts if no user", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
			const singleMock = vi
				.fn()
				.mockResolvedValue({ data: null, error: new Error() });
			const selectMock = vi.fn().mockReturnValue({ single: singleMock });
			const insertMock = vi.fn().mockReturnValue({ select: selectMock });
			mockClient.from.mockReturnValue({ insert: insertMock } as any);

			const formData = new FormData();
			await createClass(formData);

			expect(insertMock).not.toHaveBeenCalled();
		});
	});

	describe("updateClassPeriod", () => {
		it("updates class period and revalidates", async () => {
			const eqMock = vi.fn().mockResolvedValue({ error: null });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
			mockClient.from.mockReturnValue({ update: updateMock } as any);

			const result = await updateClassPeriod("cls-1", 3);

			expect(updateMock).toHaveBeenCalledWith({ current_period: 3 });
			expect(eqMock).toHaveBeenCalledWith("id", "cls-1");
			expect(result).toEqual({ success: true });
		});
	});

	describe("enrollStudentByCode", () => {
		it("enrolls a student when a valid code is provided", async () => {
			mockClient.auth.getUser.mockResolvedValue({
				data: { user: { id: "stu-1" } },
			});

			// Mock rpc call
			const rpcMock = vi.fn().mockResolvedValue({ error: null });
			mockClient.rpc = rpcMock;

			const result = await enrollStudentByCode("TWL-TEST");

			expect(rpcMock).toHaveBeenCalledWith("enroll_student", {
				p_class_code: "TWL-TEST",
			});
			expect(result).toEqual({ success: true });
		});
	});

	describe("getClasses (Instructor & Student)", () => {
		it("instructor: queries classes correctly", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "ins-1" } },
			});

			const mockData = [
				{ id: "c1", name: "Math", status: "active", current_period: 1 },
			];

			const orderMock = vi
				.fn()
				.mockResolvedValue({ data: mockData, error: null });
			const eqMock = vi.fn().mockReturnValue({ order: orderMock });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const classes = await getInstructorClasses();

			expect(selectMock).toHaveBeenCalledWith(
				"id, name, status, current_period",
			);
			expect(eqMock).toHaveBeenCalledWith("instructor_id", "ins-1");
			expect(classes).toEqual(mockData);
		});

		it("student: queries classes correctly joining teams", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "stu-1" } },
			});

			const mockData = [
				{
					class_id: "c1",
					classes: {
						id: "c1",
						name: "Art",
						status: "active",
						current_period: 2,
					},
					team_id: "t1",
					teams: { country: "USA" },
				},
			];

			const eqMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
			const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockClient.from.mockReturnValue({ select: selectMock } as any);

			const classes = await getStudentClasses();

			// Ensure the deeply nested relation is mapped smoothly securely
			expect(classes).toEqual([
				{
					id: "c1",
					name: "Art",
					status: "active",
					current_period: 2,
					team_country: "USA",
				},
			]);
		});
	});
});
