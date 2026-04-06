import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "../helpers/supabase-mock";
import {
  createClass,
  inviteStudentToClass,
  getClassRoster,
  getInstructorClasses,
  getStudentClasses,
  updateClassPeriod,
  enrollStudentByCode,
} from "@/app/actions/classes";


describe("Class Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createClass", () => {
    it("inserts a class and revalidates dashboard", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "instructor-1" } },
      });

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockClient.from.mockReturnValue({ insert: insertMock } as any);

      const formData = new FormData();
      formData.set("name", "History 101");

      await createClass(formData);

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "History 101",
        instructor_id: "instructor-1",
        status: "active",
        current_period: 0,
      }));
      // Check that class_code and normalized_name are generated
      const callArgs = insertMock.mock.calls[0][0];
      expect(callArgs.class_code).toMatch(/^TWL-[A-Z0-9]{6}$/);
      expect(callArgs.normalized_name).toBe("history-101");
    });

    it("aborts if no user", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
      const insertMock = vi.fn();
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

      const mockData = [{ id: "c1", name: "Math", status: "active", current_period: 1 }];

      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      mockClient.from.mockReturnValue({ select: selectMock } as any);

      const classes = await getInstructorClasses();

      expect(selectMock).toHaveBeenCalledWith("id, name, status, current_period");
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
          classes: { id: "c1", name: "Art", status: "active", current_period: 2 },
          team_id: "t1",
          teams: { country: "USA" }
        }
      ];

      const eqMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      mockClient.from.mockReturnValue({ select: selectMock } as any);

      const classes = await getStudentClasses();

      // Ensure the deeply nested relation is mapped smoothly securely
      expect(classes).toEqual([
        { id: "c1", name: "Art", status: "active", current_period: 2, team_country: "USA" }
      ]);
    });
  });
});
