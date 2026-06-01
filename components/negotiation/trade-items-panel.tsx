"use client";

import { useEffect, useState, useTransition } from "react";
import { updateTradeItemValue } from "@/app/actions/trade-controller";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeItem } from "@/lib/types/domain";

export function TradeItemsPanel({
	classId,
	initialItems,
	isLocked,
}: {
	classId: string;
	initialItems: TradeItem[];
	isLocked: boolean;
}) {
	const [items, setItems] = useState<TradeItem[]>(initialItems);
	const [isPending, startTransition] = useTransition();

	const asks = items.filter((i) => i.role === "ask");
	const concessions = items.filter((i) => i.role === "concession");

	const asksTotal = asks.reduce(
		(sum, item) => sum + (Number(item.value) || 0),
		0,
	);
	const concessionsTotal = concessions.reduce(
		(sum, item) => sum + (Number(item.value) || 0),
		0,
	);

	const asksValid = asksTotal === 100;
	const concessionsValid = concessionsTotal === -100;

	// Sync state when new props arrive (realtime trigger)
	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	const handleValueChange = (itemId: string, newStrValue: string) => {
		// Optimistic update locally
		setItems((prev) =>
			prev.map((item) =>
				item.id === itemId ? { ...item, value: Number(newStrValue) } : item,
			),
		);
	};

	const handleBlurOrSubmit = (itemId: string, newValue: number) => {
		if (isLocked) return;

		let validValue = newValue;
		const item = items.find((i) => i.id === itemId);
		if (item) {
			if (item.role === "ask" && validValue < 0)
				validValue = Math.abs(validValue);
			else if (item.role === "concession" && validValue > 0)
				validValue = -Math.abs(validValue);

			if (validValue !== newValue) {
				setItems((prev) =>
					prev.map((i) => (i.id === itemId ? { ...i, value: validValue } : i)),
				);
			}
		}

		startTransition(async () => {
			await updateTradeItemValue(itemId, classId, validValue);
		});
	};

	if (items.length === 0) {
		return (
			<div className="p-6 text-center text-muted-foreground border rounded-md border-dashed">
				<p className="mb-2">No target values available yet.</p>
				<p className="text-sm">Issues are being seeded for your class.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col bg-muted rounded-md border">
			<div className="p-4 border-b bg-card rounded-t-md">
				<h3 className="font-semibold text-sm">Target Issue Values</h3>
				<p className="text-xs text-muted-foreground mt-1 mb-4">
					{isLocked
						? "Values can only be edited during the Domestic Negotiation phase."
						: "Internal point system for your team. Asks yield positive points, Concessions cost negative points."}
				</p>

				<details className="group mb-4 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-100 text-sm text-foreground">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
						<div className="flex items-center gap-3">
							{/* <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
								Top Secret
							</span> */}
							<span className="text-sm font-medium">
								Classified cost estimate and scoring instructions
							</span>
						</div>
						<span className="grid h-7 w-7 place-items-center rounded border border-amber-500 bg-background/60 text-base font-medium leading-none text-amber-900 transition-transform group-open:rotate-180 dark:text-amber-200">
							<span className="group-open:hidden">+</span>
							<span className="hidden group-open:inline">-</span>
						</span>
					</summary>
					<div className="border-t border-amber-700 px-4 pb-4 pt-3">
						<p className="leading-6">
							Analysts have privately estimated that the economic cost of a
							trade war will be <strong>-10</strong> for your country if no deal
							is reached. This intelligence is classified and should not be
							shared outside your delegation. The other team does not know
							whether your cost estimate is higher or lower than theirs. Their
							costs could range from <strong>-5</strong> to <strong>-20</strong>
							.
						</p>
						<p className="mt-3 leading-6">
							While keeping in mind the specific interests outlined in your
							individual briefings, work with your team to make a list of asks
							that would best serve your national interest.
						</p>
						<p className="mt-3 leading-6">
							Assign points to each item on the list based on relative
							importance. Concessions should add up to <strong>-100</strong>{" "}
							points, and the costlier an issue is for your country to give up,
							the lower its assigned negative value should be. Your team does
							not have to address every issue listed here. If an issue should
							not be raised in negotiations at all, treat it as N/A.
						</p>
					</div>
				</details>

				<div className="grid grid-cols-2 gap-4">
					<div
						className={`p-2 rounded border text-xs flex flex-col gap-1 ${asksValid ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"}`}
					>
						<span className="font-semibold uppercase tracking-wider">Asks</span>
						<span className="font-mono text-sm">{asksTotal} / 100</span>
						{!asksValid && (
							<span className="text-[10px] opacity-80">Must sum to 100</span>
						)}
					</div>
					<div
						className={`p-2 rounded border text-xs flex flex-col gap-1 ${concessionsValid ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"}`}
					>
						<span className="font-semibold uppercase tracking-wider">
							Concessions
						</span>
						<span className="font-mono text-sm">{concessionsTotal} / -100</span>
						{!concessionsValid && (
							<span className="text-[10px] opacity-80">Must sum to -100</span>
						)}
					</div>
				</div>
			</div>
			<ScrollArea className="h-[420px]">
				<div className="p-4">
					<div className="space-y-4">
						{items.map((item) => (
							<div
								key={item.id}
								className={`flex flex-col gap-2 bg-card p-3 rounded-lg border shadow-sm ${item.is_resolved ? "opacity-60 grayscale" : ""}`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<Label
											htmlFor={`item-${item.id}`}
											className="font-medium flex items-center gap-2"
										>
											{item.name}
										</Label>
										<div className="flex items-center gap-2 mt-2">
											<Badge
												variant={item.role === "ask" ? "default" : "secondary"}
												className="text-[10px] uppercase"
											>
												{item.role || "Item"}
											</Badge>
											{item.is_resolved && (
												<Badge
													variant="outline"
													className="text-[10px] text-green-600 border-green-600"
												>
													RESOLVED
												</Badge>
											)}
										</div>
									</div>
									<div className="w-24 relative shrink-0">
										<Input
											id={`item-${item.id}`}
											type="number"
											value={item.value}
											max={item.role === "ask" ? undefined : 0}
											min={item.role === "ask" ? 0 : undefined}
											onChange={(e) =>
												handleValueChange(item.id, e.target.value)
											}
											// Submit to server on blur or Enter key
											onBlur={() => handleBlurOrSubmit(item.id, item.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													handleBlurOrSubmit(item.id, item.value);
													(e.target as HTMLInputElement).blur();
												}
											}}
											disabled={isLocked || isPending || item.is_resolved}
											className={`text-right ${isLocked || item.is_resolved ? "bg-muted cursor-not-allowed" : ""}`}
										/>
										{isPending && (
											<div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin opacity-50" />
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
