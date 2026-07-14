"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	useDraggable,
	useDroppable,
} from "@dnd-kit/core";
import { useState, useTransition } from "react";
import { createTradeProposal } from "@/app/actions/trade-controller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TeamCountry, TradeProposalItem } from "@/lib/types/domain";

// ─── Types ───────────────────────────────────────────────────────────────
type TradeItemWithTeam = {
	id: string;
	name: string;
	value: number;
	team_id: string;
	team: { id: string; country: TeamCountry };
};

type Props = {
	classId: string;
	myTeamId: string;
	myTeamCountry: TeamCountry;
	opponentTeamId: string;
	opponentTeamCountry: TeamCountry;
	allItems: TradeItemWithTeam[];
	myTeamScore: number;
	opponentTeamScore: number;
};

// ─── Draggable Item Chip ─────────────────────────────────────────────────
function DraggableItem({
	item,
	isInTradeZone,
	onRemove,
	teamCountry,
}: {
	item: TradeItemWithTeam;
	isInTradeZone: boolean;
	onRemove?: () => void;
	teamCountry: TeamCountry;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: item.id,
			data: { item },
		});

	const style = transform
		? { transform: `translate(${transform.x}px, ${transform.y}px)` }
		: undefined;

	const colorClasses =
		teamCountry === "USA"
			? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200"
			: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200";

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
                cursor-grab active:cursor-grabbing select-none transition-all
                ${colorClasses}
                ${isDragging ? "opacity-40 scale-95" : "hover:shadow-md hover:-translate-y-0.5"}
            `}
		>
			<span className="text-base">{teamCountry === "USA" ? "🇺🇸" : "🇨🇳"}</span>
			<span>{item.name}</span>
			{isInTradeZone && onRemove && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="ml-1 w-5 h-5 rounded-full flex items-center justify-center
                        bg-foreground/10 hover:bg-foreground/20
                        text-xs transition-colors"
					aria-label={`Remove ${item.name}`}
				>
					✕
				</button>
			)}
		</div>
	);
}

// ─── Drag Overlay (ghost while dragging) ─────────────────────────────────
function DragOverlayItem({
	item,
	teamCountry,
}: {
	item: TradeItemWithTeam;
	teamCountry: TeamCountry;
}) {
	const colorClasses =
		teamCountry === "USA"
			? "bg-blue-100 border-blue-300 text-blue-900"
			: "bg-red-100 border-red-300 text-red-900";

	return (
		<div
			className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
                shadow-xl scale-105 ${colorClasses}
            `}
		>
			<span className="text-base">{teamCountry === "USA" ? "🇺🇸" : "🇨🇳"}</span>
			<span>{item.name}</span>
		</div>
	);
}

// ─── Drop Zone ───────────────────────────────────────────────────────────
function TradeDropZone({
	id,
	label,
	children,
	isEmpty,
	teamCountry,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
	isEmpty: boolean;
	teamCountry: TeamCountry;
}) {
	const { isOver, setNodeRef } = useDroppable({ id });

	const borderColor =
		teamCountry === "USA"
			? isOver
				? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
				: "border-blue-200 dark:border-blue-800"
			: isOver
				? "border-red-400 bg-red-50/50 dark:bg-red-950/30"
				: "border-red-200 dark:border-red-800";

	return (
		<div
			ref={setNodeRef}
			className={`
                min-h-[100px] rounded-xl border-2 border-dashed p-3 transition-all duration-200
                ${borderColor}
                ${isOver ? "scale-[1.01]" : ""}
            `}
		>
			<div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
				<span className="text-amber-500">★</span>
				{label}
				<span className="text-amber-500">★</span>
			</div>
			{isEmpty ? (
				<div className="flex items-center justify-center h-16 text-xs text-muted-foreground italic">
					Drop items here
				</div>
			) : (
				<div className="flex flex-wrap gap-2">{children}</div>
			)}
		</div>
	);
}

