import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
									<span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
										{cls.status}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
