import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getInstructorClasses } from "@/app/actions/classes";
import { CreateClassForm } from "@/components/instructor/create-class-form";
import { InstructorClassList } from "@/components/instructor/instructor-class-list";
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
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold">Instructor Dashboard</h1>
				<div className="text-sm text-muted-foreground">
					Logged in as: {user.email}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<CreateClassForm />

				<InstructorClassList classes={classes} />
			</div>
		</div>
	);
}
