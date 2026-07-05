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
import { GripVertical, Info, Plus } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
	addBoardItem,
	callForRatification,
	removeBoardItem,
	withdrawRatificationCall,
} from "@/app/actions/deal-controller";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildViewerValueMap } from "@/lib/realtime/derive";
import {
	useDealBoardItems,
	useRatificationCalls,
	useResolveUserName,
	useTradeItems,
	useUserNames,
} from "@/lib/realtime/hooks";
import type { DealBoardItem, TradeItem } from "@/lib/types/domain";
import { TradeItemDetailModal } from "./trade-item-detail-modal";

type SharedDealBoardProps = {
	classId: string;
	myTeamId: string;
	myTeamCountry: string;
	opponentTeamCountry: string;
	/** True while the package vote is pending — board is read-only. */
	frozen: boolean;
	/** Reopens the voting panel when the board is frozen. */
	onOpenVote?: () => void;
	/** Shown after a rejected ratification wiped the board. */
	resetBannerVisible: boolean;
	onDismissResetBanner: () => void;
};

function formatValue(value: number) {
	return value > 0 ? `+${value}` : `${value}`;
}

function valueTone(value: number) {
	if (value > 0) return "text-emerald-600 dark:text-emerald-400";
	if (value < 0) return "text-red-600 dark:text-red-400";
	return "text-muted-foreground";
}

// Card colors are anchored to the giving country (blue = USA, red = China)
// so students on opposite teams see the same color for the same card.
const COUNTRY_TONES: Record<string, string> = {
	USA: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200",
	China:
		"bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200",
};

function countryTone(country: string) {
	return COUNTRY_TONES[country] ?? COUNTRY_TONES.USA;
}

