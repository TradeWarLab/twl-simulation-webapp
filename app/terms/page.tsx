import type { Metadata } from "next";
import {
	LEGAL_CONTACT_EMAIL,
	LegalShell,
} from "@/components/legal/legal-shell";

export const metadata: Metadata = {
	title: "Terms of Use — TWL Simulation",
	description: "Terms of use for the Trade War Lab simulation platform.",
};

export default function TermsPage() {
	return (
		<LegalShell title="Terms of Use">
			<p>
				These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use
				of the Trade War Lab trade negotiation simulation (the
				&ldquo;Platform&rdquo;). By creating an account or using the Platform,
				you agree to these Terms.
			</p>

			<h2>Eligibility and access</h2>
			<p>
				The Platform is provided for participants in an authorized Trade War Lab
				program, internship, or course. You should only create an account if you
				have been invited or directed to do so by a supervisor or instructor.
			</p>

			<h2>Acceptable use</h2>
			<ul>
				<li>
					Use the Platform for its intended educational and research purposes.
				</li>
				<li>
					Be respectful in chat and negotiation. Do not post harassing, hateful,
					or otherwise inappropriate content.
				</li>
				<li>
					Do not attempt to disrupt, reverse-engineer, probe, or gain
					unauthorized access to the Platform, other accounts, or its underlying
					systems.
				</li>
				<li>
					Do not post sensitive personal information (yours or anyone
					else&rsquo;s), such as government IDs, financial details, or
					passwords.
				</li>
			</ul>

			<h2>Your account</h2>
			<p>
				You are responsible for keeping your login credentials secure and for
				activity that occurs under your account. Let your supervisor or
				instructor know promptly if you believe your account has been
				compromised.
			</p>

			<h2>Content and monitoring</h2>
			<p>
				Content you submit (including chat messages and negotiation activity)
				may be viewed and recorded by instructors and Trade War Lab staff, and
				is handled as described in our <a href="/privacy">Privacy Policy</a>.
				Gameplay content may also be visible to other participants as part of
				the simulation.
			</p>

			<h2>No warranty</h2>
			<p>
				The Platform is provided &ldquo;as is&rdquo; for educational purposes,
				without warranties of any kind. We do not guarantee that it will be
				uninterrupted, error-free, or secure.
			</p>

			<h2>Limitation of liability</h2>
			<p>
				To the fullest extent permitted by law, the Trade War Lab and its
				members will not be liable for any indirect, incidental, or
				consequential damages arising from your use of the Platform.
			</p>

			<h2>Changes to these Terms</h2>
			<p>
				We may update these Terms as the program evolves. Continued use of the
				Platform after changes take effect constitutes acceptance of the updated
				Terms. Material changes will be reflected by updating the &ldquo;Last
				updated&rdquo; date above.
			</p>

			<h2>Contact</h2>
			<p>
				Questions about these Terms can be directed to{" "}
				<a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
			</p>
		</LegalShell>
	);
}
