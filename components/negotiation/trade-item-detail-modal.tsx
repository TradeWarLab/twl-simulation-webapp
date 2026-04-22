"use client";

import { Button } from "@/components/ui/button";
import type { TradeItem } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { X, Info } from "lucide-react";

type TradeItemDetailModalProps = {
	item: TradeItem;
	onClose: () => void;
};

export function TradeItemDetailModal({
	item,
	onClose,
}: TradeItemDetailModalProps) {
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
			<div className="bg-card rounded-2xl shadow-2xl border max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="bg-indigo-500 p-6 flex justify-between items-start">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-white/20 rounded-lg">
								<Info className="w-5 h-5 text-white" />
							</div>
							<h3 className="text-xl font-bold text-white leading-tight">
								Issue Detail
							</h3>
						</div>
						<p className="text-sm text-white/80">
							Comprehensive overview of this negotiation item
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
						aria-label="Close"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Name Section */}
					<div className="space-y-2">
						<label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
							Full Issue Description
						</label>
						<div className="text-lg font-semibold leading-relaxed text-foreground bg-muted/30 p-4 rounded-xl border border-border/50">
							{item.name}
						</div>
					</div>

					{/* Meta Grid */}
					<div className="grid grid-cols-2 gap-4">
						<div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-1">
							<label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
								Current Value
							</label>
							<div className="flex items-center gap-2">
								<span
									className={`text-2xl font-bold font-mono tabular-nums ${
										(item.value || 0) > 0
											? "text-emerald-600"
											: (item.value || 0) < 0
												? "text-red-600"
												: "text-muted-foreground"
									}`}
								>
									{item.value && item.value > 0
										? `+${item.value}`
										: item.value || 0}
								</span>
								<span className="text-xs text-muted-foreground font-medium">
									points
								</span>
							</div>
						</div>
						<div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-1">
							<label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
								Role Type
							</label>
							<div>
								<Badge
									variant={item.role === "ask" ? "default" : "secondary"}
									className="uppercase px-3 py-0.5 text-[10px] ring-2 ring-background shadow-sm"
								>
									{item.role || "Item"}
								</Badge>
							</div>
						</div>
					</div>

					<Button
						onClick={onClose}
						className="w-full bg-indigo-500 hover:bg-indigo-600 text-white h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/20"
					>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
