import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BriefingPanel({
	briefings,
	className,
	notebooklmUrl,
}: {
	briefings: any[];
	className?: string;
	notebooklmUrl: string | null;
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
			<CardContent className="space-y-4">
				{notebooklmUrl ? (
					<Card className="shrink-0 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900 shadow-sm">
						<CardContent className="p-4 flex flex-col gap-3">
							<div>
								<h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
									Research Notebook
								</h3>
								<p className="text-xs text-blue-700/80 dark:text-blue-300">
									Access your class research materials and ask AI queries
									directly.
								</p>
							</div>
							<Button
								asChild
								size="sm"
								variant="outline"
								className="w-full bg-card hover:bg-muted"
							>
								<a
									href={notebooklmUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									Open NotebookLM <ExternalLink className="w-3 h-3 ml-2" />
								</a>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="p-4 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground shrink-0 bg-muted/50">
						No research notebook available.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
