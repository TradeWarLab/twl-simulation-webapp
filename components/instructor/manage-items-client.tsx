"use client";

import { useTransition } from "react";
import {
	createTradeItem,
	deleteTradeItem,
	type TradeItem,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManageItemsClient({
	classId,
	usaTeamId,
	chinaTeamId,
	usaItems,
	chinaItems,
}: {
	classId: string;
	usaTeamId: string | null;
	chinaTeamId: string | null;
	usaItems: TradeItem[];
	chinaItems: TradeItem[];
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

		if (!name || isNaN(value)) return;

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
	}) => (
		<Card className={`${isUsa ? "border-blue-200" : "border-red-200"}`}>
			<CardHeader
				className={`${isUsa ? "bg-blue-50/50" : "bg-red-50/50"} pb-4`}
			>
				<CardTitle
					className={`text-xl ${isUsa ? "text-blue-800" : "text-red-800"}`}
				>
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				{!teamId ? (
					<div className="text-sm text-muted-foreground p-4 text-center">
						Team has not been created yet. Assign a student to this team first.
					</div>
				) : (
					<div className="space-y-6">
						<form
							onSubmit={(e) => handleCreate(e, teamId)}
							className="flex gap-2 items-end"
						>
							<div className="flex-1 space-y-1">
								<label className="text-xs font-medium text-slate-500">
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
								<label className="text-xs font-medium text-slate-500">
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
								variant={isUsa ? "outline" : "default"}
								className={
									isUsa
										? "border-blue-300 text-blue-700 hover:bg-blue-50"
										: "bg-red-600 hover:bg-red-700"
								}
							>
								Add
							</Button>
						</form>

						<div className="rounded-md border divide-y overflow-hidden">
							<div className="flex bg-slate-50 p-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
								<span className="flex-1">Name</span>
								<span className="w-16 text-right">Value</span>
								<span className="w-10"></span>
							</div>
							{items.length === 0 ? (
								<div className="p-4 text-center text-sm text-slate-500">
									No items added yet.
								</div>
							) : (
								items.map((item) => (
									<div
										key={item.id}
										className="flex items-center p-2 text-sm bg-white hover:bg-slate-50 transition-colors"
									>
										<span className="flex-1 font-medium">{item.name}</span>
										<span
											className={`w-16 text-right font-bold ${item.value > 0 ? "text-green-600" : "text-red-600"}`}
										>
											{item.value > 0 ? `+${item.value}` : item.value}
										</span>
										<div className="w-10 text-right">
											<button
												onClick={() => handleDelete(item.id)}
												disabled={isPending}
												className="text-slate-400 hover:text-red-500 p-1 rounded-md"
												title="Delete item"
											>
												✕
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);

	return (
		<div className="grid md:grid-cols-2 gap-8">
			<TeamPanel
				title="🇺🇸 Team USA Trade Items (Asks/Receives)"
				teamId={usaTeamId}
				items={usaItems}
				isUsa={true}
			/>
			<TeamPanel
				title="🇨🇳 Team PRC Trade Items (Asks/Receives)"
				teamId={chinaTeamId}
				items={chinaItems}
				isUsa={false}
			/>
		</div>
	);
}
