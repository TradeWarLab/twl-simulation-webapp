import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getClassRoster, updateClassPeriod } from "@/app/actions/classes";
import { ClassCodeCopyButton } from "@/components/class-code-copy";
import { StudentRoster } from "@/components/student-roster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default function ClassDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8">
					<p className="text-center text-muted-foreground">
						Loading class details…
					</p>
				</div>
			}
		>
			{/* inner component is async and holds all the awaits */}
			<ClassDetailPageInner params={params} />
		</Suspense>
	);
}

async function ClassDetailPageInner({
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

	const { data: classData, error } = await supabase
		.from("classes")
		.select("*")
		.eq("id", id)
		.eq("instructor_id", user!.id)
		.single();

	if (error || !classData) {
		notFound();
	}

	const roster = await getClassRoster(id);
	const periods = [
		"Setup",
		"Domestic Negotiation",
		"Bilateral Negotiation",
		"End",
	];

	// Server action wrapper for updating period
	async function advancePeriod() {
		"use server";
		if (classData.current_period < periods.length - 1) {
			await updateClassPeriod(id, classData.current_period + 1);
		} else if (classData.current_period === periods.length - 1) {
			// TODO: Implement end simulation logic (e.g., archive class, disable actions, upload data, etc.)
		}
	}

	async function goBackPeriod() {
		"use server";
		if (classData.current_period > 0) {
			await updateClassPeriod(id, classData.current_period - 1);
		}
	}

	return (
		<div className="container mx-auto p-8 space-y-8">
			{/* Header Section */}
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
					<span
						className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
							classData.status === "active"
								? "bg-green-50 text-green-700 border-green-200"
								: "bg-slate-100 text-slate-700 border-slate-200"
						}`}
					>
						{classData.status.charAt(0).toUpperCase() +
							classData.status.slice(1)}
					</span>
				</div>
			</div>

			{/* Stepper */}
			<div className="relative">
				<div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
				<div className="flex justify-between items-center">
					{periods.map((period, index) => {
						const isCompleted = index < classData.current_period;
						const isCurrent = index === classData.current_period;

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

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-8">
					{/* Session Control */}
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
									{classData.current_period + 1}.{" "}
									{periods[classData.current_period]}
								</p>
							</div>

							<div className="flex items-center gap-4">
								<form action={goBackPeriod}>
									<Button
										variant="ghost"
										disabled={classData.current_period <= 0}
										className="text-muted-foreground hover:text-destructive"
									>
										&larr; Previous Period
									</Button>
								</form>
								<div className="flex-1" />
								<form action={advancePeriod}>
									<Button
										disabled={classData.current_period >= periods.length}
										className="w-full sm:w-auto"
									>
										{classData.current_period === periods.length - 1
											? "End Simulation"
											: "Advance to Next Period →"}
									</Button>
								</form>
							</div>
						</CardContent>
					</Card>

					{/* Roster */}
					<StudentRoster classId={id} roster={roster} />
				</div>

				{/* Sidebar */}
				<div className="space-y-8">
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-2">
							<Button variant="outline" className="justify-start gap-2" asChild>
								<Link href={`/instructor/classes/${id}/briefings`}>
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
									Upload Briefing
								</Link>
							</Button>
							<Button variant="outline" className="justify-start gap-2" asChild>
								<Link href={`/instructor/classes/${id}/teams`}>
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
								<Link href={`/instructor/classes/${id}/items`}>
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
									Manage Trade Items
								</Link>
							</Button>
							<Button variant="outline" className="justify-start gap-2" asChild>
								<Link href={`/instructor/classes/${id}/log`}>
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
							<div className="flex items-center gap-2 p-3 bg-slate-200 dark:bg-slate-700 rounded-md border font-mono text-sm">
								<span className="flex-1 truncate select-all text-slate-900 dark:text-slate-100">
									{classData.class_code ?? "Unavailable"}
								</span>
								<ClassCodeCopyButton code={classData.class_code ?? ""} />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
