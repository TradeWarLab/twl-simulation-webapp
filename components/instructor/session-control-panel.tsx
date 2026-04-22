import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionControlPanel({
	currentPeriod,
	periods,
	advanceAction,
	goBackAction,
}: {
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
			<CardContent className="space-y-6">
				<div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border">
					<p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
						Current Period
					</p>
					<p className="text-2xl font-bold text-primary">
						{currentPeriod + 1}. {periods[currentPeriod]}
					</p>
				</div>

				<div className="flex items-center gap-4">
					<form action={goBackAction}>
						<Button
							variant="ghost"
							disabled={currentPeriod <= 0}
							className="text-muted-foreground hover:text-destructive"
						>
							&larr; Previous Period
						</Button>
					</form>
					<div className="flex-1" />
					<form action={advanceAction}>
						<Button
							disabled={currentPeriod >= periods.length - 1}
							className="w-full sm:w-auto h-10 px-6 font-bold shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
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
