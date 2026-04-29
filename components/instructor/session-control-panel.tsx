import Link from "next/link";
import { ClassCodeCopyButton } from "@/components/instructor/class-code-copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionControlPanel({
	classId,
	classCode,
	currentPeriod,
	periods,
	advanceAction,
	goBackAction,
}: {
	classId: string;
	classCode: string | null;
	currentPeriod: number;
	periods: string[];
	advanceAction: () => Promise<void>;
	goBackAction: () => Promise<void>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-primary"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					Session Control
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_320px]">
					<div className="rounded-lg border bg-slate-100 p-4 dark:bg-slate-800">
						<p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
							Current Period
						</p>
						<p className="text-2xl font-bold text-primary">
							{currentPeriod + 1}. {periods[currentPeriod]}
						</p>
					</div>

					<div className="rounded-lg border bg-muted/20 p-4">
						<div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Quick Actions
						</div>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							<Button variant="outline" className="justify-start" asChild>
								<Link href={`/instructor/classes/${classId}/briefings`}>
									Briefings
								</Link>
							</Button>
							{/* <Button variant="outline" className="justify-start" asChild>
								<Link href={`/instructor/classes/${classId}/teams`}>
									Teams
								</Link>
							</Button> */}
							<Button variant="outline" className="justify-start" asChild>
								<Link href={`/instructor/classes/${classId}/items`}>
									Trade Items
								</Link>
							</Button>
							<Button variant="outline" className="justify-start" asChild>
								<Link href={`/instructor/classes/${classId}/log`}>
									Full Log
								</Link>
							</Button>
						</div>
					</div>

					<div className="rounded-lg border bg-background p-4">
						<div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Class Code
						</div>
						<div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-3 font-mono text-sm">
							<span className="flex-1 truncate select-all text-foreground">
								{classCode ?? "Unavailable"}
							</span>
							<ClassCodeCopyButton code={classCode ?? ""} />
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<form action={goBackAction}>
						<Button
							variant="ghost"
							disabled={currentPeriod <= 0}
							className="text-muted-foreground hover:text-destructive"
						>
							&larr; Previous Period
						</Button>
					</form>
					<form action={advanceAction} className="ml-auto">
						<Button
							disabled={currentPeriod >= periods.length - 1}
							className="h-10 px-6 font-bold shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
						>
							{currentPeriod >= periods.length - 2
								? "End Simulation"
								: "Advance to Next Period →"}
						</Button>
					</form>
				</div>
			</CardContent>
		</Card>
	);
}
