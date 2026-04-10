"use client";

import { useEffect, useState } from "react";
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
	const [showConfetti, setShowConfetti] = useState(false);

	useEffect(() => {
		// Trigger animation on mount
		const timer = setTimeout(() => setShowConfetti(true), 100);
		return () => clearTimeout(timer);
	}, []);

	if (proposal.status !== "executed") return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
			<div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
				{/* Success Banner */}
				<div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-center relative overflow-hidden">
					{showConfetti && (
						<div className="absolute inset-0 pointer-events-none">
							{Array.from({ length: 20 }).map((_, i) => (
								<div
									key={i}
									className="absolute w-2 h-2 rounded-full animate-bounce"
									style={{
										left: `${Math.random() * 100}%`,
										top: `${Math.random() * 100}%`,
										backgroundColor: [
											"#FFD700",
											"#FF6B6B",
											"#4ECDC4",
											"#45B7D1",
											"#96CEB4",
											"#FFEAA7",
										][i % 6],
										animationDelay: `${Math.random() * 2}s`,
										animationDuration: `${0.5 + Math.random() * 1.5}s`,
									}}
								/>
							))}
						</div>
					)}
					<div className="text-5xl mb-3">🎉</div>
					<h3 className="text-xl font-bold text-white">Trade Executed!</h3>
					<p className="text-sm text-white/80 mt-1">
						Both teams approved the deal
					</p>
				</div>

				{/* Trade Summary */}
				<div className="p-5 space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">
								{proposal.proposing_team?.country} gave:
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
								{proposal.receiving_team?.country} gave:
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
						<div className="w-16 h-px bg-slate-200 dark:bg-slate-700" />
						<span className="text-xs text-muted-foreground">⇄</span>
						<div className="w-16 h-px bg-slate-200 dark:bg-slate-700" />
					</div>

					<Button
						onClick={onDismiss}
						className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
					>
						Continue Negotiating
					</Button>
				</div>
			</div>
		</div>
	);
}
