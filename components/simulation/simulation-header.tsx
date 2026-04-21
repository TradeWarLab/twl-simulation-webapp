import Link from "next/link";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export function SimulationHeader({
	className,
	classRecord,
	teamRecord,
	interestGroup,
	periods,
}: {
	className?: string;
	classRecord: { name: string; current_period: number };
	teamRecord: { country: string } | null;
	interestGroup?: string | null;
	periods: string[];
}) {
	return (
		<header
			className={`flex justify-between items-center mb-4 pb-4 border-b ${className ?? ""}`}
		>
			<div>
				<div className="flex items-center gap-3">
					<Link
						href="/student/dashboard"
						className="text-sm text-muted-foreground hover:underline"
					>
						Exit Simulation
					</Link>
					<ThemeSwitcher />
				</div>
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
					{interestGroup && (
						<span className="ml-2 text-lg font-medium opacity-80">
							— {interestGroup}
						</span>
					)}
				</div>
			</div>
		</header>
	);
}
