import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BriefingPanel({
	briefings,
	className,
}: {
	briefings: any[];
	className?: string;
}) {
	return (
		<Card className={`${className ?? ""}`}>
			<CardHeader className="py-3">
				<CardTitle className="text-md">Briefing & Resources</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{briefings.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No briefings available yet.
					</p>
				) : (
					briefings.map((b) => (
						<div key={b.id} className="p-3 bg-muted rounded-md text-sm">
							<div className="font-semibold mb-1">{b.title}</div>
							{b.content && (
								<p className="whitespace-pre-wrap text-muted-foreground mb-2">
									{b.content}
								</p>
							)}
							{b.file_url && (
								<Button variant="link" className="p-0 h-auto" asChild>
									<a href={b.file_url} target="_blank" rel="noreferrer">
										View Document
									</a>
								</Button>
							)}
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}
