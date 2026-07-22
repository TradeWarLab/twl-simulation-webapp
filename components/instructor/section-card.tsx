import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Shared shell for the instructor dashboard's top-level cards. */
export function SectionCard({
	title,
	description,
	icon,
	children,
	action,
}: {
	title: string;
	description?: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<Card className="border-border/70">
			<CardHeader className="border-b bg-muted/20 pb-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2 text-lg">
							{icon}
							{title}
						</CardTitle>
						{description && (
							<p className="mt-1 text-sm text-muted-foreground">{description}</p>
						)}
					</div>
					{action}
				</div>
			</CardHeader>
			<CardContent className="p-5">{children}</CardContent>
		</Card>
	);
}
