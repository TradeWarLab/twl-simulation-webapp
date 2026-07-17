"use client";

import {
	Eye,
	FileText,
} from "lucide-react";
import { useState } from "react";
import type { TradeItem, TradeProposal } from "@/lib/types/domain";

type AnalyticsData = {
	proposals: TradeProposal[];
	items: (TradeItem & { team: { country: string } })[];
};

export function NegotiationAnalytics({ data }: { data: AnalyticsData }) {
	const [activeTab, setActiveTab] = useState<
		"agreement" | "reveal"
	>("agreement");

	const executedProposals = data.proposals.filter(
		(p) => p.status === "executed",
	);
	const allResolvedItems = data.items.filter((i) => i.is_resolved);

	return (
		<div
			id="log-analysis"
			className="w-full bg-background border-2 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700"
		>
			{/* Header / Tabs */}
			<div className="flex border-b overflow-x-auto no-scrollbar bg-nav/50">
				<TabButton
					active={activeTab === "agreement"}
					onClick={() => setActiveTab("agreement")}
					icon={<FileText className="w-4 h-4" />}
					label="Agreement"
				/>
				<TabButton
					active={activeTab === "reveal"}
					onClick={() => setActiveTab("reveal")}
					icon={<Eye className="w-4 h-4" />}
					label="Revealed Values"
				/>
			</div>

			<div className="p-6 min-h-[400px]">
				{activeTab === "agreement" && (
					<AgreementView
						proposals={executedProposals}
						allResolvedItems={allResolvedItems}
					/>
				)}
				{activeTab === "reveal" && <RevealView items={data.items} />}
			</div>
		</div>
	);
}

function TabButton({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<button
			onClick={onClick}
			className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
				active
					? "border-foreground text-foreground bg-background"
					: "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}


function signedText(value: number) {
	return value > 0 ? `+${value}` : `${value}`;
}

function signedColor(value: number) {
	if (value > 0) return "text-emerald-700 dark:text-emerald-400";
	if (value < 0) return "text-red-700 dark:text-red-400";
	return "text-muted-foreground";
}

function AgreementView({
	proposals,
	allResolvedItems,
}: {
	proposals: TradeProposal[];
	allResolvedItems: (TradeItem & { team: { country: string } })[];
}) {
	if (proposals.length === 0) {
		return (
			<div className="py-20 text-center text-muted-foreground italic">
				No agreements were ratified.
			</div>
		);
	}

	const clauses = Object.values(
		allResolvedItems.reduce(
			(acc, item) => {
				const key = item.issue_id || item.name;
				if (!acc[key]) acc[key] = { name: item.name, usa: 0, china: 0 };
				if (item.team.country === "USA") acc[key].usa = Number(item.value);
				else if (item.team.country === "China")
					acc[key].china = Number(item.value);
				return acc;
			},
			{} as Record<string, { name: string; usa: number; china: number }>,
		),
	);

	const usaTotal = clauses.reduce((sum, c) => sum + c.usa, 0);
	const chinaTotal = clauses.reduce((sum, c) => sum + c.china, 0);

	return (
		<div className="space-y-8">
			<div>
				<h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">
					Final Ratified Clauses
				</h3>
				<div className="grid grid-cols-1 gap-3">
					{clauses.map((clause) => (
						<div
							key={clause.name}
							className="bg-background border-2 rounded-xl p-4 flex items-center justify-between gap-4"
						>
							<span className="text-xs font-bold flex-1">{clause.name}</span>
							<div className="flex items-center gap-4 shrink-0 text-xs font-black tabular-nums">
								<span className="flex items-center gap-1.5">
									<span className="text-[10px] uppercase tracking-wider text-blue-600">
										USA
									</span>
									<span className="text-foreground">
										{signedText(clause.usa)}
									</span>
								</span>
								<span className="flex items-center gap-1.5">
									<span className="text-[10px] uppercase tracking-wider text-red-600">
										PRC
									</span>
									<span className="text-foreground">
										{signedText(clause.china)}
									</span>
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Relative totals — the winner is whoever's total is higher. */}
			<div className="grid grid-cols-2 gap-4">
				<div className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 p-4 text-center">
					<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
						USA total
					</div>
					<div className="mt-1 text-2xl font-black text-foreground">
						{signedText(usaTotal)}
					</div>
				</div>
				<div className="rounded-xl border-2 border-red-500/20 bg-red-500/5 p-4 text-center">
					<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
						PRC total
					</div>
					<div className="mt-1 text-2xl font-black text-foreground">
						{signedText(chinaTotal)}
					</div>
				</div>
			</div>
		</div>
	);
}

function RevealView({
	items,
}: {
	items: (TradeItem & { team: { country: string } })[];
}) {
	// Group items by name to show comparative values
	const issues = items.reduce(
		(acc, current) => {
			const key = current.issue_id || current.name;
			if (!acc[key]) acc[key] = { name: current.name, values: {} };
			acc[key].values[current.team.country] = current.value;
			return acc;
		},
		{} as Record<string, { name: string; values: Record<string, number> }>,
	);

	return (
		<div className="space-y-6">
			<div className="overflow-x-auto rounded-xl border">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr className="bg-muted text-[10px] font-black uppercase tracking-widest border-b">
							<th className="px-4 py-3">Issue / Negotiation Item</th>
							<th className="px-4 py-3 text-center text-foreground">
								USA Value
							</th>
							<th className="px-4 py-3 text-center text-foreground">
								PRC Value
							</th>
						</tr>
					</thead>
					<tbody className="divide-y text-xs">
						{Object.values(issues).map((issue, idx) => {
							const usaVal = issue.values.USA ?? 0;
							const chinaVal = issue.values.China ?? 0;

							return (
								<tr key={idx} className="hover:bg-muted/30 transition-colors">
									<td className="px-4 py-3 font-bold">{issue.name}</td>
									<td
										className={`px-4 py-3 text-center tabular-nums font-black ${signedColor(usaVal)}`}
									>
										{signedText(usaVal)}
									</td>
									<td
										className={`px-4 py-3 text-center tabular-nums font-black ${signedColor(chinaVal)}`}
									>
										{signedText(chinaVal)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
