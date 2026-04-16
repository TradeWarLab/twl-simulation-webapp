"use client";

import { useEffect, useState, useTransition } from "react";
import { type TradeItem, updateTradeItemValue } from "@/app/actions/trade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
	
	const asksTotal = asks.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
	const concessionsTotal = concessions.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

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
		const item = items.find(i => i.id === itemId);
		if (item) {
			if (item.role === "ask" && validValue < 0) validValue = Math.abs(validValue);
			else if (item.role === "concession" && validValue > 0) validValue = -Math.abs(validValue);

			if (validValue !== newValue) {
				setItems((prev) =>
					prev.map((i) =>
						i.id === itemId ? { ...i, value: validValue } : i,
					),
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
						? "Values are locked during the Negotiation phase."
						: "Internal point system for your team. Asks yield positive points, Concessions cost negative points."}
				</p>

				<div className="grid grid-cols-2 gap-4">
					<div className={`p-2 rounded border text-xs flex flex-col gap-1 ${asksValid ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}>
						<span className="font-semibold uppercase tracking-wider">Asks</span>
						<span className="font-mono text-sm">{asksTotal} / 100</span>
						{!asksValid && <span className="text-[10px] opacity-80">Must sum to 100</span>}
					</div>
					<div className={`p-2 rounded border text-xs flex flex-col gap-1 ${concessionsValid ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}>
						<span className="font-semibold uppercase tracking-wider">Concessions</span>
						<span className="font-mono text-sm">{concessionsTotal} / -100</span>
						{!concessionsValid && <span className="text-[10px] opacity-80">Must sum to -100</span>}
					</div>
				</div>
			</div>
			<div className="p-4">
				<div className="space-y-4">
					{items.map((item) => (
						<div
							key={item.id}
							className={`flex flex-col gap-2 bg-card p-3 rounded-lg border shadow-sm ${item.is_resolved ? 'opacity-60 grayscale' : ''}`}
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1">
									<Label htmlFor={`item-${item.id}`} className="font-medium flex items-center gap-2">
										{item.name}
									</Label>
									<div className="flex items-center gap-2 mt-2">
										<Badge variant={item.role === 'ask' ? 'default' : 'secondary'} className="text-[10px] uppercase">
											{item.role || 'Item'}
										</Badge>
										{item.is_resolved && (
											<Badge variant="outline" className="text-[10px] text-green-600 border-green-600">
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
										max={item.role === 'ask' ? undefined : 0}
										min={item.role === 'ask' ? 0 : undefined}
										onChange={(e) => handleValueChange(item.id, e.target.value)}
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
		</div>
	);
}
