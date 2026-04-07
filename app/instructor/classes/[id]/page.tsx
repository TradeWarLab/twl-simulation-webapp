import {
    getClassRoster,
    inviteStudentToClass,
    updateClassPeriod,
} from "@/app/actions/classes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ClassCodeCopyButton } from "@/components/class-code-copy";


// To satisfy Next.js cache component requirements we wrap the real
// rendering logic in a `<Suspense>` boundary. any uncached async
// operations (database queries, `connection()` call, etc.) now happen in
// `ClassDetailPageInner` so the outer page can show a fallback while the
// data is being fetched. without this you get the blocking-route warning:
// "Uncached data was accessed outside of <Suspense>".

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto p-8">
                    <p className="text-center text-muted-foreground">Loading class details…</p>
                </div>
            }
        >
            {/* inner component is async and holds all the awaits */}
            <ClassDetailPageInner params={params} />
        </Suspense>
    );
}

// keep the existing logic here but move it into a separate async
// component to avoid uncached data at the top level of the default export
async function ClassDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
    await connection();
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    const { data: classData, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .eq("instructor_id", user!.id)
        .single();

    if (error || !classData) {
        notFound();
    }

    const roster = await getClassRoster(id);

    // Server action wrapper for updating period
    async function advancePeriod() {
        "use server";
        if (classData.current_period < 4) {
            await updateClassPeriod(id, classData.current_period + 1);
        }
    }

    async function goBackPeriod() {
        "use server";
        if (classData.current_period > 0) {
            await updateClassPeriod(id, classData.current_period - 1);
        }
    }

    const periods = ["Setup", "Watch Documentary", "Debate", "Negotiation", "Reflection"];

    return (
        <div className="container mx-auto p-8 space-y-8">
            {/* Header Section */}
            <div>
                <Link href="/instructor/dashboard" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 transition-colors">
                    &larr; Back to Dashboard
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">{classData.name}</h1>
                        <p className="text-muted-foreground">Manage your class simulation state and student teams.</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${classData.status === 'active'
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                        {classData.status.charAt(0).toUpperCase() + classData.status.slice(1)}
                    </span>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
                <div className="flex justify-between items-center">
                    {periods.map((period, index) => {
                        const isCompleted = index < classData.current_period;
                        const isCurrent = index === classData.current_period;

                        return (
                            <div key={period} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-primary border-primary text-primary-foreground" :
                                    isCurrent ? "bg-background border-primary text-primary ring-4 ring-primary/20" :
                                        "bg-background border-slate-200 text-slate-400"
                                    }`}>
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                        <span className="font-semibold">{index + 1}</span>
                                    )}
                                </div>
                                <span className={`text-sm font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                                    {period}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Session Control */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Session Control
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Period</p>
                                <p className="text-2xl font-bold text-primary">
                                    {classData.current_period + 1}. {periods[classData.current_period]}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <form action={goBackPeriod}>
                                    <Button
                                        variant="ghost"
                                        disabled={classData.current_period <= 0}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        &larr; Previous Period
                                    </Button>
                                </form>
                                <div className="flex-1" />
                                <form action={advancePeriod}>
                                    <Button
                                        disabled={classData.current_period >= 4}
                                        className="w-full sm:w-auto"
                                    >
                                        Advance to Next Period &rarr;
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Roster */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Student Roster
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form action={inviteStudentToClass} className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
                                <input type="hidden" name="class_id" value={id} />
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="student@example.com"
                                    required
                                    className="flex-1"
                                />
                                <select
                                    name="affiliation"
                                    defaultValue="USA"
                                    className="h-9 rounded-md border bg-background px-3 text-sm min-w-[120px]"
                                >
                                    <option value="USA">🇺🇸 Team USA</option>
                                    <option value="China">🇨🇳 Team China</option>
                                </select>
                                <select
                                    name="interest_block"
                                    defaultValue="Economy"
                                    className="h-9 rounded-md border bg-background px-3 text-sm min-w-[150px]"
                                >
                                    <option value="Economy">Economy</option>
                                    <option value="National Security">National Security</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Environment">Environment</option>
                                </select>
                                <Button type="submit" className="whitespace-nowrap">Invite Student</Button>
                            </form>

                            <div className="rounded-md border overflow-hidden">
                                <div className="grid grid-cols-12 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
                                    <div className="col-span-3">Student</div>
                                    <div className="col-span-2">Affiliation</div>
                                    <div className="col-span-2">Interest Group</div>
                                    <div className="col-span-3">Joined At</div>
                                    <div className="col-span-2">Status</div>
                                </div>
                                {roster.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        No students invited yet.
                                    </div>
                                ) : (
                                    <div>
                                        {roster.map((entry) => (
                                            <div key={entry.email} className="grid grid-cols-12 p-4 text-sm border-t items-center">
                                                <div className="col-span-3">
                                                    <p className="font-medium">{entry.full_name ?? "Pending Account"}</p>
                                                    <p className="text-muted-foreground text-xs">{entry.email}</p>
                                                </div>
                                                <div className="col-span-2">{entry.affiliation}</div>
                                                <div className="col-span-2">{entry.interest_group ?? "-"}</div>
                                                <div className="col-span-3 text-xs text-muted-foreground">
                                                    {entry.joined_at ? new Date(entry.joined_at).toLocaleDateString() : "-"}
                                                </div>
                                                <div className="col-span-2">
                                                    <Badge variant={entry.status === "account_created" ? "default" : "secondary"}>
                                                        {entry.status === "account_created" ? "Enrolled" : "Pending Invite"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline" className="justify-start gap-2" asChild>
                                <Link href={`/instructor/classes/${id}/briefings`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    Upload Briefing
                                </Link>
                            </Button>
                            <Button variant="outline" className="justify-start gap-2" asChild>
                                <Link href={`/instructor/classes/${id}/teams`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    Manage Teams
                                </Link>
                            </Button>
                            <Button variant="outline" className="justify-start gap-2" asChild>
                                <Link href={`/instructor/classes/${id}/items`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
                                    Manage Trade Items
                                </Link>
                            </Button>
                            <Button variant="outline" className="justify-start gap-2" asChild>
                                <Link href={`/instructor/classes/${id}/log`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    View Negotiation Log
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Class Code</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 p-3 bg-slate-200 dark:bg-slate-700 rounded-md border font-mono text-sm">
                                <span className="flex-1 truncate select-all text-slate-900 dark:text-slate-100">{classData.class_code ?? "Unavailable"}</span>
                                <ClassCodeCopyButton code={classData.class_code ?? ""} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


