import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getStudentBriefings } from "@/app/actions/briefings";
import { getMessages } from "@/app/actions/chat";
import {
	getScoreboard,
	getTeamTradeItems,
	getTradeProposals,
} from "@/app/actions/trade-controller";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NegotiationController } from "@/components/negotiation/negotiation-controller";
import { TradeItemsPanel } from "@/components/negotiation/trade-items-panel";
import { FinalResults } from "@/components/simulation/final-results";
import { SimulationHeader } from "@/components/simulation/simulation-header";
import { SimulationRealtimeProvider } from "@/components/simulation/simulation-realtime-provider";
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
		notFound();
	}

	const { classes: classData, teams: teamData } = enrollment;
	const teamRecord = Array.isArray(teamData) ? teamData[0] : teamData;
	const classRecord = Array.isArray(classData) ? classData[0] : classData;

	const periods = SIMULATION_PERIODS;

	// Fetch initial chat messages
	const teamChannel = `team_${teamRecord?.country?.toLowerCase() || "unassigned"}`;
	const initialTeamMessages = await getMessages(id, teamChannel);
	const initialGlobalMessages = await getMessages(id, "global");

	// Fetch initial trade items for my team
	const allTradeItems = teamRecord
		? await getTeamTradeItems(id, teamRecord.id)
		: [];

	// Categorize: Concessions are items I "own" and can give. Asks are items the opponent "owns" and I can request.
	const myTeamItems = allTradeItems.filter((i) => i.role === "concession");
	const opponentTeamItems = allTradeItems.filter((i) => i.role === "ask");

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

	// Fetch trade proposals and scoreboard
	const proposals = await getTradeProposals(id);
	const scores = await getScoreboard(id);

	return (
		<div className="container mx-auto p-2 md:p-4 min-h-screen flex flex-col lg:h-screen lg:max-h-screen">
			<SimulationRealtimeProvider classId={id} />
			<div className="shrink-0">
				<SimulationHeader
					classRecord={classRecord}
					teamRecord={teamRecord}
					periods={periods}
				/>
			</div>

			{!teamRecord ? (
				<UnassignedState />
			) : (
				<main className="flex-1 grid grid-cols-1 lg:grid-cols-[330px_1fr_390px] gap-4 min-h-0">
					{/* Left Panel: Dashboard (Target Values) or Resources */}
					<div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
						<div className="pb-4">
							<BriefingPanel
								briefings={briefings}
								notebooklmUrl={classRecord?.notebooklm_url || null}
							/>
						</div>
					</div>

					{/* Center Panel: Action Center (Negotiation Controller) */}
					<Card className="flex flex-col min-h-0 h-[600px] lg:h-auto">
						<CardHeader className="py-3 shrink-0">
							<CardTitle className="text-md">Action Center</CardTitle>
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
									initialItems={allTradeItems}
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
									myTeamItems={myTeamItems}
									opponentTeamItems={opponentTeamItems}
									initialProposals={proposals}
								/>
							)}
							{classRecord.current_period === 3 && teamRecord && (
								<FinalResults scores={scores} />
							)}
						</CardContent>
					</Card>

					{/* Right Panel: Chat */}
					<div className="flex flex-col min-h-0 h-[600px] lg:h-full pb-4 lg:pb-0">
						<ChatPanel
							classId={id}
							teamChannel={teamChannel}
							initialTeamMessages={initialTeamMessages}
							initialGlobalMessages={initialGlobalMessages}
							currentUserId={user.id}
						/>
					</div>
				</main>
			)}
		</div>
	);
}
