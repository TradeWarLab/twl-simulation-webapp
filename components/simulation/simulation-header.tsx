import Link from "next/link";

export function SimulationHeader({
	className,
	classRecord,
	teamRecord,
	periods,
}: {
	className?: string;
	classRecord: { name: string; current_period: number };
	teamRecord: { country: string } | null;
	periods: string[];
}) {
	return (
		<header
			className={`flex justify-between items-center mb-4 pb-4 border-b ${className ?? ""}`}
		>
			<div>
				<Link
					href="/student/dashboard"
					className="text-sm text-muted-foreground hover:underline"
				>
					Exit Simulation
				</Link>
				<h1 className="text-2xl font-bold">{classRecord.name}</h1>
			</div>
			<div className="text-center">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">
					Current Phase
				</div>
				<div className="font-bold text-lg">
					{periods[classRecord.current_period]}
				</div>
			</div>
			<div className="text-right">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">
					My Team
				</div>
				<div
					className={`font-bold text-lg ${teamRecord?.country === "USA" ? "text-blue-600" : "text-red-600"}`}
				>
					{teamRecord?.country || "Unassigned"}
				</div>
			</div>
		</header>
	);
}
