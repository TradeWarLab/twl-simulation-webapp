import type { TradeItem } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

// Same targets as the student panel (trade-items-panel.tsx).
const ASKS_TARGET = 100;
const CONCESSIONS_TARGET = -100;

function sumRole(items: Pick<TradeItem, "role" | "value">[], role: string) {
	return items
		.filter((item) => item.role === role)
		.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
}

function TotalLine({
	label,
	total,
	target,
}: {
	label: string;
	total: number;
	target: number;
}) {
	const done = total === target;
	const over = Math.abs(total) > Math.abs(target);
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span
				className={cn(
					"font-mono tabular-nums",
					done && "text-emerald-700 dark:text-emerald-300",
					over && "text-red-700 dark:text-red-300",
				)}
			>
				{total} / {target}
			</span>
		</div>
	);
}

/** Shows how near a team's asks and concessions are to their targets. */
export function TeamValueTotals({
	items,
}: {
	items: Pick<TradeItem, "role" | "value">[];
}) {
	return (
		<div className="space-y-1 rounded-lg border bg-muted/20 px-3 py-2">
			<TotalLine
				label="Asks"
				total={sumRole(items, "ask")}
				target={ASKS_TARGET}
			/>
			<TotalLine
				label="Concessions"
				total={sumRole(items, "concession")}
				target={CONCESSIONS_TARGET}
			/>
		</div>
	);
}
