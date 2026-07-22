import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
	endSimulation,
	getClassRoster,
	updateClassPeriod,
} from "@/app/actions/classes";
import { getRealtimeSnapshot } from "@/app/actions/realtime-snapshot";
import { getScoreboard } from "@/app/actions/trade-controller";
import { ClassDetailHeader } from "@/components/instructor/class-detail-header";
import { InstructorLiveDashboard } from "@/components/instructor/instructor-live-dashboard";
import { SessionControlPanel } from "@/components/instructor/session-control-panel";
import { SessionStepper } from "@/components/instructor/session-stepper";
import { RealtimeClassProvider } from "@/components/realtime/realtime-class-provider";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { SIMULATION_PERIODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default function ClassDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense fallback={<LoadingScreen label="Loading class details…" />}>
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
	const snapshot = await getRealtimeSnapshot(id);
	if (!snapshot) notFound();
	// Populated only once a deal ratifies. The class provider forces a route
	// refresh on period change (realtime-class-provider.tsx:65-72), so this
	// re-runs when ratification ends the simulation in a student's session.
	const scores = await getScoreboard(id);
	const periods = SIMULATION_PERIODS;

	// Server action wrapper for updating period
	async function advancePeriod() {
		"use server";
		if (classData.current_period < periods.length - 1) {
			await updateClassPeriod(id, classData.current_period + 1);
		}
		// `>=`, not `===`: ratification can advance the class to the End period
		// on its own (schema.sql:768-770), so archiving must not depend on having
		// just advanced from the bilateral period. Without this, every class that
		// successfully reached a deal stays `active` forever, with the button
		// that would archive it disabled.
		if (classData.current_period >= periods.length - 2) {
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
					status={classData.status}
					periods={periods}
					advanceAction={advancePeriod}
					goBackAction={goBackPeriod}
				/>

				<RealtimeClassProvider
					classId={id}
					snapshot={snapshot}
					refetchSnapshot={getRealtimeSnapshot}
				>
					<InstructorLiveDashboard roster={roster} scores={scores} />
				</RealtimeClassProvider>
			</div>
		</div>
	);
}
