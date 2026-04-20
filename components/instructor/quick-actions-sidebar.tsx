import Link from "next/link";
import { ClassCodeCopyButton } from "@/components/instructor/class-code-copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActionsSidebar({
	classId,
	classCode,
}: {
	classId: string;
	classCode: string | null;
}) {
	return (
		<div className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-2">
					<Button variant="outline" className="justify-start gap-2" asChild>
						<Link href={`/instructor/classes/${classId}/briefings`}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
							View Briefings
						</Link>
					</Button>
					<Button variant="outline" className="justify-start gap-2" asChild>
						<Link href={`/instructor/classes/${classId}/teams`}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
							Manage Teams
						</Link>
					</Button>
					<Button variant="outline" className="justify-start gap-2" asChild>
						<Link href={`/instructor/classes/${classId}/items`}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16z" />
								<path d="M14 2v6h6" />
								<path d="M12 18v-6" />
								<path d="M9 15h6" />
							</svg>
							View Trade Items
						</Link>
					</Button>
					<Button variant="outline" className="justify-start gap-2" asChild>
						<Link href={`/instructor/classes/${classId}/log`}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
							View Negotiation Log
						</Link>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Class Code</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2 p-3 bg-muted rounded-md border font-mono text-sm">
						<span className="flex-1 truncate select-all text-foreground">
							{classCode ?? "Unavailable"}
						</span>
						<ClassCodeCopyButton code={classCode ?? ""} />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
