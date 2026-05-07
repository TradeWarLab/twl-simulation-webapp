"use client";

import { useTransition } from "react";
import {
	createTradeItem,
	deleteTradeItem,
} from "@/app/actions/trade-controller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeItem } from "@/lib/types/domain";

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
		const teamAccent = isUsa ? "#378ADD" : "#D85A30";
		const panelBorder = isUsa ? "border-blue-200/80" : "border-orange-200/90";
		const panelHeader = isUsa ? "bg-blue-50/60" : "bg-orange-50/70";
		const panelTitle = isUsa ? "text-blue-950" : "text-orange-950";
		const stripSurface = isUsa
			? "bg-blue-50/80 border-blue-100"
			: "bg-orange-50/80 border-orange-100";
		const actionButton = isUsa
			? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
			: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100";

		return (
			<Card
				className={`overflow-hidden border ${panelBorder}`}
				style={{ borderTopWidth: "3px", borderTopColor: teamAccent }}
			>
				<CardHeader className={`${panelHeader} border-b pb-4`}>
					<CardTitle className={`text-xl ${panelTitle}`}>{title}</CardTitle>
				</CardHeader>
				<CardContent className="pt-6">
					{!teamId ? (
						<div className="text-sm text-muted-foreground p-4 text-center">
							Team has not been created yet. Assign a student to this team
							first.
						</div>
					) : (
						<div className="space-y-6">
							{!readOnly && (
								<form
									onSubmit={(e) => handleCreate(e, teamId)}
									className={`flex items-end gap-2 rounded-lg border px-3 py-3 ${stripSurface}`}
								>
									<div className="flex-1 space-y-1">
										<label className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
											Item Name
										</label>
										<Input
											name="name"
											required
											placeholder="e.g. End subsidies"
											disabled={isPending}
										/>
									</div>
									<div className="w-24 space-y-1">
										<label className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
											Value
										</label>
										<Input
											name="value"
											type="number"
											required
											placeholder="10"
											disabled={isPending}
										/>
									</div>
									<Button
										type="submit"
										disabled={isPending}
										variant="outline"
										className={actionButton}
									>
										Add
									</Button>
								</form>
							)}

							<div className="rounded-md border divide-y overflow-hidden">
								<div className="flex bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
									<span className="flex-1">Name</span>
									<span className="w-16 text-right">Value</span>
									{!readOnly && <span className="w-10"></span>}
								</div>
								{items.length === 0 ? (
									<div className="p-4 text-center text-sm text-slate-500">
										No items added yet.
									</div>
								) : (
									<ScrollArea className="h-[400px] w-full">
										<div className="divide-y">
											{items.map((item) => (
												<div
													key={item.id}
													className="flex items-center p-2 text-sm text-foreground bg-card hover:bg-muted transition-colors"
												>
													<span className="flex-1 font-medium flex items-center gap-2">
														{item.name}
														{readOnly && (
															<Badge
																variant={
																	item.is_resolved ? "default" : "secondary"
																}
																className="text-[10px] uppercase h-5"
															>
																{item.is_resolved ? "Resolved" : "Open"}
															</Badge>
														)}
													</span>
													<span
														className={`w-16 text-right font-bold ${
															item.value > 0
																? "text-green-600"
																: item.value < 0
																	? "text-red-600"
																	: "text-muted-foreground"
														}`}
													>
														{item.value > 0
															? `+${item.value}`
															: item.value < 0
																? item.value
																: "—"}
													</span>
													{!readOnly && (
														<div className="w-10 text-right">
															<button
																onClick={() => handleDelete(item.id)}
																disabled={isPending}
																className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
																title="Delete item"
															>
																✕
															</button>
														</div>
													)}
												</div>
											))}
										</div>
									</ScrollArea>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		);
	};

	return (
		<div className="grid md:grid-cols-2 gap-8">
			<TeamPanel
				title="Team USA Trade Items (Asks/Concessions)"
				teamId={usaTeamId}
				items={usaItems}
				isUsa={true}
			/>
			<TeamPanel
				title="Team PRC Trade Items (Asks/Concessions)"
				teamId={chinaTeamId}
				items={chinaItems}
				isUsa={false}
			/>
		</div>
	);
}
