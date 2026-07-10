"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { TradeProposal } from "@/lib/types/domain";

type TradeConfirmationProps = {
	proposal: TradeProposal;
	onDismiss: () => void;
};

function ItemList({ items }: { items: { name: string }[] }) {
	if (items.length === 0) {
		return <p className="text-xs text-muted-foreground italic">Nothing</p>;
	}
	return (
		<ul className="space-y-1">
			{items.map((item) => (
				<li
					key={item.name}
					className="rounded-md border bg-muted/40 px-2 py-1 text-xs"
				>
					{item.name}
				</li>
			))}
		</ul>
	);
}

export function TradeConfirmation({
	proposal,
	onDismiss,
}: TradeConfirmationProps) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDismiss();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onDismiss]);

	if (proposal.status !== "executed") return null;

	const proposing = proposal.proposing_team?.country ?? "USA";
	const receiving = proposal.receiving_team?.country ?? "China";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 motion-reduce:animate-none">
			<button
				type="button"
				aria-label="Dismiss"
				onClick={onDismiss}
				className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Deal ratified"
				className="relative z-10 w-full max-w-md rounded-xl border bg-card text-left shadow-lg animate-in zoom-in-95 duration-150 motion-reduce:animate-none"
			>
				<div className="flex items-center gap-2 border-b px-5 py-3">
					<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
					<div>
						<h3 className="text-sm font-semibold">Deal ratified</h3>
						<p className="text-xs text-muted-foreground">
							Both teams approved the final deal.
						</p>
					</div>
				</div>

				<div className="px-5 py-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="mb-1.5 text-xs text-muted-foreground">
								{proposing} gives
							</p>
							<ItemList items={proposal.offered_items ?? []} />
						</div>
						<div>
							<p className="mb-1.5 text-xs text-muted-foreground">
								{receiving} gives
							</p>
							<ItemList items={proposal.requested_items ?? []} />
						</div>
					</div>
				</div>

				<div className="border-t px-5 py-3">
					<Button onClick={onDismiss} className="w-full">
						Done
					</Button>
				</div>
			</div>
		</div>
	);
}
