"use client";

import { defaultPreset, Feedback } from "@dnd-kit/dom";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { GripVertical, Info, Plus } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
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

// Disable dnd-kit's drop animation. By default a dropped card animates back to
// its inventory slot before the optimistic board row replaces it, which reads
// as a failed drop. The optimistic `pendingAdds` state does the visual move, so
// the returning animation is pure noise — swap the Feedback plugin in the
// default preset for one that skips it.
const dndPlugins = defaultPreset.plugins.map((plugin) =>
	plugin === Feedback ? Feedback.configure({ dropAnimation: null }) : plugin,
);

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

type CardProps = {
	item: TradeItem;
	givesCountry: string;
	disabled: boolean;
	onAdd: () => void;
	onView: () => void;
};

function InventoryCard({
	item,
	givesCountry,
	disabled,
	onAdd,
	onView,
}: CardProps) {
	const { ref, handleRef, isDragSource } = useDraggable({
		id: item.id,
		disabled,
	});
	const roleTone = countryTone(givesCountry);

	return (
		<div
			ref={ref}
			className={[
				"flex items-center gap-2 rounded-xl border pl-1 pr-2 py-2 text-xs font-medium w-full",
				"select-none transition-shadow bg-background",
				roleTone,
				isDragSource ? "shadow-lg" : "hover:shadow-md",
			].join(" ")}
		>
			<div
				ref={handleRef}
				className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing rounded-lg py-1 px-1 touch-none"
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

// One row on the shared board. Used for both confirmed rows and optimistic
// "pending" rows; the caller supplies the subtitle (attribution vs. "Adding…")
// and, for confirmed rows, an `onRemove` handler.
function BoardCard({
	name,
	givesCountry,
	value,
	subtitle,
	pending = false,
	onRemove,
	removeDisabled = false,
}: {
	name: string;
	givesCountry: string;
	value: number;
	subtitle: ReactNode;
	pending?: boolean;
	onRemove?: () => void;
	removeDisabled?: boolean;
}) {
	return (
		<div
			className={[
				"flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium",
				pending ? "opacity-70" : "",
				countryTone(givesCountry),
			].join(" ")}
		>
			<span className="flex flex-1 min-w-0 flex-col text-left">
				<span className="line-clamp-2 leading-snug">{name}</span>
				{subtitle}
			</span>
			<span className="text-[10px] text-muted-foreground whitespace-nowrap">
				{givesCountry} gives
			</span>
			<span
				className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-background/50 ${valueTone(value)}`}
			>
				{formatValue(value)}
			</span>
			{onRemove && (
				<button
					type="button"
					disabled={removeDisabled}
					onClick={onRemove}
					aria-label={`Remove ${name}`}
					className="w-5 h-5 rounded-full flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 text-xs transition-colors disabled:opacity-40"
				>
					✕
				</button>
			)}
		</div>
	);
}

// Must render INSIDE the DragDropProvider: dnd hooks read their manager from
// context above the call site, so calling useDroppable in SharedDealBoard
// itself (where the provider is a JSX child, not an ancestor) registers the
// zone on the global default manager and drops silently never match.
function BoardDropZone({
	frozen,
	children,
}: {
	frozen: boolean;
	children: ReactNode;
}) {
	const { ref, isDropTarget } = useDroppable({ id: "deal-board" });
	return (
		<div
			ref={ref}
			className={[
				"flex-1 min-h-[160px] rounded-xl border-2 border-dashed transition-all overflow-hidden",
				isDropTarget && !frozen
					? "border-primary bg-primary/10"
					: "border-border",
			].join(" ")}
		>
			{children}
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
	const [detailItem, setDetailItem] = useState<TradeItem | null>(null);
	// Items added locally but not yet confirmed by the realtime board — shown
	// on the board immediately so a drop never appears to "snap back".
	const [pendingAdds, setPendingAdds] = useState<TradeItem[]>([]);

	// Resolve display names for board-row adders that arrived without a join.
	useEffect(() => {
		for (const row of boardItems) {
			if (!userNames.has(row.added_by)) {
				void resolveUserName(row.added_by);
			}
		}
	}, [boardItems, userNames, resolveUserName]);

	// Reconcile: once the realtime board contains a pending item, drop the
	// local copy so the confirmed row (with adder attribution) takes over.
	useEffect(() => {
		setPendingAdds((prev) => {
			const next = prev.filter(
				(item) =>
					!boardItems.some(
						(row) =>
							row.item_id === item.id ||
							(item.issue_id !== null && row.issue_id === item.issue_id) ||
							row.name === item.name,
					),
			);
			return next.length === prev.length ? prev : next;
		});
	}, [boardItems]);

	const viewerValueMap = useMemo(
		() => buildViewerValueMap(teamItems),
		[teamItems],
	);

	const valueForRow = useCallback(
		(row: DealBoardItem) =>
			(row.issue_id ? viewerValueMap.get(row.issue_id) : undefined) ??
			viewerValueMap.get(row.name) ??
			0,
		[viewerValueMap],
	);

	const addedByLabel = (row: DealBoardItem) =>
		userNames.get(row.added_by) ??
		(row.added_by_team_id === myTeamId
			? `Team ${myTeamCountry}`
			: `Team ${opponentTeamCountry}`);

	// The viewer's inventory: unresolved mirror rows whose issue isn't on the
	// board (confirmed or optimistically pending).
	const inventory = useMemo(() => {
		const onBoard = new Set(
			boardItems.flatMap((row) =>
				row.issue_id ? [row.issue_id, row.name] : [row.name],
			),
		);
		for (const item of pendingAdds) {
			if (item.issue_id) onBoard.add(item.issue_id);
			onBoard.add(item.name);
		}
		return teamItems.filter(
			(item) =>
				!item.is_resolved &&
				!(item.issue_id && onBoard.has(item.issue_id)) &&
				!onBoard.has(item.name),
		);
	}, [teamItems, boardItems, pendingAdds]);

	const netScore = useMemo(
		() =>
			boardItems.reduce((sum, row) => sum + valueForRow(row), 0) +
			pendingAdds.reduce((sum, item) => sum + item.value, 0),
		[boardItems, valueForRow, pendingAdds],
	);

	const myTeamCalled = ratificationCalls.some(
		(call) => call.team_id === myTeamId,
	);
	const otherTeamCalled = ratificationCalls.some(
		(call) => call.team_id !== myTeamId,
	);

	// The board is read-only for adds/drags once the package vote is open
	// (frozen) OR once my team has locked in its call for a vote — you must
	// withdraw before editing the deal again.
	const inputsLocked = frozen || myTeamCalled;

	const runAction = (action: () => Promise<{ error?: string } | undefined>) => {
		setActionError(null);
		startTransition(async () => {
			const result = await action();
			if (result?.error) setActionError(result.error);
		});
	};

	const handleAdd = (itemId: string) => {
		const item = teamItems.find((candidate) => candidate.id === itemId);
		if (!item) return;
		setActionError(null);
		setPendingAdds((prev) =>
			prev.some((pending) => pending.id === itemId) ? prev : [...prev, item],
		);
		startTransition(async () => {
			const result = await addBoardItem(classId, itemId);
			if (result?.error) {
				// Roll the optimistic row back to the inventory.
				setPendingAdds((prev) =>
					prev.filter((pending) => pending.id !== itemId),
				);
				setActionError(result.error);
			}
		});
	};

	const boardEmpty = boardItems.length === 0 && pendingAdds.length === 0;

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
				<div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
					Team {opponentTeamCountry} has called for a final vote.
					{!myTeamCalled && " Call the vote to open ratification."}
				</div>
			)}

			<DragDropProvider
				plugins={dndPlugins}
				onDragEnd={(event) => {
					if (event.canceled || inputsLocked) return;
					const { source, target } = event.operation;
					if (source && target?.id === "deal-board") {
						// dnd-kit runs onDragEnd inside its own startTransition, which
						// would demote the optimistic setPendingAdds to a non-urgent
						// update React coalesces away before it ever paints (so the drop
						// looks like it did nothing). Deferring to a microtask escapes
						// that transition scope and keeps the optimistic add urgent.
						const id = String(source.id);
						queueMicrotask(() => handleAdd(id));
					}
				}}
			>
				<div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_2fr] gap-3 flex-1 min-h-0">
					{/* Inventory rail */}
					<div className="space-y-2 min-h-0 flex flex-col min-w-0">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Team {myTeamCountry} — concessions &amp; asks
						</div>
						<div className="rounded-lg border bg-background overflow-hidden flex-1 min-h-0">
							<ScrollArea className="h-full">
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
												disabled={inputsLocked || isPending}
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
					<div className="space-y-2 min-h-0 flex flex-col min-w-0">
						<div className="text-xs font-medium text-muted-foreground px-1">
							Shared Deal Board
						</div>
						<BoardDropZone frozen={frozen}>
							{boardEmpty ? (
								<div className="flex items-center justify-center h-full p-3 text-xs text-muted-foreground italic text-center">
									Drag items here or press add — both teams see this board live
								</div>
							) : (
								<ScrollArea className="h-full">
									<div className="flex flex-col gap-2 p-3">
										{boardItems.map((row) => {
											const givesCountry =
												row.giving_team_id === myTeamId
													? myTeamCountry
													: opponentTeamCountry;
											return (
												<BoardCard
													key={row.id}
													name={row.name}
													givesCountry={givesCountry}
													value={valueForRow(row)}
													subtitle={
														<span className="text-[10px] text-muted-foreground/70">
															Added by {addedByLabel(row)}
														</span>
													}
													onRemove={
														frozen
															? undefined
															: () =>
																	runAction(() =>
																		removeBoardItem(classId, row.id),
																	)
													}
													removeDisabled={isPending}
												/>
											);
										})}
										{pendingAdds.map((item) => {
											const givesCountry =
												item.role === "ask"
													? opponentTeamCountry
													: myTeamCountry;
											return (
												<BoardCard
													key={`pending-${item.id}`}
													name={item.name}
													givesCountry={givesCountry}
													value={item.value}
													pending
													subtitle={
														<span className="text-[10px] text-muted-foreground/70 animate-pulse">
															Adding…
														</span>
													}
												/>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</BoardDropZone>
					</div>
				</div>
			</DragDropProvider>

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
							className="h-10 px-6 font-semibold shadow-sm"
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
