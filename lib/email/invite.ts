type InviteEmailDetails = {
	to: string;
	className: string;
	classCode: string;
	affiliation: "USA" | "China";
	interestBlock: string | null;
	appUrl: string;
	accountExists: boolean;
	instructorName?: string | null;
};

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function normalizeBaseUrl(appUrl: string) {
	return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}

function getAffiliationLabel(affiliation: "USA" | "China") {
	return affiliation === "China" ? "Team PRC" : "Team USA";
}

function buildInviteEmailHtml({
	className,
	classCode,
	affiliation,
	interestBlock,
	appUrl,
	accountExists,
	instructorName,
}: InviteEmailDetails) {
	const safeClassName = escapeHtml(className);
	const safeClassCode = escapeHtml(classCode);
	const safeAffiliation = escapeHtml(getAffiliationLabel(affiliation));
	const safeInterestBlock = interestBlock
		? escapeHtml(interestBlock)
		: "To be assigned";
	const safeInstructorName = instructorName
		? escapeHtml(instructorName)
		: "Your instructor";
	const safeSignUpUrl = escapeHtml(`${normalizeBaseUrl(appUrl)}/auth/sign-up`);
	const safeLoginUrl = escapeHtml(`${normalizeBaseUrl(appUrl)}/auth/login`);
	const intro = accountExists
		? `${safeInstructorName} added you to <strong>${safeClassName}</strong> in the TWL Simulation platform.`
		: `${safeInstructorName} invited you to join <strong>${safeClassName}</strong> in the TWL Simulation platform.`;
	const stepOne = accountExists
		? `Sign in at <a href="${safeLoginUrl}" style="color:#0a0a0a;text-decoration:underline;">${safeLoginUrl}</a>.`
		: `Create your account at <a href="${safeSignUpUrl}" style="color:#0a0a0a;text-decoration:underline;">${safeSignUpUrl}</a>.`;

	return `
		<div style="margin:0;background:#f6f1e7;padding:32px 16px;color:#0a0a0a;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
				<tr>
					<td align="center">
						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:720px;background:#fff;border:3px solid #0a0a0a;">
							<tr>
								<td style="padding:20px 28px;border-bottom:3px solid #0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#666666;text-align:center;">
									TWL Simulation Invitation
								</td>
							</tr>
							<tr>
								<td style="padding:44px 40px 24px 40px;text-align:center;">
									<div style="font-family:'Palatino Linotype',Palatino,'Times New Roman',serif;font-size:48px;line-height:1.08;letter-spacing:-1px;">
										Modeling<br />Trump's First <em>Trade War.</em>
									</div>
									<div style="width:56px;height:3px;background:#0a0a0a;margin:28px auto 28px auto;"></div>
									<p style="margin:0 auto;max-width:520px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.75;color:#333333;">
										${intro}
									</p>
								</td>
							</tr>
							<tr>
								<td style="padding:0 40px 32px 40px;">
									<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:2px solid #0a0a0a;">
										<tr>
											<td style="padding:16px 18px;border-bottom:2px solid #0a0a0a;background:#faf7f0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
												Setup Snapshot
											</td>
										</tr>
										<tr>
											<td style="padding:18px;">
												<p style="margin:0 0 10px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.7;"><strong>Class:</strong> ${safeClassName}</p>
												<p style="margin:0 0 10px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.7;"><strong>Join code:</strong> ${safeClassCode}</p>
												<p style="margin:0 0 10px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.7;"><strong>Assigned affiliation:</strong> ${safeAffiliation}</p>
												<p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.7;"><strong>Interest group:</strong> ${safeInterestBlock}</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							<tr>
								<td style="padding:0 40px 12px 40px;">
									<div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#666666;">
										How to get set up
									</div>
								</td>
							</tr>
							<tr>
								<td style="padding:0 40px 24px 40px;">
									<ol style="margin:0;padding:0 0 0 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.8;color:#1f1f1f;">
										<li style="margin-bottom:10px;">${stepOne}</li>
										<li style="margin-bottom:10px;">Verify your email address if the platform prompts you to do so.</li>
										<li style="margin-bottom:10px;">After signing in, use the class code <strong>${safeClassCode}</strong> from your student dashboard to join the class.</li>
										<li>Once enrolled, your pre-assigned affiliation and interest group should already be waiting for you.</li>
									</ol>
								</td>
							</tr>
							<tr>
								<td align="center" style="padding:0 40px 40px 40px;">
									<a href="${accountExists ? safeLoginUrl : safeSignUpUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:18px 40px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;">
										${accountExists ? "Sign In" : "Create Account"}
									</a>
								</td>
							</tr>
							<tr>
								<td style="padding:22px 28px;border-top:3px solid #0a0a0a;background:#faf7f0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.7;color:#555555;text-align:center;">
									This invite was sent by the TWL Simulation platform. If you were not expecting it, you can ignore this email.
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</div>
	`;
}

function buildInviteEmailText({
	className,
	classCode,
	affiliation,
	interestBlock,
	appUrl,
	accountExists,
	instructorName,
}: InviteEmailDetails) {
	const signUpUrl = `${normalizeBaseUrl(appUrl)}/auth/sign-up`;
	const loginUrl = `${normalizeBaseUrl(appUrl)}/auth/login`;
	const affiliationLabel = getAffiliationLabel(affiliation);
	const instructor = instructorName ?? "Your instructor";

	return `${instructor} ${accountExists ? "added you to" : "invited you to join"} ${className} in the TWL Simulation platform.

Class: ${className}
Join code: ${classCode}
Assigned affiliation: ${affiliationLabel}
Interest group: ${interestBlock ?? "To be assigned"}

How to get set up:
1. ${accountExists ? `Sign in at ${loginUrl}.` : `Create your account at ${signUpUrl}.`}
2. Verify your email address if prompted.
3. After signing in, enter the class code ${classCode} from your student dashboard.
4. Your pre-assigned affiliation and interest group should be waiting for you once enrolled.
`;
}

export async function sendStudentInviteEmail(details: InviteEmailDetails) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.INVITE_FROM_EMAIL;

	if (!apiKey || !from) {
		console.warn(
			"Invite email skipped because RESEND_API_KEY or INVITE_FROM_EMAIL is not configured.",
		);
		return;
	}

	const replyTo = process.env.INVITE_REPLY_TO_EMAIL;
	const subject = details.accountExists
		? `You have been added to ${details.className}`
		: `You are invited to join ${details.className}`;

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [details.to],
			subject,
			html: buildInviteEmailHtml(details),
			text: buildInviteEmailText(details),
			...(replyTo ? { reply_to: [replyTo] } : {}),
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Invite email failed: ${response.status} ${errorText}`);
	}
}
