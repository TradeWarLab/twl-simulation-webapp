import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { InstructorGuide } from "@/components/instructor/instructor-guide";
import { PROSE_CLASS } from "@/components/legal/legal-shell";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { createClient } from "@/lib/supabase/server";

export default function InstructionsPage() {
	return (
		<Suspense fallback={<LoadingScreen label="Loading instructions…" />}>
			<InstructionsPageInner />
		</Suspense>
	);
}

async function InstructionsPageInner() {
	await connection();
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/auth/login");

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
			<Link
				href="/instructor/dashboard"
				className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
			>
				← Back to dashboard
			</Link>

			<h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
				Running the simulation
			</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				The full instructor guide.
			</p>

			<div className="mt-8">
				<InstructorGuide />
			</div>

			<div className={`mt-12 ${PROSE_CLASS}`}>
				<h2>Creating a class</h2>
				<p>
					Complete the instructor questionnaire, name the class, and create it.
					The app generates a join code (formatted <code>TWL-XXXXXX</code>) and
					seeds both teams, the full issue list for each team, and the six role
					briefings automatically. The join code appears in Session Control on
					the class page — students enter it either during signup or from their
					dashboard.
				</p>

				<h2>Inviting students</h2>
				<p>
					From the class page, open Roster &amp; Teams. Inviting by email sends
					an onboarding message and lets you pre-assign the student&apos;s
					country and interest group <em>before</em> they create an account —
					when they sign up with the class code, the assignment is already
					waiting. Students who join by code without an invite arrive
					unassigned, and see a &ldquo;Waiting for Assignment&rdquo; screen
					until you place them.
				</p>

				<h2>Assigning teams and roles</h2>
				<p>
					The roster lets you change any student&apos;s country or interest
					group at any time, and filter or sort by either. Changes apply
					immediately. Aim for an even split across the three roles on each
					team.
				</p>

				<h2>Briefings</h2>
				<p>
					Six briefings are seeded per class — one per country per role. Each
					student sees only the briefings addressed to their country and their
					interest group, plus anything addressed to everyone. Review them from
					the Briefings page.
				</p>

				<h2>What students see in each phase</h2>
				<ul>
					<li>
						<strong>Setup</strong> — a holding screen. Team chat is available;
						global chat is not.
					</li>
					<li>
						<strong>Domestic Negotiation</strong> — the issue list with the two
						point budgets. Running totals turn green when asks sum to 100 and
						concessions to -100. Global chat stays closed so teams cannot
						coordinate early.
					</li>
					<li>
						<strong>Bilateral Negotiation</strong> — the shared deal board, and
						global chat opens.
					</li>
					<li>
						<strong>End</strong> — final scores plus both delegations&apos;
						revealed valuations.
					</li>
				</ul>

				<h2>The deal board</h2>
				<p>
					One board, shared live by both teams. Any student can drag an issue
					from their own inventory onto it, and any student can remove anything
					— removal is part of negotiating. Cards are coloured by which country
					would give that item up, so both sides see the same board.
				</p>
				<p>
					When one team calls for a final vote, the other side is notified;
					the vote opens only once <em>both</em> teams have called. Any change to
					the board cancels every outstanding call, so a team cannot agree to a
					deal and then quietly edit it. A team that has called can withdraw
					while waiting.
				</p>
				<p>
					Once the vote opens the board freezes. Ratification is unanimous
					across both teams — a single no wipes the board and negotiation
					restarts from blank. Votes are private: students see turnout while the
					vote is open, and the tally only after it resolves.
				</p>

				<h2>The log and data exports</h2>
				<p>
					The Full Log page shows chat by channel, live value changes, and every
					proposal. Three CSV exports are available: all chat messages, trade
					proposals with vote counts, and the final issue valuations for both
					teams side by side.
				</p>

				<h2>Advancing and ending</h2>
				<p>
					Session Control advances the class one period at a time, and you can
					step back if you advance early. A ratified deal moves the class to End
					on its own — you do not need to advance it. The same button archives
					the class once it reaches End.
				</p>

				<h2>Troubleshooting</h2>
				<ul>
					<li>
						<strong>A student is stuck on &ldquo;Waiting for
						Assignment.&rdquo;</strong> They have joined but have no team.
						Assign them a country from the roster.
					</li>
					<li>
						<strong>A team&apos;s totals don&apos;t reach 100 / -100.</strong>{" "}
						The app shows this but does not block you from advancing. Check both
						teams before leaving Domestic Negotiation.
					</li>
					<li>
						<strong>The class jumped to End by itself.</strong> A deal was
						ratified. That is expected.
					</li>
					<li>
						<strong>A student can&apos;t edit their values.</strong> Editing is
						only open during Domestic Negotiation. Step the class back if it was
						advanced too early.
					</li>
				</ul>
			</div>
		</div>
	);
}
