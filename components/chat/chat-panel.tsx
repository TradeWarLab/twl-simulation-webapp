"use client";

import { useEffect, useRef, useState } from "react";
import { type Message, sendMessage } from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatPanel({
	classId,
	teamChannel,
	initialTeamMessages,
	initialGlobalMessages,
	currentUserId,
}: {
	classId: string;
	teamChannel: string;
	initialTeamMessages: Message[];
	initialGlobalMessages: Message[];
	currentUserId: string;
}) {
	const [activeTab, setActiveTab] = useState<"team" | "global">("team");

	const [teamMessages, setTeamMessages] = useState(initialTeamMessages);
	const [globalMessages, setGlobalMessages] = useState(initialGlobalMessages);

	const [input, setInput] = useState("");
	const [isPending, setIsPending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	// Sync state when new props arrive (realtime trigger)
	useEffect(() => {
		setTeamMessages(initialTeamMessages);
		setGlobalMessages(initialGlobalMessages);
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [initialTeamMessages, initialGlobalMessages]);

	const activeChannel = activeTab === "team" ? teamChannel : "global";
	const messages = activeTab === "team" ? teamMessages : globalMessages;

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || isPending) return;

		setIsPending(true);
		const content = input.trim();
		setInput(""); // Optimistic clear

		// Add optimistic message
		const optimisticMsg: Message = {
			id: `temp-${Date.now()}`,
			class_id: classId,
			channel: activeChannel,
			content,
			sender_id: currentUserId,
			created_at: new Date().toISOString(),
			users: { full_name: "Me" }, // Will update on actual fetch
		};

		if (activeTab === "team") {
			setTeamMessages((prev) => [...prev, optimisticMsg]);
		} else {
			setGlobalMessages((prev) => [...prev, optimisticMsg]);
		}

		setTimeout(
			() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
			100,
		);

		try {
			await sendMessage(classId, activeChannel, content);
			// Revalidation handles the rest for real state
		} catch (error) {
			console.error("Failed to send message", error);
			// Could add toast error here and remove optimistic message
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-md border text-sm flex-1 min-h-0">
			{/* Tabs */}
			<div className="flex border-b">
				<button
					onClick={() => setActiveTab("team")}
					className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${
						activeTab === "team"
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground"
					}`}
				>
					Team Chat
				</button>
				<button
					onClick={() => setActiveTab("global")}
					className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${
						activeTab === "global"
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground"
					}`}
				>
					Global Debate
				</button>
			</div>

			<ScrollArea className="flex-1 p-4 min-h-0">
				<div className="space-y-4">
					{messages.length === 0 ? (
						<p className="text-sm text-center text-muted-foreground my-10">
							No messages in this chat yet. Say hello!
						</p>
					) : (
						messages.map((msg) => {
							const isMe = msg.sender_id === currentUserId;
							return (
								<div
									key={msg.id}
									className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
								>
									<div
										className={`max-w-[85%] rounded-lg px-4 py-2 ${
											isMe
												? "bg-primary text-primary-foreground"
												: "bg-muted text-foreground"
										}`}
									>
										{!isMe && (
											<p className="text-xs font-semibold mb-1 opacity-80">
												{msg.users?.full_name || "Unknown"}
											</p>
										)}
										<p className="text-sm">{msg.content}</p>
									</div>
									<span className="text-[10px] text-muted-foreground mt-1">
										{new Date(msg.created_at).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							);
						})
					)}
					<div ref={bottomRef} />
				</div>
			</ScrollArea>
			<div className="p-3 border-t bg-slate-50 dark:bg-slate-900 rounded-b-md shrink-0">
				<form onSubmit={handleSend} className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type a message..."
						className="flex-1 bg-white dark:bg-slate-950"
						disabled={isPending}
					/>
					<Button type="submit" disabled={!input.trim() || isPending}>
						Send
					</Button>
				</form>
			</div>
		</div>
	);
}
