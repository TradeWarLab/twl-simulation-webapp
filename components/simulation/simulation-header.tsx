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
		<header
			className={`flex justify-between items-center mb-4 pb-4 border-b ${className ?? ""}`}
		>
			<div className="space-y-0.5">
				<h1 className="text-2xl font-bold tracking-tight">{classRecord.name}</h1>
				<div className="flex items-center gap-2 text-sm">
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
			<div className="text-center">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">
					Current Phase
				</div>
				<div className="font-bold text-lg">
					{periods[classRecord.current_period]}
				</div>
			</div>
			<div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5">
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
		</header>
	);
}
