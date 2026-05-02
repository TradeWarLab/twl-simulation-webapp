import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSimulationLogSnapshot } from "@/app/actions/log";
import { LogClient } from "@/components/instructor/log-client";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default function LogDashboardPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8 text-center text-muted-foreground">
					Loading negotiation log...
				</div>
			}
		>
			<LogDashboardInner params={params} />
		</Suspense>
	);
}

async function LogDashboardInner({
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
		.select("name")
		.eq("id", id)
		.eq("instructor_id", user.id)
		.single();

	if (classError || !classData) {
		redirect("/instructor/dashboard");
	}

	const snapshot = await getSimulationLogSnapshot(id);

	return (
		<div className="container mx-auto p-8 max-w-5xl">
			<div className="mb-4">
				<Button variant="ghost" asChild className="mb-4">
					<Link href={`/instructor/classes/${id}`}>← Back to Dashboard</Link>
				</Button>
				<div className="flex justify-between items-center bg-slate-900 border-border text-slate-100 p-6 rounded-lg shadow-sm border mb-8">
					<div>
						<h1 className="text-3xl font-bold">{classData.name} - Log</h1>
						<p className="text-sm font-medium opacity-80 mt-1">
							Live view of chat, value updates, and proposed trades.
						</p>
					</div>
				</div>
			</div>

			<LogClient classId={id} initialSnapshot={snapshot} className="w-full" />
		</div>
	);
}
