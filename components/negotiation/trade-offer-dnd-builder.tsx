"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	type UniqueIdentifier,
	useDraggable,
	useDroppable,
} from "@dnd-kit/core";
import {
	type ReactNode,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import type { TradeItem } from "@/app/actions/trade";
import { createTradeProposal } from "@/app/actions/trade-controller";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import type { TradeProposalItem } from "@/lib/types/domain";

type Side = "my" | "opponent";
type ContainerId =
	| "my-inventory"
	| "offer-zone"
	| "opponent-inventory"
	| "request-zone";

type Props = {
	classId: string;
	myTeamId: string;
	opponentTeamId: string;
	myTeamItems: TradeItem[];
	opponentTeamItems: TradeItem[];
	myTeamCountry: string;
	opponentTeamCountry: string;
	onSubmitted?: () => void;
};

function InventoryContainer({
	id,
	children,
	tone,
}: {
	id: Extract<ContainerId, "my-inventory" | "opponent-inventory">;
	children: ReactNode;
	tone: Side;
}) {
	const { setNodeRef, isOver } = useDroppable({ id });
	const overStyles =
		tone === "my"
			? "ring-2 ring-blue-400/60 ring-offset-2 ring-offset-background"
			: "ring-2 ring-red-400/60 ring-offset-2 ring-offset-background";
	return (
		<div ref={setNodeRef} className={isOver ? overStyles : ""}>
			{children}
		</div>
	);
}

function TradeItemCard({
	item,
	side,
	variant,
	containerId,
	onRemove,
}: {
	item: TradeItem;
	side: Side;
	variant: "inventory" | "zone";
	containerId: ContainerId;
	onRemove?: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: item.id,
			data: { itemId: item.id, containerId },
		});

	const style = transform
		? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
		: undefined;

	const colorClasses =
		side === "my"
			? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200"
			: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200";

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className={[
				"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
				"cursor-grab active:cursor-grabbing select-none transition-all",
				colorClasses,
				isDragging
					? "opacity-40 scale-95"
					: "hover:shadow-md hover:-translate-y-0.5",
				variant === "zone" ? "pr-2" : "",
			].join(" ")}
		>
			<span className="truncate max-w-[160px]">{item.name}</span>
			<span className="ml-auto text-xs text-muted-foreground tabular-nums">
				{item.value}
			</span>
			{variant === "zone" && onRemove && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="ml-1 w-5 h-5 rounded-full flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 text-xs transition-colors"
					aria-label={`Remove ${item.name}`}
				>
					✕
				</button>
			)}
		</div>
	);
}

function DropZone({
	id,
	label,
	hint,
	children,
	empty,
	tone,
}: {
	id: ContainerId;
	label: string;
	hint?: string;
	children: ReactNode;
	empty: boolean;
	tone: Side;
}) {
	const { setNodeRef, isOver } = useDroppable({ id });

	const borderTone =
		tone === "my"
			? isOver
				? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
				: "border-blue-200 dark:border-blue-800"
			: isOver
				? "border-red-400 bg-red-50/50 dark:bg-red-950/30"
				: "border-red-200 dark:border-red-800";

	return (
		<div
			ref={setNodeRef}
			className={[
				"min-h-[112px] rounded-xl border-2 border-dashed p-3 transition-all duration-150",
				borderTone,
				isOver ? "scale-[1.01]" : "",
			].join(" ")}
		>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{label}
				</div>
				{hint ? (
					<div className="text-[11px] text-muted-foreground/80">{hint}</div>
				) : null}
			</div>
			{empty ? (
				<div className="flex items-center justify-center h-16 text-xs text-muted-foreground italic">
					Drop items here
				</div>
			) : (
				<div className="flex flex-wrap gap-2">{children}</div>
			)}
		</div>
	);
}

