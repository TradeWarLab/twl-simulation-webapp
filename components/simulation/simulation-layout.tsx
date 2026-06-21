"use client";

import { Minus, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";

function CollapsedStrip({
	label,
	onExpand,
}: {
	label: string;
	onExpand: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onExpand}
			className="hidden lg:flex flex-col items-center justify-center gap-2 rounded-md border bg-card hover:bg-muted transition-colors cursor-pointer min-h-0 h-full px-1"
			title={`Show ${label}`}
		>
			<Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
			<span className="text-[11px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
				{label}
			</span>
		</button>
	);
}

function CollapseToggle({
	label,
	onCollapse,
	align = "right",
}: {
	label: string;
	onCollapse: () => void;
	align?: "left" | "right";
}) {
	return (
		<div className={`hidden lg:flex shrink-0 mb-1 ${align === "left" ? "justify-start" : "justify-end"}`}>
			<button
				type="button"
				onClick={onCollapse}
				className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded text-[11px]"
				title={`Hide ${label}`}
			>
				<Minus className="w-3 h-3" />
				<span className="font-medium">Hide</span>
			</button>
		</div>
	);
}

export function SimulationLayout({
	leftPanel,
	centerPanel,
	rightPanel,
}: {
	leftPanel: ReactNode;
	centerPanel: ReactNode;
	rightPanel: ReactNode;
}) {
	const [leftCollapsed, setLeftCollapsed] = useState(false);
	const [rightCollapsed, setRightCollapsed] = useState(false);

	const leftCol = leftCollapsed ? "36px" : "330px";
	const rightCol = rightCollapsed ? "36px" : "390px";

	return (
		<main className="flex-1 min-h-0">
			<div
				className="hidden lg:grid h-full gap-4 min-h-0"
				style={{
					gridTemplateColumns: `${leftCol} 1fr ${rightCol}`,
					transition: "grid-template-columns 0.2s ease",
				}}
			>
				{/* Left Panel */}
				{leftCollapsed ? (
					<CollapsedStrip
						label="Briefings"
						onExpand={() => setLeftCollapsed(false)}
					/>
				) : (
					<div className="flex flex-col min-h-0 overflow-y-auto">
						<CollapseToggle
							label="Briefings"
							onCollapse={() => setLeftCollapsed(true)}
							align="right"
						/>
						<div className="flex-1 overflow-y-auto pb-4">
							{leftPanel}
						</div>
					</div>
				)}

				{/* Center Panel */}
				{centerPanel}

				{/* Right Panel */}
				{rightCollapsed ? (
					<CollapsedStrip
						label="Chat"
						onExpand={() => setRightCollapsed(false)}
					/>
				) : (
					<div className="flex flex-col min-h-0 h-full">
						<CollapseToggle
							label="Chat"
							onCollapse={() => setRightCollapsed(true)}
							align="left"
						/>
						<div className="flex-1 min-h-0">
							{rightPanel}
						</div>
					</div>
				)}
			</div>

			{/* Mobile: show all panels stacked */}
			<div className="lg:hidden flex flex-col gap-4 min-h-0">
				<div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
					<div className="pb-4">{leftPanel}</div>
				</div>
				{centerPanel}
				<div className="flex flex-col min-h-0 h-[600px] pb-4">
					{rightPanel}
				</div>
			</div>
		</main>
	);
}
