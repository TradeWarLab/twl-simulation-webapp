import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManageItemsClient } from "@/components/manage-items-client";
import { getTeamTradeItems } from "@/app/actions/trade";

export default function ItemsDashboardPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-8 text-center text-muted-foreground">
					Loading trade items...
				</div>
			}
		>
			<ItemsDashboardInner params={params} />
		</Suspense>
	);
}

async function ItemsDashboardInner({
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

	// Get Teams
	const { data: teams } = await supabase
		.from("teams")
		.select("id, country")
		.eq("class_id", id);

	const usaTeam = teams?.find((t) => t.country === "USA");
	const chinaTeam = teams?.find((t) => t.country === "China");

	// Get Items
	const usaItems = usaTeam ? await getTeamTradeItems(id, usaTeam.id) : [];
	const chinaItems = chinaTeam ? await getTeamTradeItems(id, chinaTeam.id) : [];

	return (
		<div className="container mx-auto p-8">
			<div className="mb-4">
				<Button variant="ghost" asChild className="mb-4">
					<Link href={`/instructor/classes/${id}`}>← Back to Dashboard</Link>
				</Button>
				<div className="flex justify-between items-center bg-slate-900 border-border text-slate-100 p-6 rounded-lg shadow-sm border mb-8">
					<div>
						<h1 className="text-3xl font-bold">
							{classData.name} - Trade Item Seeding
						</h1>
						<p className="text-sm font-medium opacity-80 mt-1">
							Seed the initial negotiation asks and receives for both teams
						</p>
					</div>
				</div>
			</div>

			<ManageItemsClient
				classId={id}
				usaTeamId={usaTeam?.id || null}
				chinaTeamId={chinaTeam?.id || null}
				usaItems={usaItems}
				chinaItems={chinaItems}
			/>
		</div>
	);
}
