import { LogOut } from "lucide-react";
import Link from "next/link";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export function SimulationHeader({
	className,
	classRecord,
	teamRecord,
	interestGroup,
	periods,
	userEmail,
}: {
	className?: string;
	classRecord: { name: string; current_period: number };
	teamRecord: { country: string } | null;
	interestGroup?: string | null;
	periods: string[];
	userEmail: string;
}) {
	return (
		<header className={`mb-4 pb-4 border-b ${className ?? ""}`}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 space-y-0.5">
					<h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
						{classRecord.name}
					</h1>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
						<span
							className={`font-semibold ${teamRecord?.country === "USA" ? "text-blue-600" : "text-red-600"}`}
						>
							{teamRecord?.country || "Unassigned"}
						</span>
						{interestGroup && (
							<>
								<span className="text-muted-foreground">/</span>
								<span className="text-muted-foreground">{interestGroup}</span>
							</>
						)}
					</div>
				</div>

				{/* Phase — centered on desktop; moves to its own row on mobile */}
				<div className="hidden md:block text-center shrink-0">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						Current Phase
					</div>
					<div className="font-bold text-lg">
						{periods[classRecord.current_period]}
					</div>
				</div>

				<div className="flex items-center gap-1 sm:gap-2 border border-border rounded-full px-2 sm:px-3 py-1.5 shrink-0">
					<ThemeSwitcher />
					<ProfileMenu email={userEmail} />
					<Link
						href="/student/dashboard"
						aria-label="Exit simulation"
						className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground border border-border transition-colors hover:text-foreground hover:bg-muted"
					>
						<LogOut size={17} />
					</Link>
				</div>
			</div>

			{/* Phase row for mobile (where the centered block is hidden) */}
			<div className="md:hidden mt-2 flex items-center gap-2 text-sm">
				<span className="text-xs uppercase tracking-wide text-muted-foreground">
					Current Phase
				</span>
				<span className="font-bold">{periods[classRecord.current_period]}</span>
			</div>
		</header>
	);
}