function arrayRemove<T>(arr: T[], pred: (t: T) => boolean) {
	const idx = arr.findIndex(pred);
	if (idx === -1) return arr;
	return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

function arrayUpsertMove<T>(arr: T[], item: T, key: (t: T) => string) {
	const k = key(item);
	const without = arr.filter((x) => key(x) !== k);
	return [...without, item];
}

export function TradeOfferDndBuilder({
	classId,
	myTeamId,
	opponentTeamId,
	myTeamItems,
	opponentTeamItems,
	myTeamCountry,
	opponentTeamCountry,
	onSubmitted,
}: Props) {
	const supabase = createClient();
	const [liveMyItems, setLiveMyItems] = useState<TradeItem[]>(
		myTeamItems.filter((i) => !i.is_resolved),
	);
	const [liveOpponentItems, setLiveOpponentItems] = useState<TradeItem[]>(
		opponentTeamItems.filter((i) => !i.is_resolved),
	);
	const [myInventory, setMyInventory] = useState<TradeItem[]>(
		myTeamItems.filter((i) => !i.is_resolved),
	);
	const [opponentInventory, setOpponentInventory] = useState<TradeItem[]>(
		opponentTeamItems.filter((i) => !i.is_resolved),
	);
	const [offerItems, setOfferItems] = useState<TradeItem[]>([]);
	const [requestItems, setRequestItems] = useState<TradeItem[]>([]);
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [liveStatus, setLiveStatus] = useState<
		"connecting" | "live" | "offline"
	>("connecting");
	const [isSyncing, setIsSyncing] = useState(false);

	const itemMeta = useMemo(() => {
		const map = new Map<string, { item: TradeItem; side: Side }>();
		for (const i of liveMyItems) map.set(i.id, { item: i, side: "my" });
		for (const i of liveOpponentItems)
			map.set(i.id, { item: i, side: "opponent" });
		return map;
	}, [liveMyItems, liveOpponentItems]);

	useEffect(() => {
		setLiveMyItems(myTeamItems.filter((i) => !i.is_resolved));
	}, [myTeamItems]);

	useEffect(() => {
		setLiveOpponentItems(opponentTeamItems.filter((i) => !i.is_resolved));
	}, [opponentTeamItems]);

	useEffect(() => {
		let syncTimer: ReturnType<typeof setTimeout> | null = null;
		const channel = supabase
			.channel(`trade-offer-builder:${classId}:${myTeamId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "trade_items",
					filter: `class_id=eq.${classId}`,
				},
				(payload) => {
					// Optimistic UX: reflect incoming collaborative updates immediately.
					setIsSyncing(true);
					if (syncTimer) clearTimeout(syncTimer);
					syncTimer = setTimeout(() => setIsSyncing(false), 500);

					const next = payload.new as TradeItem | null;
					const old = payload.old as TradeItem | null;
					const removeId = old?.id ?? next?.id;

					if (payload.eventType === "DELETE" && removeId) {
						setLiveMyItems((prev) => prev.filter((i) => i.id !== removeId));
						setLiveOpponentItems((prev) =>
							prev.filter((i) => i.id !== removeId),
						);
						return;
					}

					if (!next || next.is_resolved) {
						if (removeId) {
							setLiveMyItems((prev) => prev.filter((i) => i.id !== removeId));
							setLiveOpponentItems((prev) =>
								prev.filter((i) => i.id !== removeId),
							);
						}
						return;
					}

					const upsert = (arr: TradeItem[]) => {
						const idx = arr.findIndex((i) => i.id === next.id);
						if (idx === -1) return [...arr, next];
						return arr.map((i) => (i.id === next.id ? next : i));
					};

					if (next.team_id === myTeamId) {
						setLiveMyItems((prev) => upsert(prev));
						setLiveOpponentItems((prev) =>
							prev.filter((i) => i.id !== next.id),
						);
					} else if (next.team_id === opponentTeamId) {
						setLiveOpponentItems((prev) => upsert(prev));
						setLiveMyItems((prev) => prev.filter((i) => i.id !== next.id));
					} else {
						setLiveMyItems((prev) => prev.filter((i) => i.id !== next.id));
						setLiveOpponentItems((prev) =>
							prev.filter((i) => i.id !== next.id),
						);
					}
				},
			)
			.subscribe((status) => {
				if (status === "SUBSCRIBED") setLiveStatus("live");
				else if (
					status === "CHANNEL_ERROR" ||
					status === "TIMED_OUT" ||
					status === "CLOSED"
				) {
					setLiveStatus("offline");
				} else {
					setLiveStatus("connecting");
				}
			});

		return () => {
			if (syncTimer) clearTimeout(syncTimer);
			supabase.removeChannel(channel);
		};
	}, [supabase, classId, myTeamId, opponentTeamId]);

	// Prune zone items when props change (realtime updates).
	useEffect(() => {
		const myById = new Map(liveMyItems.map((i) => [i.id, i]));
		const oppById = new Map(liveOpponentItems.map((i) => [i.id, i]));

		setOfferItems(
			(prev) =>
				prev.map((i) => myById.get(i.id)).filter(Boolean) as TradeItem[],
		);
		setRequestItems(
			(prev) =>
				prev.map((i) => oppById.get(i.id)).filter(Boolean) as TradeItem[],
		);
	}, [liveMyItems, liveOpponentItems]);

	// Keep inventories consistent with current zone selections.
	useEffect(() => {
		setMyInventory((prev) => {
			const offered = new Set(offerItems.map((i) => i.id));
			const next = liveMyItems.filter((i) => !offered.has(i.id));
			const prevOrder = prev.map((i) => i.id);
			const orderIndex = new Map(prevOrder.map((id, idx) => [id, idx]));
			next.sort(
				(a, b) => (orderIndex.get(a.id) ?? 1e9) - (orderIndex.get(b.id) ?? 1e9),
			);
			return next;
		});
	}, [liveMyItems, offerItems]);

	useEffect(() => {
		setOpponentInventory((prev) => {
			const requested = new Set(requestItems.map((i) => i.id));
			const next = liveOpponentItems.filter((i) => !requested.has(i.id));
			const prevOrder = prev.map((i) => i.id);
			const orderIndex = new Map(prevOrder.map((id, idx) => [id, idx]));
			next.sort(
				(a, b) => (orderIndex.get(a.id) ?? 1e9) - (orderIndex.get(b.id) ?? 1e9),
			);
			return next;
		});
	}, [liveOpponentItems, requestItems]);

	function getContainerForItemId(itemId: string): ContainerId | null {
		if (myInventory.some((i) => i.id === itemId)) return "my-inventory";
		if (offerItems.some((i) => i.id === itemId)) return "offer-zone";
		if (opponentInventory.some((i) => i.id === itemId))
			return "opponent-inventory";
		if (requestItems.some((i) => i.id === itemId)) return "request-zone";
		return null;
	}

	function isDropAllowed(itemId: string, to: ContainerId): boolean {
		const meta = itemMeta.get(itemId);
		if (!meta) return false;
		if (meta.side === "my") return to === "my-inventory" || to === "offer-zone";
		return to === "opponent-inventory" || to === "request-zone";
	}

	function moveItem(itemId: string, from: ContainerId, to: ContainerId) {
		const meta = itemMeta.get(itemId);
		if (!meta) return;
		const item = meta.item;

		const removeFrom = (container: ContainerId) => {
			if (container === "my-inventory")
				setMyInventory((p) => arrayRemove(p, (x) => x.id === itemId));
			if (container === "offer-zone")
				setOfferItems((p) => arrayRemove(p, (x) => x.id === itemId));
			if (container === "opponent-inventory")
				setOpponentInventory((p) => arrayRemove(p, (x) => x.id === itemId));
			if (container === "request-zone")
				setRequestItems((p) => arrayRemove(p, (x) => x.id === itemId));
		};
		const addTo = (container: ContainerId) => {
			if (container === "my-inventory")
				setMyInventory((p) => arrayUpsertMove(p, item, (x) => x.id));
			if (container === "offer-zone")
				setOfferItems((p) => arrayUpsertMove(p, item, (x) => x.id));
			if (container === "opponent-inventory")
				setOpponentInventory((p) => arrayUpsertMove(p, item, (x) => x.id));
			if (container === "request-zone")
				setRequestItems((p) => arrayUpsertMove(p, item, (x) => x.id));
		};

		removeFrom(from);
		addTo(to);
	}

	function handleDragStart(event: DragStartEvent) {
		setSubmitError(null);
		setActiveId(event.active.id);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveId(null);
		const { active, over } = event;
		if (!over) return; // cancelled

		const itemId = String(active.id);
		const overId = String(over.id);
		const overContainer =
			overId === "my-inventory" ||
			overId === "offer-zone" ||
			overId === "opponent-inventory" ||
			overId === "request-zone"
				? (overId as ContainerId)
				: (over.data.current?.containerId as ContainerId | undefined);

		const from = getContainerForItemId(itemId);
		if (!from || !overContainer) return;
		const to = overContainer;

		if (from === to) return;
		if (!isDropAllowed(itemId, to)) return;

		moveItem(itemId, from, to);
	}

	const activeItem = activeId
		? (itemMeta.get(String(activeId))?.item ?? null)
		: null;
	const activeSide = activeItem
		? liveMyItems.some((i) => i.id === activeItem.id)
			? "my"
			: "opponent"
		: null;

	function submit() {
		setSubmitError(null);
		const offered: TradeProposalItem[] = offerItems.map((i) => ({
			item_id: i.id,
			name: i.name,
			value: i.value,
		}));
		const requested: TradeProposalItem[] = requestItems.map((i) => ({
			item_id: i.id,
			name: i.name,
			value: i.value,
		}));

		if (offered.length === 0 && requested.length === 0) {
			setSubmitError("Add at least one item to either side.");
			return;
		}

		startTransition(async () => {
			const result = await createTradeProposal(
				classId,
				myTeamId,
				opponentTeamId,
				offered,
				requested,
			);
			if (result?.error) {
				setSubmitError(result.error);
				return;
			}
			setOfferItems([]);
			setRequestItems([]);
			setMyInventory(liveMyItems);
			setOpponentInventory(liveOpponentItems);
			onSubmitted?.();
		});
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px]">
				<span className="text-muted-foreground">Unresolved Issue Values</span>
				<span className="inline-flex items-center gap-1.5">
					<span
						className={[
							"h-2 w-2 rounded-full",
							liveStatus === "live"
								? "bg-emerald-500"
								: liveStatus === "connecting"
									? "bg-amber-500"
									: "bg-red-500",
						].join(" ")}
					/>
					<span className="text-muted-foreground">
						{isSyncing
							? "Syncing..."
							: liveStatus === "live"
								? "Live"
								: liveStatus === "connecting"
									? "Connecting..."
									: "Offline"}
					</span>
				</span>
			</div>

			<DndContext
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div className="space-y-2">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Team {myTeamCountry} inventory
						</div>
						<div className="rounded-lg border bg-background">
							<ScrollArea className="h-[120px]">
								<InventoryContainer id="my-inventory" tone="my">
									<div className="flex flex-wrap gap-2 p-2">
										{myInventory.length === 0 ? (
											<p className="text-xs text-muted-foreground italic p-2">
												No issues available
											</p>
										) : (
											myInventory.map((item) => (
												<TradeItemCard
													key={item.id}
													item={item}
													side="my"
													variant="inventory"
													containerId="my-inventory"
												/>
											))
										)}
									</div>
								</InventoryContainer>
							</ScrollArea>
						</div>

						<DropZone
							id="offer-zone"
							label="Concessions Offered"
							hint={`From Team ${myTeamCountry}`}
							empty={offerItems.length === 0}
							tone="my"
						>
							{offerItems.map((item) => (
								<TradeItemCard
									key={item.id}
									item={item}
									side="my"
									variant="zone"
									containerId="offer-zone"
									onRemove={() =>
										moveItem(item.id, "offer-zone", "my-inventory")
									}
								/>
							))}
						</DropZone>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Team {opponentTeamCountry} inventory
						</div>
						<div className="rounded-lg border bg-background">
							<ScrollArea className="h-[120px]">
								<InventoryContainer id="opponent-inventory" tone="opponent">
									<div className="flex flex-wrap gap-2 p-2">
										{opponentInventory.length === 0 ? (
											<p className="text-xs text-muted-foreground italic p-2">
												No issues available
											</p>
										) : (
											opponentInventory.map((item) => (
												<TradeItemCard
													key={item.id}
													item={item}
													side="opponent"
													variant="inventory"
													containerId="opponent-inventory"
												/>
											))
										)}
									</div>
								</InventoryContainer>
							</ScrollArea>
						</div>

						<DropZone
							id="request-zone"
							label="Asks Requested"
							hint={`From Team ${opponentTeamCountry}`}
							empty={requestItems.length === 0}
							tone="opponent"
						>
							{requestItems.map((item) => (
								<TradeItemCard
									key={item.id}
									item={item}
									side="opponent"
									variant="zone"
									containerId="request-zone"
									onRemove={() =>
										moveItem(item.id, "request-zone", "opponent-inventory")
									}
								/>
							))}
						</DropZone>
					</div>
				</div>

				<DragOverlay>
					{activeItem && activeSide ? (
						<div className="pointer-events-none">
							<TradeItemCard
								item={activeItem}
								side={activeSide}
								variant="inventory"
								containerId={
									activeSide === "my" ? "my-inventory" : "opponent-inventory"
								}
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{submitError ? (
				<p className="text-xs text-destructive">{submitError}</p>
			) : null}

			<Button
				type="button"
				onClick={submit}
				disabled={
					isPending || (offerItems.length === 0 && requestItems.length === 0)
				}
				className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
			>
				{isPending ? "Submitting…" : "Submit Trade Offer"}
			</Button>
		</div>
	);
}
