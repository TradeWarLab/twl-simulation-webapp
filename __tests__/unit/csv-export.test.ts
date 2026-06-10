import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TradeItem, TradeProposal, Vote } from "@/lib/types/domain";

let capturedCsv = "";
let capturedFilename = "";

const mockLink = {
	setAttribute: vi.fn(),
	click: vi.fn(),
};

beforeEach(() => {
	capturedCsv = "";
	capturedFilename = "";
	mockLink.setAttribute.mockReset();
	mockLink.click.mockReset();

	mockLink.setAttribute.mockImplementation((attr: string, value: string) => {
		if (attr === "download") capturedFilename = value;
	});

	vi.stubGlobal(
		"Blob",
		class MockBlob {
			content: string;
			constructor(parts?: BlobPart[]) {
				this.content = (parts?.[0] as string) ?? "";
				capturedCsv = this.content;
			}
		},
	);

	vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
	vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
	vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
});

// Import after mocks are set up
import {
	downloadChatsCsv,
	downloadTradeDataCsv,
	downloadTradeItemValuesCsv,
} from "@/lib/csv-export";

describe("downloadChatsCsv", () => {
	it("generates CSV with correct headers and sorted rows", () => {
		const messages = [
			{
				id: "m2",
				sender_id: "u1",
				channel: "global",
				content: "Hello world",
				created_at: "2026-01-02T00:00:00Z",
				sender: { full_name: "Alice", email: "alice@test.com" },
			},
			{
				id: "m1",
				sender_id: "u2",
				channel: "team_usa",
				content: "First message",
				created_at: "2026-01-01T00:00:00Z",
				sender: { full_name: "Bob", email: "bob@test.com" },
			},
		];

		downloadChatsCsv({ className: "Test Class", messages });

		const lines = capturedCsv.replace(/^﻿/, "").split("\n");
		expect(lines[0]).toContain("Class");
		expect(lines[0]).toContain("Message");
		expect(lines[1]).toContain("First message");
		expect(lines[2]).toContain("Hello world");
		expect(lines[1]).toContain("Team USA");
		expect(lines[2]).toContain("Global");
	});

	it("handles missing sender gracefully", () => {
		const messages = [
			{
				id: "m1",
				sender_id: "u1",
				channel: "team_china",
				content: "No sender",
				created_at: "2026-01-01T00:00:00Z",
				sender: null,
			},
		];

		downloadChatsCsv({ className: "Test", messages });

		const lines = capturedCsv.replace(/^﻿/, "").split("\n");
		expect(lines[1]).toContain("No sender");
		expect(lines[1]).toContain("Team China");
	});

	it("generates a slugified filename", () => {
		downloadChatsCsv({
			className: "POLS 170 Spring 2026",
			messages: [],
		});

		expect(capturedFilename).toMatch(
			/^pols-170-spring-2026-chats-\d{4}-\d{2}-\d{2}\.csv$/,
		);
	});
});

describe("downloadTradeItemValuesCsv", () => {
	it("pairs USA and China items by issue_id", () => {
		const teamById = new Map([
			["t-usa", { country: "USA" as const }],
			["t-china", { country: "China" as const }],
		]);

		const tradeItems: TradeItem[] = [
			{
				id: "i1",
				class_id: "c1",
				team_id: "t-usa",
				issue_id: "issue-1",
				name: "Reduce tariffs",
				value: 30,
				role: "concession",
				is_resolved: false,
				created_at: "",
			},
			{
				id: "i2",
				class_id: "c1",
				team_id: "t-china",
				issue_id: "issue-1",
				name: "Reduce tariffs",
				value: -20,
				role: "ask",
				is_resolved: true,
				created_at: "",
			},
		];

		downloadTradeItemValuesCsv({
			className: "Test",
			tradeItems,
			teamById,
		});

		const lines = capturedCsv.replace(/^﻿/, "").split("\n");
		expect(lines).toHaveLength(2);
		expect(lines[1]).toContain("Reduce tariffs");
		expect(lines[1]).toContain("30");
		expect(lines[1]).toContain("-20");
		expect(lines[1]).toContain("true");
	});

	it("handles items without matching pair", () => {
		const teamById = new Map([["t-usa", { country: "USA" as const }]]);

		const tradeItems: TradeItem[] = [
			{
				id: "i1",
				class_id: "c1",
				team_id: "t-usa",
				issue_id: "issue-1",
				name: "Solo item",
				value: 10,
				role: "ask",
				is_resolved: false,
				created_at: "",
			},
		];

		downloadTradeItemValuesCsv({
			className: "Test",
			tradeItems,
			teamById,
		});

		const lines = capturedCsv.replace(/^﻿/, "").split("\n");
		expect(lines).toHaveLength(2);
		expect(lines[1]).toContain("Solo item");
	});
});

describe("downloadTradeDataCsv", () => {
	it("generates CSV with proposal and vote data", () => {
		const teamById = new Map([
			["t-usa", { country: "USA" as const }],
			["t-china", { country: "China" as const }],
		]);

		const itemById = new Map([
			["item-1", { value: 25, name: "Tariffs" } as TradeItem],
		]);

		const proposals: TradeProposal[] = [
			{
				id: "p1",
				class_id: "c1",
				proposing_team_id: "t-usa",
				receiving_team_id: "t-china",
				offered_items: [{ item_id: "item-1", name: "Tariffs", value: 25 }],
				requested_items: [],
				status: "approved",
				created_by: "u1",
				created_at: "2026-01-01T00:00:00Z",
				creator: { full_name: "Alice" },
			},
		];

		const votes: Vote[] = [
			{
				id: "v1",
				proposal_id: "p1",
				user_id: "u1",
				team_id: "t-usa",
				vote: "approve",
				created_at: "2026-01-01T01:00:00Z",
			},
			{
				id: "v2",
				proposal_id: "p1",
				user_id: "u2",
				team_id: "t-china",
				vote: "reject",
				created_at: "2026-01-01T01:00:00Z",
			},
		];

		downloadTradeDataCsv({
			className: "Test",
			proposals,
			votes,
			itemById,
			teamById,
		});

		const lines = capturedCsv.replace(/^﻿/, "").split("\n");
		expect(lines[0]).toContain("Proposing Team");
		expect(lines[1]).toContain("USA");
		expect(lines[1]).toContain("approved");
		expect(lines[1]).toContain("Alice");
	});
});
