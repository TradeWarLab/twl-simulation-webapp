import type { Metadata } from "next";
import {
	LEGAL_CONTACT_EMAIL,
	LegalShell,
} from "@/components/legal/legal-shell";

export const metadata: Metadata = {
	title: "Privacy Policy — TWL Simulation",
	description:
		"How the Trade War Lab simulation platform collects and uses data.",
};

export default function PrivacyPage() {
	return (
		<LegalShell title="Privacy Policy">
			<p>
				This Privacy Policy explains what information the Trade War Lab trade
				negotiation simulation (the &ldquo;Platform&rdquo;) collects, how it is
				used, and the choices you have. By creating an account or using the
				Platform, you agree to the practices described here.
			</p>

			<h2>Who we are</h2>
			<p>
				The Platform is operated by the Trade War Lab research group to run
				educational U.S.&ndash;China trade negotiation simulations. It is
				currently used as part of a supervised research internship and may later
				be used in university courses.
			</p>

			<h2>Information we collect</h2>
			<ul>
				<li>
					<strong>Account information</strong> you provide when signing up: your
					name and email address. Your password is handled by our authentication
					provider and stored only in hashed form&mdash;we never see it.
				</li>
				<li>
					<strong>Simulation activity</strong> you generate while using the
					Platform: your team and interest-group assignment, chat messages,
					trade item valuations, proposals, votes, and resulting scores.
				</li>
				<li>
					<strong>Basic technical data</strong> needed to operate the site, such
					as session cookies for keeping you logged in.
				</li>
			</ul>

			<h2>How we use your information</h2>
			<ul>
				<li>
					To run the simulation and provide your account and team experience.
				</li>
				<li>
					To allow instructors and program supervisors to monitor and facilitate
					the exercise.
				</li>
				<li>
					For educational and research analysis of negotiation behavior by the
					Trade War Lab.
				</li>
			</ul>

			<h2>Who can see your information</h2>
			<p>
				Instructors and authorized Trade War Lab staff can see the data you
				generate. Within the simulation itself, some information (for example,
				chat messages and items placed on the shared deal board) is visible to
				your teammates and the opposing team as part of gameplay. We do not sell
				your personal information.
			</p>

			<h2>Where data is stored and how long we keep it</h2>
			<p>
				Data is stored using third-party cloud infrastructure (including
				Supabase and Vercel), which may process and store data on servers
				located in the United States. We currently retain simulation and account
				data <strong>indefinitely</strong> so it can be used for ongoing
				educational and research purposes, unless you request deletion (see
				below).
			</p>

			<h2>Your choices</h2>
			<p>
				You may request access to, correction of, or deletion of your personal
				information by contacting us at{" "}
				<a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
				Note that deleting your account may remove your contributions from a
				simulation record.
			</p>

			<h2>Minors</h2>
			<p>
				The Platform may be used by high-school-aged participants. If you are
				under 18, please review this policy with a parent or guardian before
				creating an account. Do not share sensitive personal information (such
				as government IDs, financial information, or health information)
				anywhere on the Platform.
			</p>

			<h2>Changes to this policy</h2>
			<p>
				We may update this policy as the program evolves&mdash;for example, when
				the Platform is adopted into university courses. Material changes will
				be reflected by updating the &ldquo;Last updated&rdquo; date above.
			</p>

			<h2>Contact</h2>
			<p>
				Questions about this policy can be directed to{" "}
				<a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
			</p>
		</LegalShell>
	);
}