function InventoryCard({
	item,
	givesCountry,
	disabled,
	onAdd,
	onView,
}: {
	item: TradeItem;
	givesCountry: string;
	disabled: boolean;
	onAdd: () => void;
	onView: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({ id: item.id, disabled });

	const style = transform
		? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
		: undefined;

	const roleTone = countryTone(givesCountry);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={[
				"flex items-center gap-2 rounded-xl border pl-1 pr-2 py-2 text-xs font-medium w-full",
				"select-none transition-all bg-background",
				roleTone,
				isDragging ? "opacity-40 scale-[0.98] z-50" : "hover:shadow-md",
			].join(" ")}
		>
			<div
				{...listeners}
				{...attributes}
				className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing rounded-lg py-1 px-1"
			>
				<GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
				<span className="line-clamp-2 text-left leading-snug">{item.name}</span>
			</div>
			<span
				className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-background/50 ${valueTone(item.value)}`}
			>
				{formatValue(item.value)}
			</span>
			<button
				type="button"
				onClick={onView}
				aria-label={`View details for ${item.name}`}
				className="p-1 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
				title="View Details"
			>
				<Info className="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={onAdd}
				aria-label={`Add ${item.name}`}
				className="p-1 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
			>
				<Plus className="w-3.5 h-3.5" />
			</button>
		</div>
	);
}

export function SharedDealBoard({
	classId,
	myTeamId,
	myTeamCountry,
	opponentTeamCountry,
	frozen,
	onOpenVote,
	resetBannerVisible,
	onDismissResetBanner,
}: SharedDealBoardProps) {
	const teamItems = useTradeItems(myTeamId);
	const boardItems = useDealBoardItems();
	const ratificationCalls = useRatificationCalls();
	const userNames = useUserNames();
	const resolveUserName = useResolveUserName();
	const [isPending, startTransition] = useTransition();
	const [actionError, setActionError] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
	const [detailItem, setDetailItem] = useState<TradeItem | null>(null);

	// Resolve display names for board-row adders that arrived without a join.
	useEffect(() => {
		for (const row of boardItems) {
			if (!userNames.has(row.added_by)) {
				void resolveUserName(row.added_by);
			}
		}
	}, [boardItems, userNames, resolveUserName]);

	const { setNodeRef: setBoardRef, isOver } = useDroppable({
		id: "deal-board",
	});

	const viewerValueMap = useMemo(
		() => buildViewerValueMap(teamItems),
		[teamItems],
	);

	const valueForRow = (row: DealBoardItem) =>
		(row.issue_id ? viewerValueMap.get(row.issue_id) : undefined) ??
		viewerValueMap.get(row.name) ??
		0;

	const addedByLabel = (row: DealBoardItem) =>
		userNames.get(row.added_by) ??
		(row.added_by_team_id === myTeamId
			? `Team ${myTeamCountry}`
			: `Team ${opponentTeamCountry}`);

	// The viewer's inventory: unresolved mirror rows whose issue isn't on the board.
	const inventory = useMemo(() => {
		const onBoard = new Set(
			boardItems.flatMap((row) =>
				row.issue_id ? [row.issue_id, row.name] : [row.name],
			),
		);
		return teamItems.filter(
			(item) =>
				!item.is_resolved &&
				!(item.issue_id && onBoard.has(item.issue_id)) &&
				!onBoard.has(item.name),
		);
	}, [teamItems, boardItems]);

	const netScore = useMemo(
		() => boardItems.reduce((sum, row) => sum + valueForRow(row), 0),
		// valueForRow is stable per viewerValueMap
		// biome-ignore lint/correctness/useExhaustiveDependencies: derived via viewerValueMap
		[boardItems, viewerValueMap],
	);

	const myTeamCalled = ratificationCalls.some(
		(call) => call.team_id === myTeamId,
	);
	const otherTeamCalled = ratificationCalls.some(
		(call) => call.team_id !== myTeamId,
	);

	const runAction = (action: () => Promise<{ error?: string } | undefined>) => {
		setActionError(null);
		startTransition(async () => {
			const result = await action();
			if (result?.error) setActionError(result.error);
		});
	};

	const handleAdd = (itemId: string) =>
		runAction(() => addBoardItem(classId, itemId));

	function handleDragEnd(event: DragEndEvent) {
		setActiveId(null);
		if (frozen) return;
		const { active, over } = event;
		if (over?.id === "deal-board") handleAdd(String(active.id));
	}

	const activeItem = activeId
		? (inventory.find((item) => item.id === String(activeId)) ?? null)
		: null;

	return (
		<div className="flex flex-col h-full gap-3">
			{resetBannerVisible && (
				<div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-200">
					<span>
						The deal was rejected — the board has been reset. Start over.
					</span>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 text-xs"
						onClick={onDismissResetBanner}
					>
						Dismiss
					</Button>
				</div>
			)}

			{frozen && (
				<div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
					<span>Final vote in progress — the board is frozen.</span>
					{onOpenVote && (
						<Button
							size="sm"
							className="h-6 text-xs"
							variant="outline"
							onClick={onOpenVote}
						>
							Open Final Vote
						</Button>
					)}
				</div>
			)}

			{otherTeamCalled && !frozen && (
				<div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40 px-3 py-2 text-xs text-indigo-800 dark:text-indigo-200">
					Team {opponentTeamCountry} has called for a final vote.
					{!myTeamCalled && " Call the vote to open ratification."}
				</div>
			)}

			<DndContext
				collisionDetection={closestCenter}
				onDragStart={(event: DragStartEvent) => setActiveId(event.active.id)}
				onDragEnd={handleDragEnd}
			>
				<div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_2fr] gap-3 flex-1 min-h-0">
					{/* Inventory rail */}
					<div className="space-y-2 min-h-0 flex flex-col">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Team {myTeamCountry} — concessions &amp; asks
						</div>
						<div className="rounded-lg border bg-background overflow-hidden flex-1">
							<ScrollArea className="h-full max-h-[320px]">
								<div className="grid grid-cols-1 gap-2 p-3">
									{inventory.length === 0 ? (
										<p className="text-xs text-muted-foreground italic p-2 text-center">
											All issues are on the board
										</p>
									) : (
										inventory.map((item) => (
											<InventoryCard
												key={item.id}
												item={item}
												givesCountry={
													item.role === "ask"
														? opponentTeamCountry
														: myTeamCountry
												}
												disabled={frozen || isPending}
												onAdd={() => handleAdd(item.id)}
												onView={() => setDetailItem(item)}
											/>
										))
									)}
								</div>
							</ScrollArea>
						</div>
					</div>

					{/* Shared board */}
					<div className="space-y-2 min-h-0 flex flex-col">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Shared Deal Board
						</div>
						<div
							ref={setBoardRef}
							className={[
								"flex-1 min-h-[200px] rounded-xl border-2 border-dashed p-3 transition-all",
								isOver && !frozen
									? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
									: "border-indigo-200 dark:border-indigo-800",
							].join(" ")}
						>
							{boardItems.length === 0 ? (
								<div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
									Drag items here or press add — both teams see this board live
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{boardItems.map((row) => {
										const value = valueForRow(row);
										const givesCountry =
											row.giving_team_id === myTeamId
												? myTeamCountry
												: opponentTeamCountry;
										return (
											<div
												key={row.id}
												className={[
													"flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium",
													countryTone(givesCountry),
												].join(" ")}
											>
												<span className="flex flex-1 min-w-0 flex-col text-left">
													<span className="line-clamp-2 leading-snug">
														{row.name}
													</span>
													<span className="text-[10px] text-muted-foreground/70">
														Added by {addedByLabel(row)}
													</span>
												</span>
												<span className="text-[10px] text-muted-foreground whitespace-nowrap">
													{givesCountry} gives
												</span>
												<span
													className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-background/50 ${valueTone(value)}`}
												>
													{formatValue(value)}
												</span>
												{!frozen && (
													<button
														type="button"
														disabled={isPending}
														onClick={() =>
															runAction(() => removeBoardItem(classId, row.id))
														}
														aria-label={`Remove ${row.name}`}
														className="w-5 h-5 rounded-full flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 text-xs transition-colors disabled:opacity-40"
													>
														✕
													</button>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>

				<DragOverlay>
					{activeItem ? (
						<div className="pointer-events-none">
							<InventoryCard
								item={activeItem}
								givesCountry={
									activeItem.role === "ask"
										? opponentTeamCountry
										: myTeamCountry
								}
								disabled
								onAdd={() => {}}
								onView={() => {}}
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{actionError && (
				<p className="text-xs text-destructive px-1">{actionError}</p>
			)}

			{/* Footer: score + ratification controls */}
			<div className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/30">
				<div className="flex flex-col text-left">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Your Net Score Impact
					</span>
					<span
						className={`text-2xl font-bold tabular-nums ${valueTone(netScore)}`}
					>
						{formatValue(netScore)}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{myTeamCalled && !frozen ? (
						<>
							<span className="text-xs text-muted-foreground">
								Waiting on Team {opponentTeamCountry}…
							</span>
							<Button
								type="button"
								variant="outline"
								disabled={isPending}
								onClick={() =>
									runAction(() => withdrawRatificationCall(classId))
								}
								className="h-9 text-xs"
							>
								Withdraw
							</Button>
						</>
					) : (
						<Button
							type="button"
							disabled={frozen || isPending || boardItems.length === 0}
							onClick={() => runAction(() => callForRatification(classId))}
							className="h-10 px-6 font-semibold shadow-sm bg-indigo-500 hover:bg-indigo-600 text-white"
						>
							Call for Final Vote
						</Button>
					)}
				</div>
			</div>

			{detailItem && (
				<TradeItemDetailModal
					item={detailItem}
					onClose={() => setDetailItem(null)}
				/>
			)}
		</div>
	);
}
