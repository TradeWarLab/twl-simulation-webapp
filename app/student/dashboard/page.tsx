import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { enrollStudentByCode, getStudentClasses } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

// Render a synchronous component that immediately shows a fallback while
// the inner async component performs per-request I/O (supabase, etc.). This
// avoids the "Uncached data was accessed outside of <Suspense>" error.
export default function StudentDashboard() {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8">
					<p className="text-center text-muted-foreground">
						Loading your dashboard…
					</p>
				</div>
			}
		>
			<StudentDashboardInner />
		</Suspense>
	);
}

async function StudentDashboardInner() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// ToDo: Implement actual join logic / verification
	// For now, this might return empty unless we manually seed data
	const enrolledClasses = await getStudentClasses();

	return (
		<div className="container mx-auto p-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold">Student Dashboard</h1>
				<div className="text-sm text-muted-foreground">
					Welcome, {user.email}
				</div>
			</div>

			<Card className="mb-8">
				<CardHeader>
					<CardTitle>My Simulations</CardTitle>
				</CardHeader>
				<CardContent>
					{enrolledClasses.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground mb-4">
								You are not enrolled in any simulations yet.
							</p>
							<p className="text-sm text-muted-foreground">
								Wait for your instructor to add you or enter a class code below.
							</p>
						</div>
					) : (
						<div className="grid gap-4">
							{enrolledClasses.map((cls) => (
								<div
									key={cls.id}
									className="border p-4 rounded-md flex justify-between items-center"
								>
									<div>
										<h3 className="font-semibold text-lg">{cls.name}</h3>
										<p className="text-sm text-muted-foreground">
											Team: {cls.team_country}
										</p>
									</div>
									<Button asChild>
										<Link href={`/student/simulation/${cls.id}`}>
											Enter Simulation
										</Link>
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Join a Class</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						action={async (formData: FormData) => {
							"use server";
							const code = formData.get("class_code") as string;
							if (code) await enrollStudentByCode(code.trim());
						}}
						className="flex max-w-sm items-center gap-2"
					>
						<Input
							name="class_code"
							placeholder="Enter Class Code (e.g. TWL-A42B39)"
							required
						/>
						<Button type="submit">Join</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
