"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { TradeItem } from "@/lib/types/domain";

type TradeItemDetailModalProps = {
	item: TradeItem;
	onClose: () => void;
};

function formatValue(value: number) {
	return value > 0 ? `+${value}` : `${value}`;
}

function valueTone(value: number) {
	if (value > 0) return "text-emerald-600 dark:text-emerald-400";
	if (value < 0) return "text-red-600 dark:text-red-400";
	return "text-muted-foreground";
}

export function TradeItemDetailModal({
	item,
	onClose,
}: TradeItemDetailModalProps) {
	// Close on Escape.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	const value = Number(item.value) || 0;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150 motion-reduce:animate-none">
			{/* Backdrop as a sibling button so the panel doesn't nest inside an
			    interactive element; click or Enter/Space dismisses. */}
			<button
				type="button"
				aria-label="Close details"
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Issue details"
				className="relative z-10 w-full max-w-md rounded-xl border bg-card text-left shadow-lg animate-in zoom-in-95 duration-150 motion-reduce:animate-none"
			>
				<div className="flex items-center justify-between border-b px-5 py-3">
					<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Issue
					</span>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="px-5 py-4">
					<p className="text-sm leading-relaxed text-foreground">{item.name}</p>

					<dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4">
						<div>
							<dt className="text-xs text-muted-foreground">Your value</dt>
							<dd
								className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${valueTone(value)}`}
							>
								{formatValue(value)}
								<span className="ml-1 text-xs font-normal text-muted-foreground">
									pts
								</span>
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Role</dt>
							<dd className="mt-0.5 text-sm font-medium capitalize text-foreground">
								{item.role ?? "Item"}
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</div>
	);
}
