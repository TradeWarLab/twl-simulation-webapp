import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getClassBriefings } from "@/app/actions/briefings";
import { BriefingForm } from "@/components/briefing-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default function BriefingsDashboardPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8 text-center text-muted-foreground">
					Loading briefings...
				</div>
			}
		>
			<BriefingsDashboardInner params={params} />
		</Suspense>
	);
}

async function BriefingsDashboardInner({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await connection();
	const { id } = await params;
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/auth/login");

	// Verify instructor owns class
	const { data: classData, error: classError } = await supabase
		.from("classes")
		.select("name, class_code")
		.eq("id", id)
		.eq("instructor_id", user.id)
		.single();

	if (classError || !classData) {
		redirect("/instructor/dashboard");
	}

	const briefings = await getClassBriefings(id);

	return (
		<div className="container mx-auto p-8">
			<div className="mb-4">
				<Button variant="ghost" asChild className="mb-4">
					<Link href={`/instructor/classes/${id}`}>← Back to Dashboard</Link>
				</Button>
				<div className="flex justify-between items-center bg-slate-900 border-border text-slate-100 p-6 rounded-lg shadow-sm border mb-8">
					<div>
						<h1 className="text-3xl font-bold">{classData.name} - Briefings</h1>
						<p className="text-sm font-medium opacity-80 mt-1">
							Manage documents & strategic intelligence
						</p>
					</div>
				</div>
			</div>

			<div className="grid md:grid-cols-2 gap-8">
				{/* Form Column */}
				<div>
					<BriefingForm classId={id} />
				</div>

				{/* List Column */}
				<div className="space-y-4">
					<h2 className="text-2xl font-bold tracking-tight">
						Current Intelligence
					</h2>
					{briefings.length === 0 ? (
						<Card className="bg-muted/30">
							<CardContent className="py-8 text-center text-muted-foreground">
								No briefings have been published yet.
							</CardContent>
						</Card>
					) : (
						briefings.map((briefing) => (
							<Card key={briefing.id}>
								<CardHeader className="pb-2">
									<div className="flex justify-between items-start">
										<CardTitle className="text-xl">{briefing.title}</CardTitle>
										<div className="space-x-2 flex">
											<Badge
												variant={
													briefing.target_role === "All"
														? "secondary"
														: "outline"
												}
												className={
													briefing.target_role === "USA"
														? "border-blue-500 text-blue-700"
														: briefing.target_role === "China"
															? "border-red-500 text-red-700"
															: ""
												}
											>
												{briefing.target_role === "China"
													? "PRC"
													: briefing.target_role}
											</Badge>
											{briefing.interest_group &&
												briefing.interest_group !== "All" && (
													<Badge
														variant="outline"
														className="border-purple-500 text-purple-700"
													>
														{briefing.interest_group}
													</Badge>
												)}
										</div>
									</div>
									<CardDescription>
										Published{" "}
										{new Date(briefing.created_at).toLocaleDateString()}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="whitespace-pre-wrap text-sm text-muted-foreground mb-4">
										{briefing.content || "No notes provided."}
									</p>
									{briefing.file_url && (
										<Button variant="outline" size="sm" asChild>
											<a
												href={briefing.file_url}
												target="_blank"
												rel="noreferrer"
											>
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
													className="mr-2"
												>
													<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
													<polyline points="14 2 14 8 20 8" />
												</svg>
												View Attached Document
											</a>
										</Button>
									)}
								</CardContent>
							</Card>
						))
					)}
				</div>
			</div>
		</div>
	);
}
