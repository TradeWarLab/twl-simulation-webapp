import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getInstructorDashboardSnapshot } from "@/app/actions/instructor-dashboard";
import { getClassRoster, updateClassPeriod } from "@/app/actions/classes";
import { ClassDetailHeader } from "@/components/instructor/class-detail-header";
import { InstructorLiveDashboard } from "@/components/instructor/instructor-live-dashboard";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";
import { SessionStepper } from "@/components/instructor/session-stepper";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { SIMULATION_PERIODS } from "@/lib/constants";
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
		.eq("instructor_id", user?.id)
		.single();

	if (error || !classData) {
		notFound();
	}

	const roster = await getClassRoster(id);
	const initialSnapshot = await getInstructorDashboardSnapshot(id);
	const periods = SIMULATION_PERIODS;

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
			<div className="flex justify-between items-start">
				<ClassDetailHeader classData={classData} />
				<ThemeSwitcher />
			</div>

			{/* Stepper */}
			<SessionStepper
				currentPeriod={classData.current_period}
				periods={periods}
			/>

			<div className="space-y-8">
				<SessionControlPanel
					classId={id}
					classCode={classData.class_code}
					currentPeriod={classData.current_period}
					periods={periods}
					advanceAction={advancePeriod}
					goBackAction={goBackPeriod}
				/>

				<InstructorLiveDashboard
					classRecord={classData}
					periods={periods}
					initialSnapshot={{
						...initialSnapshot,
						roster,
					}}
				/>
			</div>
		</div>
	);
}
