"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Message } from "@/app/actions/chat";
import {
	applyRowEvent,
	byCreatedAt,
	byName,
	createClassStore,
	type LiveClassRecord,
	type RealtimeSnapshot,
	type RowEventType,
} from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import { createClient } from "@/lib/supabase/client";
import type {
	DealBoardItem,
	DealRatificationCall,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";

type ChangePayload<T> = {
	eventType: RowEventType;
	new: Partial<T>;
	old: { id?: string };
};

export function RealtimeClassProvider({
	classId,
	snapshot,
	refetchSnapshot,
	children,
}: {
	classId: string;
	snapshot: RealtimeSnapshot;
	/** Server action used to resync after a dropped realtime connection. */
	refetchSnapshot?: (classId: string) => Promise<RealtimeSnapshot | null>;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [store] = useState(() => createClassStore(snapshot));
	const hadDropRef = useRef(false);

	useEffect(() => {
		const supabase = createClient();
		const teamIds = new Set(store.teams.map((team) => team.id));

		const channel = supabase
			.channel(`class:${classId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "classes",
					filter: `id=eq.${classId}`,
				},
				(payload) => {
					const { new: next } = payload as ChangePayload<LiveClassRecord>;
					const prev = store.classRecord.get();
					store.classRecord.set({ ...prev, ...next });
					if (
						next.current_period !== undefined &&
						next.current_period !== prev.current_period
					) {
						// Page layout is server-rendered per period; this is the one
						// event that still needs a full refresh.
						router.refresh();
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_items",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const change = payload as ChangePayload<TradeItem>;
					applyRowEvent(
						store.tradeItems,
						change.eventType,
						change.eventType === "DELETE" ? null : (change.new as TradeItem),
						change.old?.id ?? null,
						byName,
					);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_proposals",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const change = payload as ChangePayload<TradeProposal>;
					applyRowEvent(
						store.proposals,
						change.eventType,
						change.eventType === "DELETE"
							? null
							: (change.new as TradeProposal),
						change.old?.id ?? null,
						byCreatedAt,
					);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "deal_board_items",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const change = payload as ChangePayload<DealBoardItem>;
					applyRowEvent(
						store.dealBoardItems,
						change.eventType,
						change.eventType === "DELETE"
							? null
							: (change.new as DealBoardItem),
						change.old?.id ?? null,
						byCreatedAt,
					);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "deal_ratification_calls",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const change = payload as ChangePayload<DealRatificationCall>;
					applyRowEvent(
						store.ratificationCalls,
						change.eventType,
						change.eventType === "DELETE"
							? null
							: (change.new as DealRatificationCall),
						change.old?.id ?? null,
						byCreatedAt,
					);
				},
			)
			.on(
				"postgres_changes",
				// votes has no class_id column, so filter client-side by team.
				{ event: "*", schema: "public", table: "votes" },
				(payload) => {
					const change = payload as ChangePayload<Vote>;
					const teamId =
						(change.new as Vote | undefined)?.team_id ??
						(change.old as Vote | undefined)?.team_id;
					if (
						change.eventType !== "DELETE" &&
						(!teamId || !teamIds.has(teamId))
					) {
						return;
					}
					applyRowEvent(
						store.votes,
						change.eventType,
						change.eventType === "DELETE" ? null : (change.new as Vote),
						change.old?.id ?? null,
						byCreatedAt,
					);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					const change = payload as ChangePayload<Message>;
					applyRowEvent(
						store.messages,
						"INSERT",
						change.new as Message,
						null,
						byCreatedAt,
					);
				},
			)
			.subscribe((status: string) => {
				if (status === "SUBSCRIBED" && hadDropRef.current) {
					hadDropRef.current = false;
					if (refetchSnapshot) {
						void refetchSnapshot(classId).then((fresh) => {
							if (fresh) store.hydrate(fresh);
						});
					}
				} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
					hadDropRef.current = true;
				}
			});

		return () => {
			supabase.removeChannel(channel);
		};
	}, [classId, store, router, refetchSnapshot]);

	return (
		<ClassStoreContext.Provider value={store}>
			{children}
		</ClassStoreContext.Provider>
	);
}
