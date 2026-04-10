import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getClassRoster, updateClassPeriod } from "@/app/actions/classes";
import { ClassDetailHeader } from "@/components/instructor/class-detail-header";
import { QuickActionsSidebar } from "@/components/instructor/quick-actions-sidebar";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";
import { SessionStepper } from "@/components/instructor/session-stepper";
import { StudentRoster } from "@/components/instructor/student-roster";
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
			<ClassDetailHeader classData={classData} />

			{/* Stepper */}
			<SessionStepper
				currentPeriod={classData.current_period}
				periods={periods}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-8">
					{/* Session Control */}
					<SessionControlPanel
						currentPeriod={classData.current_period}
						periods={periods}
						advanceAction={advancePeriod}
						goBackAction={goBackPeriod}
					/>

					{/* Roster */}
					<StudentRoster classId={id} roster={roster} />
				</div>

				{/* Sidebar */}
				<QuickActionsSidebar classId={id} classCode={classData.class_code} />
			</div>
		</div>
	);
}
