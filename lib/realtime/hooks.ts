"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useSyncExternalStore,
} from "react";
import type { ClassStore, Slice } from "@/lib/realtime/class-store";
import { createClient } from "@/lib/supabase/client";

export const ClassStoreContext = createContext<ClassStore | null>(null);

export function useClassStore(): ClassStore {
	const store = useContext(ClassStoreContext);
	if (!store) {
		throw new Error("useClassStore must be used within RealtimeClassProvider");
	}
	return store;
}

function useSlice<T>(slice: Slice<T>): T {
	return useSyncExternalStore(slice.subscribe, slice.get, slice.get);
}

export function useClassRecord() {
	return useSlice(useClassStore().classRecord);
}

export function useTradeItems(teamId?: string) {
	const items = useSlice(useClassStore().tradeItems);
	return useMemo(
		() => (teamId ? items.filter((item) => item.team_id === teamId) : items),
		[items, teamId],
	);
}

export function useProposals() {
	return useSlice(useClassStore().proposals);
}

export function useVotes(proposalId?: string) {
	const votes = useSlice(useClassStore().votes);
	return useMemo(
		() =>
			proposalId
				? votes.filter((vote) => vote.proposal_id === proposalId)
				: votes,
		[votes, proposalId],
	);
}

export function useMessages(channel?: string) {
	const messages = useSlice(useClassStore().messages);
	return useMemo(
		() =>
			channel
				? messages.filter((message) => message.channel === channel)
				: messages,
		[messages, channel],
	);
}

export function useUserNames() {
	return useSlice(useClassStore().userNames);
}

export function useDealBoardItems() {
	return useSlice(useClassStore().dealBoardItems);
}

export function useRatificationCalls() {
	return useSlice(useClassStore().ratificationCalls);
}

/**
 * Resolves a user's display name, caching results in the store so every
 * consumer (chat, votes) shares one lookup per user.
 */
export function useResolveUserName() {
	const store = useClassStore();
	return useCallback(
		async (userId: string): Promise<string | null> => {
			const cached = store.userNames.get().get(userId);
			if (cached !== undefined) return cached;
			const supabase = createClient();
			const { data } = await supabase
				.from("users")
				.select("full_name")
				.eq("id", userId)
				.maybeSingle();
			const name = data?.full_name ?? null;
			store.cacheUserName(userId, name);
			return name;
		},
		[store],
	);
}
