export function SessionStepper({
	currentPeriod,
	periods,
}: {
	currentPeriod: number;
	periods: string[];
}) {
	return (
		<div className="relative">
			<div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
			<div className="flex justify-between items-center">
				{periods.map((period, index) => {
					const isCompleted = index < currentPeriod;
					const isCurrent = index === currentPeriod;

					return (
						<div
							key={period}
							className="flex flex-col items-center gap-2 bg-background px-2"
						>
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
									isCompleted
										? "bg-primary border-primary text-primary-foreground"
										: isCurrent
											? "bg-background border-primary text-primary ring-4 ring-primary/20"
											: "bg-background border-slate-200 text-slate-400"
								}`}
							>
								{isCompleted ? (
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
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								) : (
									<span className="font-semibold">{index + 1}</span>
								)}
							</div>
							<span
								className={`text-sm font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
							>
								{period}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
