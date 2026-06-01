import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function InstructorClassList({ classes }: { classes: any[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Your Classes</CardTitle>
			</CardHeader>
			<CardContent>
				{classes.length === 0 ? (
					<p className="text-muted-foreground">No classes created yet.</p>
				) : (
					<ScrollArea className="max-h-[400px]">
						<ul className="space-y-2">
							{classes.map((cls) => (
								<li
									key={cls.id}
									className="border p-4 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
								>
									<Link
										href={`/instructor/classes/${cls.id}`}
										className="flex justify-between items-center"
									>
										<span className="font-medium">{cls.name}</span>
										<span
											className={`text-sm px-2 py-1 rounded-full ${
												cls.status === "active"
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
											}`}
										>
											{cls.status === "active" ? "Active" : "Completed"}
										</span>
									</Link>
								</li>
							))}
						</ul>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	);
}
