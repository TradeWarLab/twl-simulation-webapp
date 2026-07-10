import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getStudentClasses } from "@/app/actions/classes";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { ThemeInitializer } from "@/components/shared/theme-initializer";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { JoinClassForm } from "@/components/student/join-class-form";
import { StudentSimulationsList } from "@/components/student/student-simulations-list";
import { createClient } from "@/lib/supabase/server";

// Render a synchronous component that immediately shows a fallback while
// the inner async component performs per-request I/O (supabase, etc.). This
// avoids the "Uncached data was accessed outside of <Suspense>" error.
export default function StudentDashboard() {
	return (
		<Suspense fallback={<LoadingScreen label="Loading your dashboard…" />}>
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
		<div className="container mx-auto p-4 sm:p-8">
			<ThemeInitializer userRole="student" />
			<div className="flex justify-between items-center gap-3 mb-8">
				<h1 className="text-2xl sm:text-3xl font-bold">Student Dashboard</h1>
				<div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5 shrink-0">
					<ThemeSwitcher />
					<ProfileMenu email={user.email ?? ""} />
				</div>
			</div>

			<StudentSimulationsList enrolledClasses={enrolledClasses} />

			<JoinClassForm />
		</div>
	);
}
