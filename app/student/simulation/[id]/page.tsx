import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getStudentBriefings } from "@/app/actions/briefings";
import { getRealtimeSnapshot } from "@/app/actions/realtime-snapshot";
import {
	getScoreboard,
	getSimulationAnalytics,
} from "@/app/actions/trade-controller";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NegotiationAnalytics } from "@/components/negotiation/negotiation-analytics";
import { NegotiationController } from "@/components/negotiation/negotiation-controller";
import { TradeItemsPanel } from "@/components/negotiation/trade-items-panel";
import { RealtimeClassProvider } from "@/components/realtime/realtime-class-provider";
import { FinalResults } from "@/components/simulation/final-results";
import { SimulationHeader } from "@/components/simulation/simulation-header";
import { SimulationLayout } from "@/components/simulation/simulation-layout";
import { BriefingPanel } from "@/components/student/briefing-panel";
import { UnassignedState } from "@/components/student/unassigned-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SIMULATION_PERIODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default function SimulationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-4">Loading simulation…</div>
			}
		>
			<SimulationPageInner params={params} />
		</Suspense>
	);
}

async function SimulationPageInner({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

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
		redirect("/student/dashboard");
	}

	const { classes: classData, teams: teamData } = enrollment;
	const teamRecord = Array.isArray(teamData) ? teamData[0] : teamData;
	const classRecord = Array.isArray(classData) ? classData[0] : classData;

	const periods = SIMULATION_PERIODS;

	const snapshot = await getRealtimeSnapshot(id);
	if (!snapshot) redirect("/student/dashboard");

	const teamChannel = `team_${teamRecord?.country?.toLowerCase() || "unassigned"}`;

	const isTradeLocked = classRecord.current_period !== 1;

	// Fetch Student Briefings
	const briefings = teamRecord
		? await getStudentBriefings(
				id,
				teamRecord.country,
				enrollment.interest_block,
			)
		: [];

	// Fetch opponent team info for negotiation
	let opponentTeamId = "";
	let opponentTeamCountry = "";

	if (teamRecord) {
		const { data: opponentTeam } = await supabase
			.from("teams")
			.select("id, country")
			.eq("class_id", id)
			.neq("id", teamRecord.id)
			.single();

		if (opponentTeam) {
			opponentTeamId = opponentTeam.id;
			opponentTeamCountry = opponentTeam.country;
		}
	}

	// Fetch scoreboard for the results phase
	const scores = await getScoreboard(id);

	// Fetch full analytics (reveal) if in phase 3
	let analyticsData = null;
	if (classRecord.current_period === 3) {
		const result = await getSimulationAnalytics(id);
		if (!("error" in result)) {
			analyticsData = result;
		}
	}

	return (
		<RealtimeClassProvider
			classId={id}
			snapshot={snapshot}
			refetchSnapshot={getRealtimeSnapshot}
		>
			<div className="container mx-auto p-2 md:p-4 min-h-screen flex flex-col lg:h-screen lg:max-h-screen">
				<div className="shrink-0">
					<SimulationHeader
						classRecord={classRecord}
						teamRecord={teamRecord}
						interestGroup={enrollment.interest_block}
						periods={periods}
						userEmail={user.email ?? ""}
					/>
				</div>

				{!teamRecord ? (
					<UnassignedState />
				) : classRecord.current_period === 3 ? (
					<main className="flex-1 grid gap-4 min-h-0 grid-cols-1 max-w-4xl mx-auto w-full">
						<Card className="flex flex-col min-h-0 h-[600px] lg:h-auto border-2">
							<CardHeader className="py-3 shrink-0 text-center border-b">
								<CardTitle className="text-xl">
									Simulation Results
								</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0">
								<div className="space-y-12 pb-12">
									<FinalResults scores={scores} />
									{analyticsData && (
										<NegotiationAnalytics data={analyticsData} />
									)}
								</div>
							</CardContent>
						</Card>
					</main>
				) : (
					<SimulationLayout
						leftPanel={
							<BriefingPanel
								briefings={briefings}
								notebooklmUrl={classRecord?.notebooklm_url || null}
							/>
						}
						centerPanel={
							<Card className="flex flex-col min-h-0 h-[600px] lg:h-auto">
								<CardHeader className="py-3 shrink-0">
									<CardTitle className="text-md">
										Action Center
									</CardTitle>
								</CardHeader>
								<CardContent className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0">
									{classRecord.current_period === 0 && (
										<div className="flex items-center justify-center h-full text-muted-foreground">
											Wait for the domestic negotiation phase to start.
										</div>
									)}
									{classRecord.current_period === 1 && teamRecord && (
										<TradeItemsPanel
											classId={id}
											teamId={teamRecord.id}
											isLocked={isTradeLocked}
										/>
									)}
									{classRecord.current_period === 2 && teamRecord && (
										<NegotiationController
											classId={id}
											currentUserId={user.id}
											myTeamId={teamRecord.id}
											opponentTeamId={opponentTeamId}
											myTeamCountry={teamRecord.country}
											opponentTeamCountry={opponentTeamCountry}
										/>
									)}
								</CardContent>
							</Card>
						}
						rightPanel={
							<ChatPanel
								classId={id}
								teamChannel={teamChannel}
								currentUserId={user.id}
								hideGlobal={
									classRecord.current_period === 1 ||
									classRecord.current_period === 0
								}
							/>
						}
					/>
				)}
			</div>
		</RealtimeClassProvider>
	);
}
