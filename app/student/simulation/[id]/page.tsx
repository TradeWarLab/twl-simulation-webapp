import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SimulationRealtimeProvider } from "@/components/simulation-realtime-provider";
import { Suspense } from "react";
import { getMessages } from "@/app/actions/chat";
import { ChatPanel } from "@/components/chat-panel";
import { getTeamTradeItems } from "@/app/actions/trade";
import { TradeItemsPanel } from "@/components/trade-items-panel";

export default function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="container mx-auto p-4">Loading simulation…</div>}>
            <SimulationPageInner params={params} />
        </Suspense>
    );
}

async function SimulationPageInner({ params }: { params: Promise<{ id: string }> }) {
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
    const teamRecord = Array.isArray(teamData) ? teamData[0] : teamData;
    const classRecord = Array.isArray(classData) ? classData[0] : classData;

    const periods = ["Setup", "Watch Documentary", "Debate", "Negotiation", "Reflection"];

    // Fetch initial chat messages for the team channel
    const teamChannel = `team_${teamRecord?.country?.toLowerCase() || 'unassigned'}`;
    const initialMessages = await getMessages(id, teamChannel);

    // Fetch initial trade items
    const tradeItems = teamRecord ? await getTeamTradeItems(id, teamRecord.id) : [];
    const isTradeLocked = classRecord.current_period >= 3; // Locked starting in Period 3 (Negotiation)

    return (
        <div className="container mx-auto p-4 h-screen flex flex-col">
            <SimulationRealtimeProvider classId={id} />
            <header className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                    <Link href="/student/dashboard" className="text-sm text-muted-foreground hover:underline">Exit Simulation</Link>
                    <h1 className="text-2xl font-bold">{classRecord.name}</h1>
                </div>
                <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Current Phase</div>
                    <div className="font-bold text-lg">{periods[classRecord.current_period]}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">My Team</div>
                    <div className={`font-bold text-lg ${teamRecord?.country === 'USA' ? 'text-blue-600' : 'text-red-600'}`}>
                        {teamRecord?.country || "Unassigned"}
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                {/* Left Panel: Info, Briefing & Trade Items */}
                <div className="h-full flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="py-3 shrink-0">
                            <CardTitle className="text-md">Briefing & Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            <p className="text-sm text-muted-foreground">No briefings available yet.</p>
                        </CardContent>
                    </Card>
                    <div className="flex-1 flex flex-col min-h-0">
                        {teamRecord && (
                            <TradeItemsPanel 
                                classId={id} 
                                initialItems={tradeItems} 
                                isLocked={isTradeLocked} 
                            />
                        )}
                    </div>
                </div>

                {/* Center Panel: Main Action Area (Negotiation Table / Video) */}
                <Card className="md:col-span-1 h-full flex flex-col">
                    <CardHeader className="py-3 shrink-0">
                        <CardTitle className="text-md">Action Center</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-md m-2">
                        {classRecord.current_period === 1 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Documentary Placeholder
                            </div>
                        )}
                        {classRecord.current_period === 3 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Negotiation Table (Drag & Drop Asks)
                            </div>
                        )}
                        {classRecord.current_period !== 1 && classRecord.current_period !== 3 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Wait for the next phase.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Panel: Chat */}
                <div className="h-full flex flex-col min-h-0">
                    <ChatPanel 
                        classId={id}
                        channel={teamChannel}
                        initialMessages={initialMessages}
                        currentUserId={user.id} 
                    />
                </div>
            </main>
        </div>
    );
}

