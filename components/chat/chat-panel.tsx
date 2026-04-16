"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getMessagesBefore,
	type Message,
	sendMessage,
} from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

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

	type ChatMessage = Message & { local_status?: "optimistic" | "failed" };
	const [teamMessages, setTeamMessages] =
		useState<ChatMessage[]>(initialTeamMessages);
	const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>(
		initialGlobalMessages,
	);

	const [input, setInput] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMoreTeam, setHasMoreTeam] = useState(
		initialTeamMessages.length >= 100,
	);
	const [hasMoreGlobal, setHasMoreGlobal] = useState(
		initialGlobalMessages.length >= 100,
	);
	const bottomRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);
	const nameCacheRef = useRef<Map<string, string | null>>(new Map());

	const supabase = useMemo(() => createClient(), []);

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

	const upsertMessage = useCallback(
		(list: ChatMessage[], msg: ChatMessage): ChatMessage[] => {
			const next = [...list];
			const byClientId =
				msg.client_message_id != null
					? next.findIndex(
							(item) => item.client_message_id === msg.client_message_id,
						)
					: -1;
			if (byClientId >= 0) {
				next[byClientId] = {
					...next[byClientId],
					...msg,
					local_status: undefined,
				};
				return next;
			}
			const byId = next.findIndex((item) => item.id === msg.id);
			if (byId >= 0) {
				next[byId] = { ...next[byId], ...msg, local_status: undefined };
				return next;
			}
			next.push(msg);
			next.sort(
				(a, b) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
			);
			return next;
		},
		[],
	);

	const resolveSenderName = useCallback(
		async (senderId: string) => {
			if (nameCacheRef.current.has(senderId)) {
				return nameCacheRef.current.get(senderId) ?? null;
			}
			const { data } = await supabase
				.from("users")
				.select("full_name")
				.eq("id", senderId)
				.maybeSingle();
			const name = data?.full_name ?? null;
			nameCacheRef.current.set(senderId, name);
			return name;
		},
		[supabase],
	);

	const handleIncomingMessage = useCallback(
		(msg: ChatMessage) => {
			if (msg.channel === teamChannel) {
				setTeamMessages((prev) => upsertMessage(prev, msg));
			} else if (msg.channel === "global") {
				setGlobalMessages((prev) => upsertMessage(prev, msg));
			}
			const shouldScroll =
				isAtBottomRef.current || msg.sender_id === currentUserId;
			if (shouldScroll) {
				setTimeout(() => scrollToBottom(true), 50);
			}
		},
		[currentUserId, scrollToBottom, teamChannel, upsertMessage],
	);

	useEffect(() => {
		setTeamMessages((prev) => {
			let next = prev;
			for (const msg of initialTeamMessages) {
				next = upsertMessage(next, msg);
			}
			return next;
		});
		setGlobalMessages((prev) => {
			let next = prev;
			for (const msg of initialGlobalMessages) {
				next = upsertMessage(next, msg);
			}
			return next;
		});
	}, [initialTeamMessages, initialGlobalMessages, upsertMessage]);

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

	useEffect(() => {
		const channel = supabase
			.channel(`messages:${classId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `class_id=eq.${classId}`,
				},
				async (payload) => {
					const incoming = payload.new as Message;
					const fullName =
						incoming.users?.full_name ??
						(incoming.sender_id === currentUserId
							? "Me"
							: await resolveSenderName(incoming.sender_id));
					handleIncomingMessage({
						...incoming,
						users: { full_name: fullName },
					});
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [
		classId,
		currentUserId,
		supabase,
		resolveSenderName,
		handleIncomingMessage,
	]);

	const activeChannel = activeTab === "team" ? teamChannel : "global";
	const messages = activeTab === "team" ? teamMessages : globalMessages;
	const hasMore = activeTab === "team" ? hasMoreTeam : hasMoreGlobal;

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || isPending) return;

		setIsPending(true);
		const content = input.trim();
		setInput(""); // Optimistic clear
		const clientMessageId =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Add optimistic message
		const optimisticMsg: ChatMessage = {
			id: `temp-${Date.now()}`,
			class_id: classId,
			channel: activeChannel,
			content,
			sender_id: currentUserId,
			created_at: new Date().toISOString(),
			client_message_id: clientMessageId,
			users: { full_name: "Me" },
			local_status: "optimistic",
		};

		if (activeTab === "team") {
			setTeamMessages((prev) => [...prev, optimisticMsg]);
		} else {
			setGlobalMessages((prev) => [...prev, optimisticMsg]);
		}

		setTimeout(() => scrollToBottom(true), 50);

		try {
			const res = await sendMessage(
				classId,
				activeChannel,
				content,
				clientMessageId,
			);
			if (res?.message) {
				handleIncomingMessage(res.message);
			}
		} catch (error) {
			console.error("Failed to send message", error);
			const markFailed = (list: ChatMessage[]) =>
				list.map((msg) =>
					msg.client_message_id === clientMessageId
						? { ...msg, local_status: "failed" as const }
						: msg,
				);
			if (activeTab === "team") {
				setTeamMessages((prev) => markFailed(prev));
			} else {
				setGlobalMessages((prev) => markFailed(prev));
			}
		} finally {
			setIsPending(false);
		}
	}

	async function retryMessage(msg: ChatMessage) {
		if (isPending) return;
		setIsPending(true);
		const clientMessageId =
			msg.client_message_id ??
			(typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

		const markOptimistic = (list: ChatMessage[]) =>
			list.map((item) =>
				item.id === msg.id
					? {
							...item,
							local_status: "optimistic" as const,
							client_message_id: clientMessageId,
						}
					: item,
			);

		if (msg.channel === teamChannel) {
			setTeamMessages((prev) => markOptimistic(prev));
		} else if (msg.channel === "global") {
			setGlobalMessages((prev) => markOptimistic(prev));
		}

		try {
			const res = await sendMessage(
				classId,
				msg.channel,
				msg.content,
				clientMessageId,
			);
			if (res?.message) {
				handleIncomingMessage(res.message);
			}
		} catch (error) {
			console.error("Failed to resend message", error);
			const markFailed = (list: ChatMessage[]) =>
				list.map((item) =>
					item.id === msg.id
						? { ...item, local_status: "failed" as const }
						: item,
				);
			if (msg.channel === teamChannel) {
				setTeamMessages((prev) => markFailed(prev));
			} else if (msg.channel === "global") {
				setGlobalMessages((prev) => markFailed(prev));
			}
		} finally {
			setIsPending(false);
		}
	}

	async function loadOlderMessages() {
		if (loadingOlder || !hasMore) return;
		setLoadingOlder(true);
		const activeList = activeTab === "team" ? teamMessages : globalMessages;
		const oldest = activeList[0]?.created_at;
		if (!oldest) {
			setLoadingOlder(false);
			return;
		}

		const viewport = getViewportEl();
		const prevScrollHeight = viewport?.scrollHeight ?? 0;

		const older = await getMessagesBefore(classId, activeChannel, oldest, 50);
		if (older.length === 0) {
			if (activeTab === "team") setHasMoreTeam(false);
			else setHasMoreGlobal(false);
			setLoadingOlder(false);
			return;
		}
		if (activeTab === "team") {
			setTeamMessages((prev) => [...older, ...prev]);
			setHasMoreTeam(older.length >= 50);
		} else {
			setGlobalMessages((prev) => [...older, ...prev]);
			setHasMoreGlobal(older.length >= 50);
		}
		setTimeout(() => {
			const nextViewport = getViewportEl();
			if (!nextViewport) return;
			const nextScrollHeight = nextViewport.scrollHeight;
			nextViewport.scrollTop =
				nextScrollHeight - prevScrollHeight + nextViewport.scrollTop;
		}, 0);
		setLoadingOlder(false);
	}

	return (
		<div className="flex flex-col h-full bg-card rounded-md border text-sm flex-1 min-h-0">
			{/* Tabs */}
			<div className="flex border-b">
				<button
					onClick={() => setActiveTab("team")}
					className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-muted ${
						activeTab === "team"
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground"
					}`}
				>
					Team Chat
				</button>
				<button
					onClick={() => setActiveTab("global")}
					className={`flex-1 py-2 px-4 text-center font-medium text-xs transition-colors hover:bg-muted ${
						activeTab === "global"
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground"
					}`}
				>
					Global Debate
				</button>
			</div>

			<div ref={scrollAreaRef} className="flex-1 min-h-0">
				<ScrollArea className="flex-1 p-4 min-h-0">
					<div className="space-y-4">
						{hasMore && (
							<div className="flex justify-center">
								<Button
									variant="ghost"
									size="sm"
									onClick={loadOlderMessages}
									disabled={loadingOlder}
								>
									{loadingOlder ? "Loading..." : "Load earlier messages"}
								</Button>
							</div>
						)}
						{messages.length === 0 ? (
							<p className="text-sm text-center text-muted-foreground my-10">
								No messages in this chat yet. Say hello!
							</p>
						) : (
							messages.map((msg) => {
								const isMe = msg.sender_id === currentUserId;
								const isFailed = msg.local_status === "failed";
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
													onClick={() => retryMessage(msg)}
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
