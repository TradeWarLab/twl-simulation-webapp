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
		.flatMap((proposal) => {
			const proposalVotes = votes.filter(
				(vote) => vote.proposal_id === proposal.id,
			);
			const approvals = proposalVotes.filter(
				(vote) => vote.vote === "approve",
			).length;
			const rejections = proposalVotes.filter(
				(vote) => vote.vote === "reject",
			).length;
			const base = [
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
			];

			const offeredRows = proposal.offered_items.map((item) => {
				const liveItem = itemById.get(item.item_id);
				return [
					...base,
					"offered",
					item.item_id,
					item.name,
					liveItem?.role ?? "",
					liveItem?.is_resolved ? "true" : "false",
					Number(liveItem?.value ?? item.value ?? 0),
				];
			});

			const requestedRows = proposal.requested_items.map((item) => {
				const liveItem = itemById.get(item.item_id);
				return [
					...base,
					"requested",
					item.item_id,
					item.name,
					liveItem?.role ?? "",
					liveItem?.is_resolved ? "true" : "false",
					Number(liveItem?.value ?? item.value ?? 0),
				];
			});

			if (offeredRows.length === 0 && requestedRows.length === 0) {
				return [[...base, "", "", "", "", "", ""]];
			}

			return [...offeredRows, ...requestedRows];
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
				"Item Side",
				"Item ID",
				"Item Name",
				"Item Role",
				"Item Resolved",
				"Current Item Value",
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
	const rows = tradeItems
		.slice()
		.sort((a, b) => {
			const teamA = teamById.get(a.team_id)?.country ?? "";
			const teamB = teamById.get(b.team_id)?.country ?? "";
			return teamA.localeCompare(teamB) || a.name.localeCompare(b.name);
		})
		.map((item) => [
			className,
			teamById.get(item.team_id)?.country ?? "",
			item.id,
			item.issue_id ?? "",
			item.name,
			item.role ?? "",
			Number(item.value),
			item.is_resolved ? "true" : "false",
			new Date(item.created_at).toISOString(),
		]);

	downloadCsv(
		`${slugify(className)}-trade-item-values-${formatDateForFilename()}.csv`,
		buildCsv(
			[
				"Class",
				"Team",
				"Trade Item ID",
				"Issue ID",
				"Item Name",
				"Role",
				"Current Value",
				"Resolved",
				"Created At",
			],
			rows,
		),
	);
}
