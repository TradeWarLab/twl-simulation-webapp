import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getClassRoster } from "@/app/actions/classes";
import { ManageTeamsClient } from "@/components/manage-teams-client";
import { Button } from "@/components/ui/button";

export default function TeamsDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto p-8 text-center text-muted-foreground">
                    Loading team roster...
                </div>
            }
        >
            <TeamsDashboardInner params={params} />
        </Suspense>
    );
}

async function TeamsDashboardInner({ params }: { params: Promise<{ id: string }> }) {
    await connection();
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

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

    const roster = await getClassRoster(id);

    return (
        <div className="container mx-auto p-8">
            <div className="mb-4">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href={`/instructor/classes/${id}`}>← Back to Dashboard</Link>
                </Button>
                <div className="flex justify-between items-center bg-slate-900 border-border text-slate-100 p-6 rounded-lg shadow-sm border mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">{classData.name} - Team Management</h1>
                        <p className="text-sm font-medium opacity-80 mt-1">
                            Assign or modify student delegations securely
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-card text-card-foreground shadow-sm rounded-lg border">
                <ManageTeamsClient classId={id} initialRoster={roster} />
            </div>
        </div>
    );
}
