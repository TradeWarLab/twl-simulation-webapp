import type {
	TeamCountry,
	TradeItem,
	TradeProposal,
	Vote,
} from "@/lib/types/domain";

type TeamLookup = Map<string, { country: TeamCountry }>;
type ItemLookup = Map<string, TradeItem>;
type ChatExportMessage = {
	id: string;
	sender_id: string;
	channel: string;
	content: string;
	created_at: string;
	sender: {
		full_name: string | null;
		email: string | null;
	} | null;
};

function escapeCsv(value: string | number | null | undefined) {
	const text = value == null ? "" : String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(
	headers: string[],
	rows: (string | number | null | undefined)[][],
) {
	return [
		headers.map(escapeCsv).join(","),
		...rows.map((row) => row.map(escapeCsv).join(",")),
	].join("\n");
}

function downloadCsv(filename: string, csv: string) {
	const blob = new Blob([`\uFEFF${csv}`], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}

function formatDateForFilename(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

function channelLabel(channel: string) {
	if (channel === "team_usa") return "Team USA";
	if (channel === "team_china") return "Team China";
	if (channel === "global") return "Global";
	return channel;
}

export function downloadChatsCsv({
	className,
	messages,
}: {
	className: string;
	messages: ChatExportMessage[];
}) {
	const rows = messages
		.slice()
		.sort(
			(a, b) =>
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
		)
		.map((message) => [
			className,
			message.id,
			new Date(message.created_at).toISOString(),
			message.channel,
			channelLabel(message.channel),
			message.sender?.full_name ?? "",
			message.sender?.email ?? "",
			message.sender_id,
			message.content,
		]);

	downloadCsv(
		`${slugify(className)}-chats-${formatDateForFilename()}.csv`,
		buildCsv(
			[
				"Class",
				"Message ID",
				"Timestamp",
				"Channel",
				"Chat Perspective",
				"Sender Name",
				"Sender Email",
				"Sender ID",
				"Message",
			],
			rows,
		),
	);
}

// tbh, you can likely delete this. TradeItemValues should have everything we need
export function downloadTradeDataCsv({
	className,
	proposals,
	votes,
	itemById,
	teamById,
}: {
	className: string;
	proposals: TradeProposal[];
	votes: Vote[];
	itemById: ItemLookup;
	teamById: TeamLookup;
}) {
	const rows = proposals
		.slice()
		.sort(
			(a, b) =>
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
		)
		.map((proposal) => {
			const proposalVotes = votes.filter(
				(vote) => vote.proposal_id === proposal.id,
			);
			const approvals = proposalVotes.filter(
				(vote) => vote.vote === "approve",
			).length;
			const rejections = proposalVotes.filter(
				(vote) => vote.vote === "reject",
			).length;
			const formatProposalItems = (
				items:
					| TradeProposal["offered_items"]
					| TradeProposal["requested_items"],
			) =>
				items
					.map((item) => {
						const liveItem = itemById.get(item.item_id);
						const value = Number(liveItem?.value ?? item.value ?? 0);
						return `${item.name} (${value})`;
					})
					.join("; ");

			return [
				className,
				proposal.id,
				new Date(proposal.created_at).toISOString(),
				proposal.status,
				teamById.get(proposal.proposing_team_id)?.country ??
					proposal.proposing_team?.country ??
					"",
				teamById.get(proposal.receiving_team_id)?.country ??
					proposal.receiving_team?.country ??
					"",
				proposal.creator?.full_name ?? "",
				proposal.created_by,
				proposalVotes.length,
				approvals,
				rejections,
				formatProposalItems(proposal.offered_items),
				formatProposalItems(proposal.requested_items),
			];
		});

	downloadCsv(
		`${slugify(className)}-trade-proposals-${formatDateForFilename()}.csv`,
		buildCsv(
			[
				"Class",
				"Proposal ID",
				"Created At",
				"Status",
				"Proposing Team",
				"Receiving Team",
				"Creator Name",
				"Creator ID",
				"Votes Cast",
				"Approve Votes",
				"Reject Votes",
				"Offered Items",
				"Requested Items",
			],
			rows,
		),
	);
}

export function downloadTradeItemValuesCsv({
	className,
	tradeItems,
	teamById,
}: {
	className: string;
	tradeItems: TradeItem[];
	teamById: TeamLookup;
}) {
	const itemsByIssue = new Map<
		string,
		{
			name: string;
			issueId: string;
			usaValue: number | null;
			chinaValue: number | null;
			usaRole: string;
			chinaRole: string;
			resolved: boolean;
		}
	>();

	for (const item of tradeItems) {
		const team = teamById.get(item.team_id)?.country;
		const key = item.issue_id ?? item.name;
		const row = itemsByIssue.get(key) ?? {
			name: item.name,
			issueId: item.issue_id ?? "",
			usaValue: null,
			chinaValue: null,
			usaRole: "",
			chinaRole: "",
			resolved: false,
		};

		if (team === "USA") {
			row.usaValue = Number(item.value);
			row.usaRole = item.role ?? "";
		}
		if (team === "China") {
			row.chinaValue = Number(item.value);
			row.chinaRole = item.role ?? "";
		}
		row.resolved = row.resolved || item.is_resolved;
		itemsByIssue.set(key, row);
	}

	const rows = Array.from(itemsByIssue.values())
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((item) => [
			className,
			item.issueId,
			item.name,
			item.usaValue ?? "",
			item.chinaValue ?? "",
			item.usaRole,
			item.chinaRole,
			item.resolved ? "true" : "false",
		]);

	downloadCsv(
		`${slugify(className)}-trade-item-values-${formatDateForFilename()}.csv`,
		buildCsv(
			[
				"Class",
				"Issue ID",
				"Item Name",
				"USA Final Value",
				"China Final Value",
				"USA Role",
				"China Role",
				"Resolved",
			],
			rows,
		),
	);
}
