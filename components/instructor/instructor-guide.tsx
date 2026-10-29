import {
	DOCUMENTARY_URL,
	INTEREST_GROUPS,
	SIMULATION_PERIODS,
} from "@/lib/constants";

/**
 * The run-the-simulation guide, shared by the instructor dashboard and
 * /instructor/instructions. Period names come from SIMULATION_PERIODS rather
 * than being written out, so the guide cannot drift from the app the way
 * docs/setup.md did.
 *
 * Rendered as one continuous document rather than collapsible sections: an
 * instructor reads this start to finish while setting a class up, and hiding
 * the steps behind dropdowns made them easy to skip.
 */

const ROLE_BLURBS: Record<string, string> = {
	"Pro-Globalization":
		"supports free trade and an integrated global economy",
	"Pro-Decoupling":
		"opposes free trade and wants to protect the home country's economy",
	"Strategic Rivalry":
		"represents national security concerns tied to economic issues, such as the South China Sea",
};

function Section({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-b pb-6 last:border-b-0 last:pb-0">
			<h3 className="text-sm font-semibold text-foreground">
				{title}
				{subtitle && (
					<span className="ml-2 font-normal text-xs text-muted-foreground">
						{subtitle}
					</span>
				)}
			</h3>
			<div className="mt-2 space-y-3 text-sm leading-6 text-muted-foreground">
				{children}
			</div>
		</section>
	);
}

export function InstructorGuide() {
	return (
		<div className="space-y-6 rounded-xl border bg-card p-5 sm:p-6">
			<Section title="Welcome">
				<p>
					Thank you for using our US–China Trade War Simulation. This guide
					walks you through how the simulation is set up and how it runs.
				</p>
				<p>
					The simulation has two 50-minute rounds. We recommend at least a
					10-minute break between them.
				</p>
			</Section>

			<Section
				title={`Assigning roles: before Round 1`}
				subtitle={`${SIMULATION_PERIODS[0]} phase`}
			>
				<p>
					Divide your students into two country teams: Team USA and Team
					China/PRC. Within each team, students take on one of three interest
					group roles:
				</p>
				<ul className="list-disc space-y-1 pl-5">
					{INTEREST_GROUPS.map((group) => (
						<li key={group.value}>
							<strong className="text-foreground">{group.label}:</strong>{" "}
							{ROLE_BLURBS[group.value]}
						</li>
					))}
				</ul>
				<p>
					Please divide students evenly across these three roles on each team,
					since the roles drive how they&apos;ll argue during the simulation.
				</p>
				<p>
					Once roles are assigned, students receive a briefing document for
					their role, including in-depth suggestions on which policy asks and
					concessions matter most to their position. Students also get free
					access to a Google NotebookLM notebook stocked with approved
					resources.
				</p>
				{DOCUMENTARY_URL && (
					<p>
						We also recommend assigning students{" "}
						<a
							href={DOCUMENTARY_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2"
						>
							the documentary that inspired this simulation
						</a>
						.
					</p>
				)}
			</Section>

			<Section
				title="Round 1: internal team negotiation"
				subtitle={`${SIMULATION_PERIODS[1]} phase · 50 minutes`}
			>
				<p>
					Each country team spends 50 minutes negotiating internally. Every
					student receives a position paper and does two things:
				</p>
				<ul className="list-disc space-y-1 pl-5">
					<li>
						Distribute <strong className="text-foreground">100 positive points</strong>{" "}
						across a list of asks. Points show how much a team values each ask.
						A high score (e.g. 70) means that ask is a top priority; a low score
						(e.g. 10) means it matters less, or the team expects to win it
						easily. Asks can be left blank or scored zero, but all positive
						points must add up to 100.
					</li>
					<li>
						Distribute <strong className="text-foreground">-100 points</strong>{" "}
						across a list of concessions. This scale shows how reluctant a team
						is to give up each concession. A score of -100 means they will not
						give it up under any circumstances; a score near -1 or 0 means
						they&apos;re willing to concede it. All points must add up to -100.
					</li>
				</ul>
				<p>
					Once the 50 minutes are up, students cannot change their point
					rankings. All negotiating in Round 2 must follow the priorities they
					set in Round 1.
				</p>
			</Section>

			<Section
				title="Round 2: bilateral negotiation"
				subtitle={`${SIMULATION_PERIODS[2]} phase · 50 minutes`}
			>
				<p>
					Team USA and Team China/PRC negotiate directly with each other for 50
					minutes. Teams do not reveal their Round 1 point rankings to the other
					side. Instead they negotiate as they would in real diplomacy, aiming
					for the best possible deal for their country.
				</p>
				<p>
					For a deal to pass,{" "}
					<strong className="text-foreground">
						every student on both teams must vote yes
					</strong>
					. If even one student votes no, the deal resets and negotiations
					continue.
				</p>
				<p>
					If no deal is reached by the end of 50 minutes, negotiations end in
					failure and each team receives its own{" "}
					<strong className="text-foreground">no-deal cost</strong>. The app
					assigns each class a cost combination at random when Round 1 starts.
					Each team sees only its own cost, and you cannot change it.
				</p>
			</Section>

			<Section
				title="Results"
				subtitle={`${SIMULATION_PERIODS[3]} phase`}
			>
				<p>
					Once a deal is ratified, or you end a deadlocked class, the
					simulation moves to {SIMULATION_PERIODS[3]}. Both delegations&apos;
					valuations are revealed to students, and the final scores are posted.
				</p>
			</Section>
		</div>
	);
}
