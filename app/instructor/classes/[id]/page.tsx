import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
	getClassRoster,
	updateClassPeriod,
	endSimulation,
} from "@/app/actions/classes";
import { getInstructorDashboardSnapshot } from "@/app/actions/instructor-dashboard";
import { ClassDetailHeader } from "@/components/instructor/class-detail-header";
import { InstructorLiveDashboard } from "@/components/instructor/instructor-live-dashboard";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";
import { SessionStepper } from "@/components/instructor/session-stepper";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { SIMULATION_PERIODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { ProfileMenu } from "@/components/shared/profile-menu";

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
		}
		if (classData.current_period === periods.length - 2) {
			await endSimulation(id);
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
			<div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5">
				<ThemeSwitcher />
				<ProfileMenu email={user.email ?? ""} />
			</div>
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
