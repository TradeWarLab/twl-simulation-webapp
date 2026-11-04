import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendSheetRow } from "@/lib/google-sheets";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function configure(key: string) {
	vi.stubEnv(
		"GOOGLE_SERVICE_ACCOUNT_EMAIL",
		"bot@project.iam.gserviceaccount.com",
	);
	vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", key);
}

describe("appendSheetRow", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("skips without calling Google when not configured", async () => {
		configure(PEM);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		await appendSheetRow(["a"], { id: undefined });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("gets a token, then appends the row to the Sheet", async () => {
		// Stored the way env stores keep it: one line, literal \n.
		configure(PEM.replace(/\n/g, "\\n"));
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "token-1" })),
			)
			.mockResolvedValueOnce(new Response("{}"));

		await appendSheetRow(["2026-11-02", 4], { id: "sheet-123" });

		const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
		expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
		expect(String(tokenInit.body)).toContain("assertion=");

		const [appendUrl, appendInit] = fetchMock.mock.calls[1];
		expect(appendUrl).toContain("/spreadsheets/sheet-123/values/A1:append");
		expect(appendInit.headers.Authorization).toBe("Bearer token-1");
		expect(JSON.parse(appendInit.body)).toEqual({
			values: [["2026-11-02", 4]],
		});
	});

	it("appends to the named tab when one is given", async () => {
		configure(PEM);
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "token-1" })),
			)
			.mockResolvedValueOnce(new Response("{}"));

		await appendSheetRow(["a"], { id: "sheet-123", tab: "App responses" });

		expect(fetchMock.mock.calls[1][0]).toContain(
			`/values/${encodeURIComponent("'App responses'!A1")}:append`,
		);
	});

	it("throws when Google rejects the append", async () => {
		configure(PEM);
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "token-1" })),
			)
			.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

		await expect(appendSheetRow(["a"], { id: "sheet-123" })).rejects.toThrow(/403/);
	});
});
