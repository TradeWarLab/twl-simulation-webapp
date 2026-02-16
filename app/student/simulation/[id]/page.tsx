import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SimulationRealtimeProvider } from "@/components/simulation-realtime-provider";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Verify enrollment
    const { data: enrollment, error } = await supabase
        .from("students_classes")
        .select(`
            *,
            classes (*),
            teams (*)
        `)
        .eq("class_id", id)
        .eq("student_id", user.id)
        .single();

    if (error || !enrollment) {
        notFound(); // Or redirect to dashboard with unauthorized message
    }

    const { classes: classData, teams: teamData } = enrollment;
    const periods = ["Setup", "Watch Documentary", "Debate", "Negotiation", "Reflection"];

    return (
        <div className="container mx-auto p-4 h-screen flex flex-col">
            <SimulationRealtimeProvider classId={id} />
            <header className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                    <Link href="/student/dashboard" className="text-sm text-muted-foreground hover:underline">Exit Simulation</Link>
                    <h1 className="text-2xl font-bold">{classData.name}</h1>
                </div>
                <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Current Phase</div>
                    <div className="font-bold text-lg">{periods[classData.current_period]}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">My Team</div>
                    <div className={`font-bold text-lg ${teamData?.country === 'USA' ? 'text-blue-600' : 'text-red-600'}`}>
                        {teamData?.country || "Unassigned"}
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                {/* Left Panel: Info & Briefing */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-md">Briefing & Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <p className="text-sm text-muted-foreground">No briefings available yet.</p>
                    </CardContent>
                </Card>

                {/* Center Panel: Main Action Area (Negotiation Table / Video) */}
                <Card className="md:col-span-1 h-full flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-md">Action Center</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-md m-2">
                        {classData.current_period === 1 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Documentary Placeholder
                            </div>
                        )}
                        {classData.current_period === 3 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Negotiation Table (Drag & Drop Asks)
                            </div>
                        )}
                        {classData.current_period !== 1 && classData.current_period !== 3 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Wait for the next phase.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Panel: Chat */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-md">Team Chat</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <p className="text-sm text-muted-foreground text-center mt-10">Chat system coming soon...</p>
                    </CardContent>
                    <div className="p-3 border-t">
                        <input className="w-full border rounded px-2 py-1" placeholder="Type a message..." disabled />
                    </div>
                </Card>
            </main>
        </div>
    );
}

