"use client";

import { Button } from "@/components/ui/button";
import type { TradeProposal } from "@/lib/types/domain";

type TradeConfirmationProps = {
	proposal: TradeProposal;
	onDismiss: () => void;
};

export function TradeConfirmation({
	proposal,
	onDismiss,
}: TradeConfirmationProps) {
	if (proposal.status !== "executed") return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-300">
			<div className="bg-card rounded-2xl shadow-2xl border max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
				{/* Success Banner */}
				<div className="bg-emerald-500 p-6 text-center relative overflow-hidden">
					<h3 className="text-xl font-bold text-white">Resolution Reached!</h3>
					<p className="text-sm text-white/80 mt-1">
						Both teams agreed to the terms
					</p>
				</div>

				{/* Trade Summary */}
				<div className="p-5 space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">
								{proposal.proposing_team?.country} Concessions:
							</p>
							{(proposal.offered_items ?? []).map((item, i) => (
								<div
									key={i}
									className="text-xs px-2 py-1 mb-1 rounded bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
								>
									{item.name}
								</div>
							))}
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">
								{proposal.receiving_team?.country} Concessions:
							</p>
							{(proposal.requested_items ?? []).map((item, i) => (
								<div
									key={i}
									className="text-xs px-2 py-1 mb-1 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
								>
									{item.name}
								</div>
							))}
						</div>
					</div>

					<div className="flex items-center justify-center gap-3 py-2">
						<div className="w-16 h-px bg-border" />
						<span className="text-xs text-muted-foreground">⇄</span>
						<div className="w-16 h-px bg-border" />
					</div>

					<Button
						onClick={onDismiss}
						className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
					>
						Continue Negotiating
					</Button>
				</div>
			</div>
		</div>
	);
}
