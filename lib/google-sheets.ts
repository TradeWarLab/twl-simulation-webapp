import { createSign } from "node:crypto";

/**
 * Appends rows to the research Google Sheet as a service account. The Sheet
 * must be shared with GOOGLE_SERVICE_ACCOUNT_EMAIL as an editor. See
 * docs/setup.md.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64url(value: string): string {
	return Buffer.from(value).toString("base64url");
}

/** Exchanges a signed service-account JWT for a short-lived access token. */
async function getAccessToken(email: string, privateKey: string) {
	const now = Math.floor(Date.now() / 1000);
	const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
		JSON.stringify({
			iss: email,
			scope: SHEETS_SCOPE,
			aud: TOKEN_URL,
			iat: now,
			exp: now + 3600,
		}),
	)}`;
	const signature = createSign("RSA-SHA256")
		.update(unsigned)
		.sign(privateKey, "base64url");

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: `${unsigned}.${signature}`,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Google token request failed: ${response.status} ${errorText}`);
	}
	const { access_token } = (await response.json()) as { access_token: string };
	return access_token;
}

/**
 * Appends one row below the last row of the first sheet. Skips with a warning
 * when not configured, the same way invite emails skip without Resend.
 */
export async function appendSheetRow(row: (string | number)[]): Promise<void> {
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
	// Env stores keep the PEM on one line with literal "\n" sequences.
	const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
		/\\n/g,
		"\n",
	);
	const sheetId = process.env.POST_SURVEY_SHEET_ID;

	if (!email || !privateKey || !sheetId) {
		console.warn(
			"Survey Sheet append skipped because GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, or POST_SURVEY_SHEET_ID is not configured.",
		);
		return;
	}

	const token = await getAccessToken(email, privateKey);
	const response = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ values: [row] }),
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Sheet append failed: ${response.status} ${errorText}`);
	}
}
