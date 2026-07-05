import type { Message } from "@/app/actions/chat";
import type {
	DealBoardItem,
	DealRatificationCall,
	TeamCountry,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";

export type LiveClassRecord = {
	id: string;
	name: string;
	class_code: string | null;
	current_period: number;
	status: string;
};

export type RealtimeSnapshot = {
	classRecord: LiveClassRecord;
	teams: { id: string; country: TeamCountry }[];
	teamMemberCounts: Record<string, number>;
	tradeItems: TradeItem[];
	proposals: TradeProposal[];
	votes: Vote[];
	messages: Message[];
	dealBoardItems: DealBoardItem[];
	ratificationCalls: DealRatificationCall[];
};

export type Slice<T> = {
	get: () => T;
	set: (next: T) => void;
	subscribe: (listener: () => void) => () => void;
};

export function createSlice<T>(initial: T): Slice<T> {
	let value = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => value,
		set: (next) => {
			if (Object.is(next, value)) return;
			value = next;
			for (const listener of listeners) listener();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

type Row = { id: string };

export function upsertRow<T extends Row>(
	rows: T[],
	row: T,
	compare: (a: T, b: T) => number,
): T[] {
	const index = rows.findIndex((r) => r.id === row.id);
	const next =
		index === -1
			? [...rows, row]
			: rows.map((r, i) => (i === index ? { ...r, ...row } : r));
	return next.sort(compare);
}

export function removeRow<T extends Row>(rows: T[], id: string): T[] {
	const next = rows.filter((r) => r.id !== id);
	return next.length === rows.length ? rows : next;
}

export function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name);
}

export function byCreatedAt(
	a: { created_at: string },
	b: { created_at: string },
): number {
	return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export type RowEventType = "INSERT" | "UPDATE" | "DELETE";

export function applyRowEvent<T extends Row>(
	slice: Slice<T[]>,
	eventType: RowEventType,
	newRow: T | null,
	oldRowId: string | null,
	compare: (a: T, b: T) => number,
): void {
	if (eventType === "DELETE") {
		if (oldRowId) slice.set(removeRow(slice.get(), oldRowId));
		return;
	}
	if (newRow) slice.set(upsertRow(slice.get(), newRow, compare));
}

export type ClassStore = {
	classRecord: Slice<LiveClassRecord>;
	tradeItems: Slice<TradeItem[]>;
	proposals: Slice<TradeProposal[]>;
	votes: Slice<Vote[]>;
	messages: Slice<Message[]>;
	dealBoardItems: Slice<DealBoardItem[]>;
	ratificationCalls: Slice<DealRatificationCall[]>;
	userNames: Slice<ReadonlyMap<string, string | null>>;
	/** Static per-session data; a period-change router.refresh() re-renders pages that need fresher values. */
	teams: { id: string; country: TeamCountry }[];
	teamMemberCounts: Record<string, number>;
	hydrate: (snapshot: RealtimeSnapshot) => void;
	cacheUserName: (userId: string, name: string | null) => void;
};

function seedUserNames(
	snapshot: RealtimeSnapshot,
	base?: ReadonlyMap<string, string | null>,
): Map<string, string | null> {
	const map = new Map(base ?? []);
	for (const message of snapshot.messages) {
		if (message.users?.full_name != null) {
			map.set(message.sender_id, message.users.full_name);
		}
	}
	for (const vote of snapshot.votes) {
		if (vote.user?.full_name != null) {
			map.set(vote.user_id, vote.user.full_name);
		}
	}
	return map;
}

export function createClassStore(snapshot: RealtimeSnapshot): ClassStore {
	const classRecord = createSlice(snapshot.classRecord);
	const tradeItems = createSlice([...snapshot.tradeItems].sort(byName));
	const proposals = createSlice([...snapshot.proposals].sort(byCreatedAt));
	const votes = createSlice([...snapshot.votes].sort(byCreatedAt));
	const messages = createSlice([...snapshot.messages].sort(byCreatedAt));
	const dealBoardItems = createSlice(
		[...snapshot.dealBoardItems].sort(byCreatedAt),
	);
	const ratificationCalls = createSlice(
		[...snapshot.ratificationCalls].sort(byCreatedAt),
	);
	const userNames = createSlice<ReadonlyMap<string, string | null>>(
		seedUserNames(snapshot),
	);

	return {
		classRecord,
		tradeItems,
		proposals,
		votes,
		messages,
		dealBoardItems,
		ratificationCalls,
		userNames,
		teams: snapshot.teams,
		teamMemberCounts: snapshot.teamMemberCounts,
		hydrate(next) {
			classRecord.set(next.classRecord);
			tradeItems.set([...next.tradeItems].sort(byName));
			proposals.set([...next.proposals].sort(byCreatedAt));
			votes.set([...next.votes].sort(byCreatedAt));
			messages.set([...next.messages].sort(byCreatedAt));
			dealBoardItems.set([...next.dealBoardItems].sort(byCreatedAt));
			ratificationCalls.set([...next.ratificationCalls].sort(byCreatedAt));
			userNames.set(seedUserNames(next, userNames.get()));
		},
		cacheUserName(userId, name) {
			const current = userNames.get();
			if (current.get(userId) === name) return;
			const map = new Map(current);
			map.set(userId, name);
			userNames.set(map);
		},
	};
}
