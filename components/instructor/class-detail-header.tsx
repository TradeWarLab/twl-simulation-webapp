import Link from "next/link";

export function ClassDetailHeader({ classData }: { classData: any }) {
	return (
		<div>
			<Link
				href="/instructor/dashboard"
				className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 transition-colors"
			>
				&larr; Back to Dashboard
			</Link>
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
						{classData.name}
					</h1>
					<p className="text-muted-foreground">
						Manage your class simulation state and student teams.
					</p>
				</div>
			</div>
		</div>
	);
}
