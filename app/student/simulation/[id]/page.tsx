import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getStudentBriefings } from "@/app/actions/briefings";
import { getMessages } from "@/app/actions/chat";
import { getTeamTradeItems } from "@/app/actions/trade";
import {
	getScoreboard,
	getTradeProposals,
} from "@/app/actions/trade-controller";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NegotiationController } from "@/components/negotiation/negotiation-controller";
import { TradeItemsPanel } from "@/components/negotiation/trade-items-panel";
import { Scoreboard } from "@/components/simulation/scoreboard";
import { SimulationHeader } from "@/components/simulation/simulation-header";
import { SimulationRealtimeProvider } from "@/components/simulation/simulation-realtime-provider";
import { BriefingPanel } from "@/components/student/briefing-panel";
import { UnassignedState } from "@/components/student/unassigned-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

	const periods = [
		"Setup",
		"Watch Documentary",
		"Debate",
		"Negotiation",
		"Reflection",
	];

	// Fetch initial chat messages
	const teamChannel = `team_${teamRecord?.country?.toLowerCase() || "unassigned"}`;
	const initialTeamMessages = await getMessages(id, teamChannel);
	const initialGlobalMessages = await getMessages(id, "global");

	// Fetch initial trade items for my team
	const tradeItems = teamRecord
		? await getTeamTradeItems(id, teamRecord.id)
		: [];
	const isTradeLocked = classRecord.current_period >= 3;

	// Fetch Student Briefings
	const briefings = teamRecord
		? await getStudentBriefings(
				id,
				teamRecord.country,
				enrollment.interest_block,
			)
		: [];

	// Fetch opponent team info and items for negotiation
	let opponentTeamId = "";
	let opponentTeamCountry = "";
	let opponentTeamItems: Awaited<ReturnType<typeof getTeamTradeItems>> = [];

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
			opponentTeamItems = await getTeamTradeItems(id, opponentTeam.id);
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
				<main className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-4 min-h-0">
					{/* Left Panel: Scoreboard, Briefing & Trade Items */}
					<div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
						{/* Scoreboard */}
						<Scoreboard initialScores={scores} />

						<BriefingPanel briefings={briefings} />

						<div className="flex flex-col flex-shrink-0 pb-4">
							{teamRecord && (
								<TradeItemsPanel
									classId={id}
									initialItems={tradeItems}
									isLocked={isTradeLocked}
								/>
							)}
						</div>
					</div>

					{/* Center Panel: Action Center (Negotiation Controller) */}
					<Card className="flex flex-col min-h-0 h-[600px] lg:h-auto">
						<CardHeader className="py-3 shrink-0">
							<CardTitle className="text-md">Action Center</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0">
							{classRecord.current_period === 1 && (
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Documentary Placeholder
								</div>
							)}
							{classRecord.current_period === 3 && teamRecord && (
								<NegotiationController
									classId={id}
									currentUserId={user.id}
									myTeamId={teamRecord.id}
									opponentTeamId={opponentTeamId}
									myTeamCountry={teamRecord.country}
									opponentTeamCountry={opponentTeamCountry}
									myTeamItems={tradeItems}
									opponentTeamItems={opponentTeamItems}
									initialProposals={proposals}
								/>
							)}
							{classRecord.current_period !== 1 &&
								classRecord.current_period !== 3 && (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										Wait for the next phase.
									</div>
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
