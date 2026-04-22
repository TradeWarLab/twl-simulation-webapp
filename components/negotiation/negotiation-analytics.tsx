"use client";

import {
	CheckCircle2,
	Eye,
	FileText,
	History,
	Lightbulb,
	Timer,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import type { TradeItem, TradeProposal } from "@/lib/types/domain";

type AnalyticsData = {
	proposals: TradeProposal[];
	items: (TradeItem & { team: { country: string } })[];
};

export function NegotiationAnalytics({ data }: { data: AnalyticsData }) {
	const [activeTab, setActiveTab] = useState<
		"timeline" | "agreement" | "reveal" | "insights"
	>("timeline");

	const executedProposals = data.proposals.filter(
		(p) => p.status === "executed",
	);
	const allResolvedItems = data.items.filter((i) => i.is_resolved);

	// Key Insights Logic
	// const getInsights = () => {
	// 	const insights = [];

	// 	// Largest Gain/Concession (based on executed trades)
	// 	const executedItems = executedProposals.flatMap((p) => [
	// 		...p.offered_items,
	// 		...p.requested_items,
	// 	]);

	// 	// Map item values from both teams
	// 	const itemsWithBothValues = data.items.reduce(
	// 		(acc, item) => {
	// 			const key = item.issue_id || item.name;
	// 			if (!acc[key]) acc[key] = { name: item.name, values: {} };
	// 			acc[key].values[item.team.country] = item.value;
	// 			return acc;
	// 		},
	// 		{} as Record<string, { name: string; values: Record<string, number> }>,
	// 	);

	// 	// 1. Win-Win Opportunity
	// 	const winWin = Object.values(itemsWithBothValues).find(
	// 		(item) => item.values["USA"] > 10 && item.values["China"] > 10,
	// 	);
	// 	if (winWin) {
	// 		insights.push({
	// 			title: "High Symbiosis Found",
	// 			text: `Both teams assigned high value to "${winWin.name}". This provided a major opportunity for a mutually beneficial resolution.`,
	// 			type: "success",
	// 		});
	// 	}

	// 	// 2. Strategic Mismatch
	// 	const mismatch = Object.values(itemsWithBothValues).find(
	// 		(item) =>
	// 			(item.values["USA"] >= 25 && item.values["China"] <= 5) ||
	// 			(item.values["China"] >= 25 && item.values["USA"] <= 5),
	// 	);
	// 	if (mismatch) {
	// 		const winner = mismatch.values["USA"] > mismatch.values["China"] ? "USA" : "China";
	// 		insights.push({
	// 			title: "Strategic Asymmetry",
	// 			text: `The issue "${mismatch.name}" was valued significantly higher by ${winner}. This made it prime for a high-leverage trade.`,
	// 			type: "info",
	// 		});
	// 	}

	// 	// 3. Efficiency Check
	// 	const totalExecuted = executedProposals.length;
	// 	if (totalExecuted > 3) {
	// 		insights.push({
	// 			title: "Active Diplomacy",
	// 			text: `Total of ${totalExecuted} trade agreements were reached, indicating a high level of diplomatic activity and proposal iteration.`,
	// 			type: "info",
	// 		});
	// 	} else if (totalExecuted === 0) {
	// 		insights.push({
	// 			title: "Stalled Dialogue",
	// 			text: "No proposals were unanimously approved. This often indicates a lack of trust or a failure to identify each other's low-cost concessions.",
	// 			type: "warning",
	// 		});
	// 	}

	// 	return insights;
	// };

	// const insights = getInsights();

	return (
		<div
			id="log-analysis"
			className="w-full bg-background border-2 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700"
		>
			{/* Header / Tabs */}
			<div className="flex border-b overflow-x-auto no-scrollbar bg-nav/50">
				<TabButton
					active={activeTab === "timeline"}
					onClick={() => setActiveTab("timeline")}
					icon={<History className="w-4 h-4" />}
					label="Timeline"
				/>
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
				{/* <TabButton
					active={activeTab === "insights"}
					onClick={() => setActiveTab("insights")}
					icon={<Lightbulb className="w-4 h-4" />}
					label="Insights"
				/> */}
			</div>

			<div className="p-6 min-h-[400px]">
				{activeTab === "timeline" && (
					<TimelineView proposals={data.proposals} />
				)}
				{activeTab === "agreement" && (
					<AgreementView
						proposals={executedProposals}
						allResolvedItems={allResolvedItems}
					/>
				)}
				{activeTab === "reveal" && <RevealView items={data.items} />}
				{/* {activeTab === "insights" && <InsightsView insights={insights} />} */}
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

function TimelineView({ proposals }: { proposals: TradeProposal[] }) {
	if (proposals.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
				No proposals were made during this session.
			</div>
		);
	}

	return (
		<div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
			{proposals.map((p, idx) => (
				<div
					key={p.id}
					className="relative pl-10 animate-in fade-in slide-in-from-left-2"
					style={{ animationDelay: `${idx * 50}ms` }}
				>
					<div
						className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-background flex items-center justify-center z-10 ${
							p.status === "executed"
								? "bg-emerald-500 text-white"
								: p.status === "rejected"
									? "bg-red-500 text-white"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{p.status === "executed" ? (
							<CheckCircle2 className="w-5 h-5" />
						) : p.status === "rejected" ? (
							<XCircle className="w-5 h-5" />
						) : (
							<Timer className="w-5 h-5" />
						)}
					</div>
					<div className="bg-muted/30 rounded-xl border p-5">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
							<div className="font-black uppercase tracking-tight text-sm">
								{p.proposing_team?.country} Proposal to{" "}
								{p.receiving_team?.country}
							</div>
							<div
								className={`text-[10px] font-bold uppercase py-1 px-2 rounded-full border ${
									p.status === "executed"
										? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
										: "border-muted-foreground/20 bg-muted text-muted-foreground"
								}`}
							>
								{p.status}
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div>
								<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
									Offered Items
								</div>
								<div className="space-y-1.5">
									{p.offered_items.map((item) => (
										<div
											key={item.item_id}
											className="text-xs bg-background border px-2 py-1 rounded-lg truncate"
										>
											{item.name}
										</div>
									))}
								</div>
							</div>
							<div>
								<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
									Requested Items
								</div>
								<div className="space-y-1.5">
									{p.requested_items.map((item) => (
										<div
											key={item.item_id}
											className="text-xs bg-background border px-2 py-1 rounded-lg truncate"
										>
											{item.name}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function AgreementView({
	proposals,
	allResolvedItems,
}: {
	proposals: TradeProposal[];
	allResolvedItems: TradeItem[];
}) {
	if (proposals.length === 0) {
		return (
			<div className="py-20 text-center text-muted-foreground italic">
				No agreements were ratified.
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">
					Final Ratified Clauses
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{allResolvedItems
						.filter((i) => i.team_id === allResolvedItems[0].team_id)
						.map((item) => {
							// This section is slightly complex because values are relative.
							// Show the item and its impact on the team viewer.
							return (
								<div
									key={item.id}
									className="bg-background border-2 rounded-xl p-4 flex items-center justify-between"
								>
									<span className="text-xs font-bold">{item.name}</span>
									<span
										className={`text-xs font-black ${item.value > 0 ? "text-emerald-600" : item.value < 0 ? "text-red-600" : ""}`}
									>
										{item.value > 0 ? `+${item.value}` : item.value}
									</span>
								</div>
							);
						})}
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
			<div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-6">
				<Eye className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
				<div>
					<div className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-1">
						Confidential Information Revealed
					</div>
					<p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
						During the simulation, you could only see your own valuations. The
						table below reveals the full scale of interests from both sides.
					</p>
				</div>
			</div>

			<div className="overflow-x-auto rounded-xl border">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr className="bg-muted text-[10px] font-black uppercase tracking-widest border-b">
							<th className="px-4 py-3">Issue / Negotiation Item</th>
							<th className="px-4 py-3 text-center text-blue-600">USA Value</th>
							<th className="px-4 py-3 text-center text-red-600">
								China Value
							</th>
							{/* <th className="px-4 py-3 text-center">Conflict Type</th> */}
						</tr>
					</thead>
					<tbody className="divide-y text-xs">
						{Object.values(issues).map((issue, idx) => {
							const usaVal = issue.values.USA ?? 0;
							const chinaVal = issue.values.China ?? 0;
							const _totalVal = Math.abs(usaVal) + Math.abs(chinaVal);

							return (
								<tr key={idx} className="hover:bg-muted/30 transition-colors">
									<td className="px-4 py-3 font-bold">{issue.name}</td>
									<td
										className={`px-4 py-3 text-center tabular-nums font-black ${usaVal > 0 ? "text-blue-600" : usaVal < 0 ? "text-red-500" : "text-muted-foreground"}`}
									>
										{usaVal > 0 ? `+${usaVal}` : usaVal}
									</td>
									<td
										className={`px-4 py-3 text-center tabular-nums font-black ${chinaVal > 0 ? "text-red-600" : chinaVal < 0 ? "text-red-500" : "text-muted-foreground"}`}
									>
										{chinaVal > 0 ? `+${chinaVal}` : chinaVal}
									</td>
									{/* <td className="px-4 py-3 text-center">
										{usaVal > 0 && chinaVal > 0 ? (
											<span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">Win-Win</span>
										) : usaVal < 0 && chinaVal < 0 ? (
											<span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase">Zero-Sum</span>
										) : (
											<span className="text-muted-foreground text-[9px]">Mixed Interests</span>
										)}
									</td> */}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function _InsightsView({ insights }: { insights: any[] }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
			{insights.map((insight, idx) => (
				<div
					key={idx}
					className={`p-6 rounded-2xl border-2 flex gap-4 ${
						insight.type === "success"
							? "bg-emerald-50/50 border-emerald-100"
							: insight.type === "warning"
								? "bg-amber-50/50 border-amber-100"
								: "bg-indigo-50/50 border-indigo-100"
					}`}
				>
					<div
						className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
							insight.type === "success"
								? "bg-emerald-500 text-white"
								: insight.type === "warning"
									? "bg-amber-500 text-white"
									: "bg-indigo-500 text-white"
						}`}
					>
						{insight.type === "success" ? (
							<CheckCircle2 className="w-5 h-5" />
						) : (
							<Lightbulb className="w-5 h-5" />
						)}
					</div>
					<div>
						<h4
							className={`text-sm font-black uppercase tracking-tight mb-2 ${
								insight.type === "success"
									? "text-emerald-900"
									: insight.type === "warning"
										? "text-amber-900"
										: "text-indigo-900"
							}`}
						>
							{insight.title}
						</h4>
						<p className="text-xs text-muted-foreground leading-relaxed leading-relaxed">
							{insight.text}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}
