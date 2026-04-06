import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BriefingForm } from "@/components/briefing-form";
import { getClassBriefings } from "@/app/actions/briefings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function BriefingsDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto p-8 text-center text-muted-foreground">
                    Loading briefings...
                </div>
            }
        >
            <BriefingsDashboardInner params={params} />
        </Suspense>
    );
}

async function BriefingsDashboardInner({ params }: { params: Promise<{ id: string }> }) {
    await connection();
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Verify instructor owns class
    const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("name, class_code")
        .eq("id", id)
        .eq("instructor_id", user.id)
        .single();

    if (classError || !classData) {
        redirect("/instructor/dashboard");
    }

    const briefings = await getClassBriefings(id);

    return (
        <div className="container mx-auto p-8">
            <div className="mb-4">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href={`/instructor/classes/${id}`}>← Back to Dashboard</Link>
                </Button>
                <div className="flex justify-between items-center bg-slate-900 border-border text-slate-100 p-6 rounded-lg shadow-sm border mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">{classData.name} - Briefings</h1>
                        <p className="text-sm font-medium opacity-80 mt-1">Manage documents & strategic intelligence</p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Form Column */}
                <div>
                    <BriefingForm classId={id} />
                </div>

                {/* List Column */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">Current Intelligence</h2>
                    {briefings.length === 0 ? (
                        <Card className="bg-muted/30">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                No briefings have been published yet.
                            </CardContent>
                        </Card>
                    ) : (
                        briefings.map(briefing => (
                            <Card key={briefing.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-xl">{briefing.title}</CardTitle>
                                        <Badge variant={briefing.target_role === "All" ? "secondary" : "outline"} className={briefing.target_role === "USA" ? "border-blue-500 text-blue-700" : briefing.target_role === "China" ? "border-red-500 text-red-700" : ""}>
                                            {briefing.target_role}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        Published {new Date(briefing.created_at).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                        {briefing.content}
                                    </p>
                                    {/* Optionally add delete functionality later */}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
