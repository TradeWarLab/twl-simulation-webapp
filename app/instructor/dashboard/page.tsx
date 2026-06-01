import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getInstructorClasses } from "@/app/actions/classes";
import { CreateClassForm } from "@/components/instructor/create-class-form";
import { InstructorClassList } from "@/components/instructor/instructor-class-list";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { ThemeInitializer } from "@/components/shared/theme-initializer";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { createClient } from "@/lib/supabase/server";

export default function InstructorDashboard() {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8">
					<p className="text-center text-muted-foreground">
						Loading instructor dashboard…
					</p>
				</div>
			}
		>
			<InstructorDashboardInner />
		</Suspense>
	);
}

async function InstructorDashboardInner() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	const classes = await getInstructorClasses();

	return (
		<div className="container mx-auto p-8">
			<ThemeInitializer userRole="instructor" />
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold">Instructor Dashboard</h1>
				<div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5">
					<ThemeSwitcher />
					<ProfileMenu email={user.email ?? ""} />
				</div>
			</div>

			<div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
				<CreateClassForm />
				<InstructorClassList classes={classes} />
			</div>
		</div>
	);
}
