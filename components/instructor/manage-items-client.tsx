"use client";

import { useTransition } from "react";
import {
	createTradeItem,
	deleteTradeItem,
} from "@/app/actions/trade-controller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeItem } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function valueTone(value: number) {
	if (value > 0) return "text-emerald-600 dark:text-emerald-400";
	if (value < 0) return "text-red-600 dark:text-red-400";
	return "text-muted-foreground";
}

function formatValue(value: number) {
	if (value > 0) return `+${value}`;
	if (value < 0) return `${value}`;
	return "—";
}

export function ManageItemsClient({
	classId,
	usaTeamId,
	chinaTeamId,
	usaItems,
	chinaItems,
	readOnly,
}: {
	classId: string;
	usaTeamId: string | null;
	chinaTeamId: string | null;
	usaItems: TradeItem[];
	chinaItems: TradeItem[];
	readOnly?: boolean;
}) {
	const [isPending, startTransition] = useTransition();

	const handleCreate = (
		e: React.FormEvent<HTMLFormElement>,
		teamId: string,
	) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const value = parseInt(formData.get("value") as string, 10);

		if (!name || Number.isNaN(value)) return;

		startTransition(async () => {
			await createTradeItem(classId, teamId, name, value);
		});

		e.currentTarget.reset();
	};

	const handleDelete = (itemId: string) => {
		startTransition(async () => {
			await deleteTradeItem(classId, itemId);
		});
	};

	const TeamPanel = ({
		title,
		teamId,
		items,
		isUsa,
	}: {
		title: string;
		teamId: string | null;
		items: TradeItem[];
		isUsa: boolean;
	}) => {
		const accent = isUsa
			? "border-blue-500/20 bg-blue-500/[0.03]"
			: "border-red-500/20 bg-red-500/[0.03]";
		const titleColor = isUsa
			? "text-blue-950 dark:text-blue-400"
			: "text-red-950 dark:text-red-400";

		return (
			<Card className={cn("overflow-hidden", accent)}>
				<CardHeader className="border-b px-4 py-3">
					<CardTitle className={cn("text-base font-semibold", titleColor)}>
						{title}
					</CardTitle>
				</CardHeader>

				{!teamId ? (
					<div className="p-4 text-center text-sm text-muted-foreground">
						Team not created yet — assign a student to this team first.
					</div>
				) : (
					<>
						{!readOnly && (
							<form
								onSubmit={(e) => handleCreate(e, teamId)}
								className="flex items-end gap-2 border-b bg-muted/30 px-4 py-3"
							>
								<div className="flex-1 space-y-1">
									<label
										htmlFor={`${teamId}-name`}
										className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
									>
										Item name
									</label>
									<Input
										id={`${teamId}-name`}
										name="name"
										required
										placeholder="e.g. End subsidies"
										disabled={isPending}
									/>
								</div>
								<div className="w-24 space-y-1">
									<label
										htmlFor={`${teamId}-value`}
										className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
									>
										Value
									</label>
									<Input
										id={`${teamId}-value`}
										name="value"
										type="number"
										required
										placeholder="10"
										disabled={isPending}
									/>
								</div>
								<Button type="submit" disabled={isPending} variant="outline">
									Add
								</Button>
							</form>
						)}

						{/* Column header — widths match the rows so everything aligns. */}
						<div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							<span className="flex-1">Item</span>
							{readOnly && <span className="w-20 shrink-0">Status</span>}
							<span className="w-14 shrink-0 text-right">Value</span>
							{!readOnly && <span className="w-8 shrink-0" />}
						</div>

						{items.length === 0 ? (
							<div className="p-4 text-center text-sm text-muted-foreground">
								No items yet.
							</div>
						) : (
							<ScrollArea className="h-[400px]">
								<div className="divide-y">
									{items.map((item) => (
										<div
											key={item.id}
											className="flex items-start gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
										>
											<span className="min-w-0 flex-1 leading-snug">
												{item.name}
											</span>
											{readOnly && (
												<span className="w-20 shrink-0">
													<Badge
														variant={item.is_resolved ? "default" : "secondary"}
														className="h-5 text-[10px] font-normal"
													>
														{item.is_resolved ? "Resolved" : "Open"}
													</Badge>
												</span>
											)}
											<span
												className={cn(
													"w-14 shrink-0 text-right font-mono tabular-nums",
													valueTone(item.value),
												)}
											>
												{formatValue(item.value)}
											</span>
											{!readOnly && (
												<span className="w-8 shrink-0 text-right">
													<button
														type="button"
														onClick={() => handleDelete(item.id)}
														disabled={isPending}
														className="inline-flex h-5 w-5 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
														title="Delete item"
													>
														✕
													</button>
												</span>
											)}
										</div>
									))}
								</div>
							</ScrollArea>
						)}
					</>
				)}
			</Card>
		);
	};

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<TeamPanel
				title="Team USA Trade Items"
				teamId={usaTeamId}
				items={usaItems}
				isUsa={true}
			/>
			<TeamPanel
				title="Team PRC Trade Items"
				teamId={chinaTeamId}
				items={chinaItems}
				isUsa={false}
			/>
		</div>
	);
}