// ─── Main Component ──────────────────────────────────────────────────────
export function NegotiationTradePanel({
	classId,
	myTeamId,
	myTeamCountry,
	opponentTeamId,
	opponentTeamCountry,
	allItems,
	myTeamScore,
	opponentTeamScore,
}: Props) {
	const [offeredItemIds, setOfferedItemIds] = useState<Set<string>>(new Set());
	const [requestedItemIds, setRequestedItemIds] = useState<Set<string>>(
		new Set(),
	);
	const [activeDragItem, setActiveDragItem] =
		useState<TradeItemWithTeam | null>(null);
	const [isPending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<string | null>(null);

	const myItems = allItems.filter((i) => i.team_id === myTeamId);
	const opponentItems = allItems.filter((i) => i.team_id === opponentTeamId);

	const myAvailableItems = myItems.filter((i) => !offeredItemIds.has(i.id));
	const myOfferedItems = myItems.filter((i) => offeredItemIds.has(i.id));
	const opponentAvailableItems = opponentItems.filter(
		(i) => !requestedItemIds.has(i.id),
	);
	const opponentRequestedItems = opponentItems.filter((i) =>
		requestedItemIds.has(i.id),
	);

	function handleDragStart(event: DragStartEvent) {
		const item = event.active.data.current?.item as TradeItemWithTeam;
		setActiveDragItem(item);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveDragItem(null);
		const { active, over } = event;
		if (!over) return;

		const draggedItem = active.data.current?.item as TradeItemWithTeam;
		if (!draggedItem) return;

		const overId = over.id as string;

		// Determine which zone was dropped into
		if (overId === "my-trade-zone" && draggedItem.team_id === myTeamId) {
			setOfferedItemIds((prev) => new Set(prev).add(draggedItem.id));
		} else if (
			overId === "opponent-trade-zone" &&
			draggedItem.team_id === opponentTeamId
		) {
			setRequestedItemIds((prev) => new Set(prev).add(draggedItem.id));
		}
	}

	function removeOffered(itemId: string) {
		setOfferedItemIds((prev) => {
			const next = new Set(prev);
			next.delete(itemId);
			return next;
		});
	}

	function removeRequested(itemId: string) {
		setRequestedItemIds((prev) => {
			const next = new Set(prev);
			next.delete(itemId);
			return next;
		});
	}

	function handleSubmit() {
		setSubmitError(null);
		const offered: TradeProposalItem[] = myOfferedItems.map((i) => ({
			item_id: i.id,
			name: i.name,
			value: i.value,
		}));
		const requested: TradeProposalItem[] = opponentRequestedItems.map((i) => ({
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
			if (result.error) {
				setSubmitError(result.error);
			} else {
				// Clear the trade zones on success
				setOfferedItemIds(new Set());
				setRequestedItemIds(new Set());
			}
		});
	}

	const flagEmoji = (c: TeamCountry) => (c === "USA" ? "🇺🇸" : "🇨🇳");

	return (
		<div className="flex flex-col h-full">
			<DndContext
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
					{/* ─── My Team Column ─── */}
					<div className="flex flex-col gap-3 min-h-0">
						{/* Score Header */}
						<div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-200/50 dark:border-blue-800/50">
							<div className="flex items-center gap-2">
								<span className="text-lg">{flagEmoji(myTeamCountry)}</span>
								<span className="font-semibold text-sm">
									Team {myTeamCountry}
								</span>
								<Badge variant="secondary" className="text-xs">
									You
								</Badge>
							</div>
							<div className="text-right">
								<div className="text-xs text-muted-foreground">Score</div>
								<div className="font-bold text-lg leading-tight text-blue-600 dark:text-blue-400">
									{myTeamScore}
								</div>
							</div>
						</div>

						{/* Available Items */}
						<div className="flex-1 min-h-0">
							<div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
								Your Items ({myAvailableItems.length} remaining)
							</div>
							<ScrollArea className="h-[120px]">
								<div className="flex flex-wrap gap-2 p-1">
									{myAvailableItems.map((item) => (
										<DraggableItem
											key={item.id}
											item={item}
											isInTradeZone={false}
											teamCountry={myTeamCountry}
										/>
									))}
									{myAvailableItems.length === 0 && (
										<p className="text-xs text-muted-foreground italic">
											All items are in the trade zone
										</p>
									)}
								</div>
							</ScrollArea>
						</div>

						{/* My Trade Zone */}
						<TradeDropZone
							id="my-trade-zone"
							label="We Offer"
							isEmpty={myOfferedItems.length === 0}
							teamCountry={myTeamCountry}
						>
							{myOfferedItems.map((item) => (
								<DraggableItem
									key={item.id}
									item={item}
									isInTradeZone={true}
									onRemove={() => removeOffered(item.id)}
									teamCountry={myTeamCountry}
								/>
							))}
						</TradeDropZone>
					</div>

					{/* ─── Opponent Team Column ─── */}
					<div className="flex flex-col gap-3 min-h-0">
						{/* Score Header */}
						<div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 dark:bg-red-500/20 border border-red-200/50 dark:border-red-800/50">
							<div className="flex items-center gap-2">
								<span className="text-lg">
									{flagEmoji(opponentTeamCountry)}
								</span>
								<span className="font-semibold text-sm">
									Team {opponentTeamCountry}
								</span>
							</div>
							<div className="text-right">
								<div className="text-xs text-muted-foreground">Score</div>
								<div className="font-bold text-lg leading-tight text-red-600 dark:text-red-400">
									{opponentTeamScore}
								</div>
							</div>
						</div>

						{/* Available Items */}
						<div className="flex-1 min-h-0">
							<div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
								Their Items ({opponentAvailableItems.length} remaining)
							</div>
							<ScrollArea className="h-[120px]">
								<div className="flex flex-wrap gap-2 p-1">
									{opponentAvailableItems.map((item) => (
										<DraggableItem
											key={item.id}
											item={item}
											isInTradeZone={false}
											teamCountry={opponentTeamCountry}
										/>
									))}
									{opponentAvailableItems.length === 0 && (
										<p className="text-xs text-muted-foreground italic">
											All items are in the trade zone
										</p>
									)}
								</div>
							</ScrollArea>
						</div>

						{/* Opponent Trade Zone */}
						<TradeDropZone
							id="opponent-trade-zone"
							label="We Request"
							isEmpty={opponentRequestedItems.length === 0}
							teamCountry={opponentTeamCountry}
						>
							{opponentRequestedItems.map((item) => (
								<DraggableItem
									key={item.id}
									item={item}
									isInTradeZone={true}
									onRemove={() => removeRequested(item.id)}
									teamCountry={opponentTeamCountry}
								/>
							))}
						</TradeDropZone>
					</div>
				</div>

				{/* Drag overlay */}
				<DragOverlay>
					{activeDragItem ? (
						<DragOverlayItem
							item={activeDragItem}
							teamCountry={activeDragItem.team.country}
						/>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Submit */}
			<div className="mt-4 flex flex-col items-center gap-2">
				{submitError && (
					<p className="text-xs text-destructive">{submitError}</p>
				)}
				<Button
					onClick={handleSubmit}
					disabled={
						isPending ||
						(offeredItemIds.size === 0 && requestedItemIds.size === 0)
					}
					className="w-full max-w-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
					size="lg"
				>
					{isPending ? (
						<span className="flex items-center gap-2">
							<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							Submitting…
						</span>
					) : (
						"Submit Trade Proposal"
					)}
				</Button>
			</div>
		</div>
	);
}
