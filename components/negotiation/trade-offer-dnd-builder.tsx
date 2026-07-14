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
import { GripVertical, Info } from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { createTradeProposal } from "@/app/actions/trade-controller";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import type { TradeItem, TradeProposalItem } from "@/lib/types/domain";
import { TradeItemDetailModal } from "./trade-item-detail-modal";

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
	onView,
}: {
	item: TradeItem;
	side: Side;
	variant: "inventory" | "zone";
	containerId: ContainerId;
	onRemove?: () => void;
	onView?: () => void;
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
			className={[
				"flex items-center gap-2 rounded-xl border pl-1 pr-3 py-2.5 text-xs font-medium w-full",
				"select-none transition-all group relative bg-background",
				colorClasses,
				isDragging
					? "opacity-40 scale-[0.98] blur-[1px] z-50"
					: "hover:shadow-md hover:border-foreground/20",
				variant === "zone" ? "pr-2" : "",
			].join(" ")}
		>
			{/* Drag Handle Area */}
			<div
				{...listeners}
				{...attributes}
				className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing hover:bg-foreground/5 rounded-lg py-1 px-1 -ml-0.5 transition-colors"
			>
				<GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
				<span className="line-clamp-2 text-left leading-snug">{item.name}</span>
			</div>

			{/* Interactive Elements Area (Non-Draggable) */}
			<div className="flex items-center gap-1 shrink-0 ml-1">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onView?.();
					}}
					className="p-1 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
					title="View Details"
				>
					<Info className="w-3.5 h-3.5" />
				</button>
				<span
					className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-background/50 ${item.value && item.value > 0 ? "text-emerald-600 dark:text-emerald-400" : item.value && item.value < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
				>
					{item.value && item.value > 0 ? `+${item.value}` : item.value || "0"}
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
	const [selectedDetailItem, setSelectedDetailItem] =
		useState<TradeItem | null>(null);

	const itemMeta = useMemo(() => {
		const map = new Map<string, { item: TradeItem; side: Side }>();
		for (const i of liveMyItems) map.set(i.id, { item: i, side: "my" });
		for (const i of liveOpponentItems)
			map.set(i.id, { item: i, side: "opponent" });
		return map;
	}, [liveMyItems, liveOpponentItems]);

	const currentScore = useMemo(() => {
		const offerSum = offerItems.reduce((s, i) => s + (i.value || 0), 0);
		const requestSum = requestItems.reduce((s, i) => s + (i.value || 0), 0);
		return offerSum + requestSum;
	}, [offerItems, requestItems]);

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
					} else {
						// Security: ignore updates for other teams
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
	}, [supabase, classId, myTeamId]);

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

		const itemId = String(active.id);
		const overId = over ? String(over.id) : null;
		const overContainer =
			overId === "my-inventory" ||
			overId === "offer-zone" ||
			overId === "opponent-inventory" ||
			overId === "request-zone"
				? (overId as ContainerId)
				: (over?.data.current?.containerId as ContainerId | undefined);

		const from = getContainerForItemId(itemId);
		if (!from) return;

		// Handle drag-to-remove: drop outside valid container or into forbidden inventory
		if (!over || !overContainer || !isDropAllowed(itemId, overContainer)) {
			if (from === "offer-zone") {
				moveItem(itemId, "offer-zone", "my-inventory");
			} else if (from === "request-zone") {
				moveItem(itemId, "request-zone", "opponent-inventory");
			}
			return;
		}

		if (from === overContainer) return;

		moveItem(itemId, from, overContainer);
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
						<div className="rounded-lg border bg-background overflow-hidden">
							<ScrollArea className="h-[140px]">
								<InventoryContainer id="my-inventory" tone="my">
									<div className="grid grid-cols-1 gap-2 p-3">
										{myInventory.length === 0 ? (
											<p className="text-xs text-muted-foreground italic p-2 text-center">
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
													onView={() => setSelectedDetailItem(item)}
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
									onView={() => setSelectedDetailItem(item)}
								/>
							))}
						</DropZone>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Team {opponentTeamCountry} inventory
						</div>
						<div className="rounded-lg border bg-background overflow-hidden">
							<ScrollArea className="h-[140px]">
								<InventoryContainer id="opponent-inventory" tone="opponent">
									<div className="grid grid-cols-1 gap-2 p-3">
										{opponentInventory.length === 0 ? (
											<p className="text-xs text-muted-foreground italic p-2 text-center">
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
													onView={() => setSelectedDetailItem(item)}
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
									onView={() => setSelectedDetailItem(item)}
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

			<div className="flex flex-col gap-3">
				{submitError ? (
					<p className="text-xs text-destructive px-1">{submitError}</p>
				) : null}

				<div className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/30">
					<div className="flex flex-col text-left">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Your Net Score Impact
						</span>
						<span
							className={`text-2xl font-bold tabular-nums ${currentScore > 0 ? "text-emerald-600" : currentScore < 0 ? "text-red-600" : "text-muted-foreground"}`}
						>
							{currentScore > 0 ? `+${currentScore}` : currentScore}
						</span>
					</div>
					<div className="text-right">
						<div className="text-[10px] text-muted-foreground mb-1">
							{offerItems.length} concessions · {requestItems.length} asks
						</div>
						<Button
							type="button"
							onClick={submit}
							disabled={
								isPending ||
								(offerItems.length === 0 && requestItems.length === 0)
							}
							className={`h-10 px-6 font-semibold shadow-sm transition-all ${currentScore >= 0 ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
						>
							{isPending ? "Submitting…" : "Submit Trade Offer"}
						</Button>
					</div>
				</div>
			</div>

			{selectedDetailItem && (
				<TradeItemDetailModal
					item={selectedDetailItem}
					onClose={() => setSelectedDetailItem(null)}
				/>
			)}
		</div>
	);
}
