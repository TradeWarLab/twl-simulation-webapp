import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage, getMessages } from "@/app/actions/chat";
import { mockClient } from "../helpers/supabase-mock";
import { revalidatePath } from "next/cache";

describe("Chat Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("returns error if user is unauthorized", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await sendMessage("class-1", "general", "Hello");
      expect(result).toEqual({ error: "Unauthorized or empty message" });
    });

    it("returns error on empty message", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });

      const result = await sendMessage("class-1", "general", "   ");
      expect(result).toEqual({ error: "Unauthorized or empty message" });
    });

    it("inserts message and calls revalidatePath", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });

      // Intercept the insert call directly since our mock builder resets when called via mocked table
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockClient.from.mockReturnValue({ insert: insertMock } as any);

      const result = await sendMessage("class-1", "general", "Hello World");

      expect(insertMock).toHaveBeenCalledWith({
        class_id: "class-1",
        sender_id: "user-1",
        channel: "general",
        content: "Hello World",
      });
      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith("/student/simulation/class-1");
    });

    it("returns database error from insert", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });

      const insertMock = vi.fn().mockResolvedValue({ error: { message: "DB Error" } });
      mockClient.from.mockReturnValue({ insert: insertMock } as any);

      const result = await sendMessage("class-1", "general", "Hello");
      expect(result).toEqual({ error: "DB Error" });
    });
  });

  describe("getMessages", () => {
    it("returns empty array if unauthorized", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const messages = await getMessages("class-1", "general");
      expect(messages).toEqual([]);
    });

    it("queries and returns messages via chained methods", async () => {
      mockClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
      });

      const mockData = [
        { id: "msg-1", content: "Hi", users: { full_name: "Alice" } },
      ];

      // Reconstruct the expected chain: from.select.eq.eq.order
      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const eqChannelMock = vi.fn().mockReturnValue({ order: orderMock });
      const eqClassMock = vi.fn().mockReturnValue({ eq: eqChannelMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqClassMock });
      
      mockClient.from.mockReturnValue({ select: selectMock } as any);

      const messages = await getMessages("class-1", "general");

      expect(selectMock).toHaveBeenCalled();
      expect(eqClassMock).toHaveBeenCalledWith("class_id", "class-1");
      expect(eqChannelMock).toHaveBeenCalledWith("channel", "general");
      expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });
      expect(messages).toEqual(mockData);
    });
  });
});
