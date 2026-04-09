import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getStudentBriefings } from "@/app/actions/briefings";
import { getMessages } from "@/app/actions/chat";
import { getTeamTradeItems } from "@/app/actions/trade";
import {
	getScoreboard,
	getTradeProposals,
} from "@/app/actions/trade-controller";
import { ChatPanel } from "@/components/chat-panel";
import { NegotiationController } from "@/components/negotiation-controller";
import { Scoreboard } from "@/components/scoreboard";
import { SimulationRealtimeProvider } from "@/components/simulation-realtime-provider";
import { TradeItemsPanel } from "@/components/trade-items-panel";
import { Button } from "@/components/ui/button";
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
		<div className="container mx-auto p-4 h-screen flex flex-col">
			<SimulationRealtimeProvider classId={id} />
			<header className="flex justify-between items-center mb-4 pb-4 border-b">
				<div>
					<Link
						href="/student/dashboard"
						className="text-sm text-muted-foreground hover:underline"
					>
						Exit Simulation
					</Link>
					<h1 className="text-2xl font-bold">{classRecord.name}</h1>
				</div>
				<div className="text-center">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						Current Phase
					</div>
					<div className="font-bold text-lg">
						{periods[classRecord.current_period]}
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						My Team
					</div>
					<div
						className={`font-bold text-lg ${teamRecord?.country === "USA" ? "text-blue-600" : "text-red-600"}`}
					>
						{teamRecord?.country || "Unassigned"}
					</div>
				</div>
			</header>

			{!teamRecord ? (
				<main className="flex-1 flex items-center justify-center">
					<Card className="w-full max-w-md p-6 text-center">
						<CardHeader>
							<CardTitle className="text-2xl text-slate-700">
								Waiting for Assignment
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Your instructor has not yet assigned you to a team. Please wait.
							</p>
						</CardContent>
					</Card>
				</main>
			) : (
				<main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
					{/* Left Panel: Scoreboard, Briefing & Trade Items */}
					<div className="h-full flex flex-col gap-4">
						{/* Scoreboard */}
						<Scoreboard initialScores={scores} />

						<Card className="flex-1 flex flex-col min-h-0">
							<CardHeader className="py-3 shrink-0">
								<CardTitle className="text-md">Briefing & Resources</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
								{briefings.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No briefings available yet.
									</p>
								) : (
									briefings.map((b) => (
										<div key={b.id} className="p-3 bg-muted rounded-md text-sm">
											<div className="font-semibold mb-1">{b.title}</div>
											{b.content && (
												<p className="whitespace-pre-wrap text-muted-foreground mb-2">
													{b.content}
												</p>
											)}
											{b.file_url && (
												<Button variant="link" className="p-0 h-auto" asChild>
													<a href={b.file_url} target="_blank" rel="noreferrer">
														View Document
													</a>
												</Button>
											)}
										</div>
									))
								)}
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

					{/* Center Panel: Action Center (Negotiation Controller) */}
					<Card className="md:col-span-1 h-full flex flex-col">
						<CardHeader className="py-3 shrink-0">
							<CardTitle className="text-md">Action Center</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 overflow-y-auto p-3">
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
					<div className="h-full flex flex-col min-h-0">
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
