"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Message, sendMessage } from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { byCreatedAt } from "@/lib/realtime/class-store";
import {
	useMessages,
	useResolveUserName,
	useUserNames,
} from "@/lib/realtime/hooks";

type LocalMessage = Message & { local_status: "optimistic" | "failed" };

const MESSAGE_TRUNCATE_LENGTH = 300;

function CollapsibleMessage({ content }: { content: string }) {
	const [expanded, setExpanded] = useState(false);
	const isLong = content.length > MESSAGE_TRUNCATE_LENGTH;

	return (
		<>
			<p className="text-sm break-words whitespace-pre-wrap">
				{isLong && !expanded
					? `${content.slice(0, MESSAGE_TRUNCATE_LENGTH)}…`
					: content}
			</p>
			{isLong && (
				<button
					type="button"
					onClick={() => setExpanded((prev) => !prev)}
					className="text-[11px] mt-1 underline underline-offset-2 opacity-70 hover:opacity-100"
				>
					{expanded ? "Show less" : "Show more"}
				</button>
			)}
		</>
	);
}

export function ChatPanel({
	classId,
	teamChannel,
	currentUserId,
	hideGlobal = false,
}: {
	classId: string;
	teamChannel: string;
	currentUserId: string;
	hideGlobal?: boolean;
}) {
	const [activeTab, setActiveTab] = useState<"team" | "global">("team");
	const storeMessages = useMessages();
	const userNames = useUserNames();
	const resolveUserName = useResolveUserName();

	// Optimistic sends not yet confirmed by the realtime echo
	const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
	const [input, setInput] = useState("");
	const [isPending, setIsPending] = useState(false);

	const bottomRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);

	const getViewportEl = useCallback(() => {
		return scrollAreaRef.current?.querySelector(
			'[data-slot="scroll-area-viewport"]',
		) as HTMLDivElement | null;
	}, []);

	const scrollToBottom = useCallback(
		(smooth = true) => {
			const viewport = getViewportEl();
			if (!viewport) return;
			viewport.scrollTo({
				top: viewport.scrollHeight,
				behavior: smooth ? "smooth" : "auto",
			});
		},
		[getViewportEl],
	);

	// Drop optimistic copies once the store has the real row
	useEffect(() => {
		setLocalMessages((prev) =>
			prev.filter(
				(local) =>
					!storeMessages.some(
						(message) =>
							message.client_message_id != null &&
							message.client_message_id === local.client_message_id,
					),
			),
		);
	}, [storeMessages]);

	// Resolve sender names that didn't arrive with a join
	useEffect(() => {
		for (const message of storeMessages) {
			if (
				message.sender_id !== currentUserId &&
				!message.users?.full_name &&
				!userNames.has(message.sender_id)
			) {
				void resolveUserName(message.sender_id);
			}
		}
	}, [storeMessages, currentUserId, userNames, resolveUserName]);

	const activeChannel = activeTab === "team" ? teamChannel : "global";

	const messages = useMemo(() => {
		const base = storeMessages.filter(
			(message) => message.channel === activeChannel,
		);
		const pending = localMessages.filter(
			(message) => message.channel === activeChannel,
		);
		return [...base, ...pending].sort(byCreatedAt);
	}, [storeMessages, localMessages, activeChannel]);

	// Track whether the viewer is pinned to the bottom
	useEffect(() => {
		const viewport = getViewportEl();
		if (!viewport) return;
		const onScroll = () => {
			const distance =
				viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
			isAtBottomRef.current = distance < 80;
		};
		onScroll();
		viewport.addEventListener("scroll", onScroll);
		return () => viewport.removeEventListener("scroll", onScroll);
	}, [getViewportEl]);

	// Stick to the bottom when new messages arrive (or on my own sends)
	const lastMessage = messages[messages.length - 1];
	useEffect(() => {
		if (!lastMessage) return;
		if (isAtBottomRef.current || lastMessage.sender_id === currentUserId) {
			setTimeout(() => scrollToBottom(true), 50);
		}
	}, [lastMessage, currentUserId, scrollToBottom]);

	// Start at the bottom on mount
	useEffect(() => {
		scrollToBottom(false);
	}, [scrollToBottom]);

	function displayName(message: Message): string {
		if (message.sender_id === currentUserId) return "Me";
		return (
			message.users?.full_name ?? userNames.get(message.sender_id) ?? "Unknown"
		);
	}

	async function deliver(
		content: string,
		channel: string,
		clientMessageId: string,
	) {
		try {
			await sendMessage(classId, channel, content, clientMessageId);
		} catch (error) {
			console.error("Failed to send message", error);
			setLocalMessages((prev) =>
				prev.map((message) =>
					message.client_message_id === clientMessageId
						? { ...message, local_status: "failed" as const }
						: message,
				),
			);
		} finally {
			setIsPending(false);
		}
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || isPending) return;

		setIsPending(true);
		const content = input.trim();
		setInput("");
		const clientMessageId =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		setLocalMessages((prev) => [
			...prev,
			{
				id: `temp-${clientMessageId}`,
				class_id: classId,
				channel: activeChannel,
				content,
				sender_id: currentUserId,
				created_at: new Date().toISOString(),
				client_message_id: clientMessageId,
				users: { full_name: "Me" },
				local_status: "optimistic",
			},
		]);
		setTimeout(() => scrollToBottom(true), 50);
		await deliver(content, activeChannel, clientMessageId);
	}

	async function retryMessage(message: LocalMessage) {
		if (isPending || !message.client_message_id) return;
		setIsPending(true);
		setLocalMessages((prev) =>
			prev.map((m) =>
				m.client_message_id === message.client_message_id
					? { ...m, local_status: "optimistic" as const }
					: m,
			),
		);
		await deliver(message.content, message.channel, message.client_message_id);
	}

	return (
		<div className="flex flex-col h-full bg-card rounded-md border text-sm flex-1 min-h-0">
			{/* Tabs */}
			<div className="flex border-b">
				<button
					type="button"
					onClick={() => setActiveTab("team")}
					className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-muted ${
						activeTab === "team"
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground"
					}`}
				>
					Team Chat
				</button>
				{!hideGlobal && (
					<button
						type="button"
						onClick={() => setActiveTab("global")}
						className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-muted ${
							activeTab === "global"
								? "border-b-2 border-primary text-primary"
								: "text-muted-foreground"
						}`}
					>
						Global Debate
					</button>
				)}
			</div>

			<div ref={scrollAreaRef} className="flex-1 min-h-0">
				<ScrollArea className="h-full p-4">
					<div className="space-y-4">
						{messages.length === 0 ? (
							<p className="text-sm text-center text-muted-foreground my-10">
								No messages in this chat yet. Say hello!
							</p>
						) : (
							messages.map((msg) => {
								const isMe = msg.sender_id === currentUserId;
								const isFailed =
									(msg as LocalMessage).local_status === "failed";
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
													{displayName(msg)}
												</p>
											)}
											<CollapsibleMessage content={msg.content} />
										</div>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-[10px] text-muted-foreground">
												{new Date(msg.created_at).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
											{isFailed && (
												<button
													type="button"
													onClick={() => retryMessage(msg as LocalMessage)}
													className="text-[10px] text-destructive underline underline-offset-2"
												>
													Failed — retry
												</button>
											)}
										</div>
									</div>
								);
							})
						)}
						<div ref={bottomRef} />
					</div>
				</ScrollArea>
			</div>
			<div className="p-3 border-t bg-muted rounded-b-md shrink-0">
				<form onSubmit={handleSend} className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type a message..."
						className="flex-1 bg-card"
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
