import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getMessages,
	getMessagesBefore,
	sendMessage,
} from "@/app/actions/chat";
import { mockClient } from "../helpers/supabase-mock";

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

			const mockMessage = {
				id: "msg-1",
				class_id: "class-1",
				sender_id: "user-1",
				channel: "general",
				content: "Hello World",
			};
			mockClient._mockTable("messages", { data: mockMessage, error: null });

			const result = await sendMessage(
				"class-1",
				"general",
				"Hello World",
				"client-id",
			);

			const builder = mockClient.from("messages");
			expect(builder.insert).toHaveBeenCalledWith({
				class_id: "class-1",
				sender_id: "user-1",
				channel: "general",
				content: "Hello World",
				client_message_id: "client-id",
			});
			expect(builder.select).toHaveBeenCalled();
			expect(builder.single).toHaveBeenCalled();

			expect(result).toEqual({ success: true, message: mockMessage });
			expect(revalidatePath).toHaveBeenCalledWith(
				"/student/simulation/class-1",
			);
		});

		it("inserts message without client ID and calls revalidatePath", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			const mockMessage = {
				id: "msg-1",
			};
			mockClient._mockTable("messages", { data: mockMessage, error: null });

			const result = await sendMessage("class-1", "general", "Hello World");

			const builder = mockClient.from("messages");
			expect(builder.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					client_message_id: null,
				}),
			);

			expect(result).toEqual({ success: true, message: mockMessage });
		});

		it("returns database error from insert", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			mockClient._mockTable("messages", {
				data: null,
				error: { message: "DB Error" },
			});

			const result = await sendMessage("class-1", "general", "Hello");
			expect(result).toEqual({ error: "DB Error" });
		});

		it("returns generic error if no error message is provided", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			// Data is null, but no explicit error object
			mockClient._mockTable("messages", { data: null, error: null });

			const result = await sendMessage("class-1", "general", "Hello");
			expect(result).toEqual({ error: "Unknown error sending message" });
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
				{ id: "msg-2", content: "Hello", users: { full_name: "Bob" } },
				{ id: "msg-1", content: "Hi", users: { full_name: "Alice" } },
			];

			const expectedOutput = [...mockData].reverse();
			mockClient._mockTable("messages", { data: [...mockData], error: null });

			const messages = await getMessages("class-1", "general");

			const builder = mockClient.from("messages");
			expect(builder.select).toHaveBeenCalled();
			expect(builder.eq).toHaveBeenCalledWith("class_id", "class-1");
			expect(builder.eq).toHaveBeenCalledWith("channel", "general");
			expect(builder.order).toHaveBeenCalledWith("created_at", {
				ascending: false,
			});
			expect(builder.limit).toHaveBeenCalledWith(100);

			// Should reverse the output from Supabase
			expect(messages).toEqual(expectedOutput);
		});

		it("returns empty array on database error", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			mockClient._mockTable("messages", {
				data: null,
				error: { message: "DB Error" },
			});

			const messages = await getMessages("class-1", "general");
			expect(messages).toEqual([]);
		});
	});

	describe("getMessagesBefore", () => {
		it("returns empty array if unauthorized", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

			const messages = await getMessagesBefore(
				"class-1",
				"general",
				"2024-01-01T00:00:00Z",
			);
			expect(messages).toEqual([]);
		});

		it("queries older messages and returns them reversed", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			const mockData = [
				{ id: "msg-4", content: "Newer", users: { full_name: "Bob" } },
				{ id: "msg-3", content: "Older", users: { full_name: "Alice" } },
			];

			const expectedOutput = [...mockData].reverse();
			mockClient._mockTable("messages", { data: [...mockData], error: null });

			const messages = await getMessagesBefore(
				"class-1",
				"general",
				"2024-01-01T00:00:00Z",
				20,
			);

			const builder = mockClient.from("messages");
			expect(builder.select).toHaveBeenCalled();
			expect(builder.eq).toHaveBeenCalledWith("class_id", "class-1");
			expect(builder.eq).toHaveBeenCalledWith("channel", "general");
			expect(builder.lt).toHaveBeenCalledWith(
				"created_at",
				"2024-01-01T00:00:00Z",
			);
			expect(builder.order).toHaveBeenCalledWith("created_at", {
				ascending: false,
			});
			expect(builder.limit).toHaveBeenCalledWith(20);

			// Should reverse the output from Supabase
			expect(messages).toEqual(expectedOutput);
		});

		it("queries older messages with default limit", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			const mockData = [
				{ id: "msg-3", content: "Older", users: { full_name: "Alice" } },
			];

			const expectedOutput = [...mockData].reverse();
			mockClient._mockTable("messages", { data: [...mockData], error: null });

			const messages = await getMessagesBefore(
				"class-1",
				"general",
				"2024-01-01T00:00:00Z",
			);

			const builder = mockClient.from("messages");
			expect(builder.limit).toHaveBeenCalledWith(50); // Default limit is 50

			expect(messages).toEqual(expectedOutput);
		});

		it("returns empty array on database error", async () => {
			mockClient.auth.getUser.mockResolvedValueOnce({
				data: { user: { id: "user-1" } },
			});

			mockClient._mockTable("messages", {
				data: null,
				error: { message: "DB Error" },
			});

			const messages = await getMessagesBefore(
				"class-1",
				"general",
				"before_id",
			);
			expect(messages).toEqual([]);
		});
	});
});
