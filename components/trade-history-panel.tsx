"use client";

import type { TradeProposal, TeamCountry } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
    history: TradeProposal[];
};

export function TradeHistoryPanel({ history }: Props) {
    if (history.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic p-6">
                No past trades yet
            </div>
        );
    }

    const flagEmoji = (c: TeamCountry) => (c === "USA" ? "🇺🇸" : "🇨🇳");

    return (
        <ScrollArea className="h-full">
            <div className="space-y-2 p-1">
                {history.map((proposal) => {
                    const country = proposal.proposing_team?.country ?? "USA";
                    const isApproved = proposal.status === "approved";

                    return (
                        <div
                            key={proposal.id}
                            className={`
                                rounded-lg border p-3 text-sm transition-colors
                                ${isApproved
                                    ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/10 dark:border-emerald-800/30"
                                    : "bg-red-50/30 border-red-200/30 dark:bg-red-950/10 dark:border-red-800/20"
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{flagEmoji(country)}</span>
                                    <span className="font-medium text-xs">
                                        Team {country}
                                    </span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] capitalize ${
                                        isApproved
                                            ? "text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
                                            : "text-red-700 border-red-300 dark:text-red-400 dark:border-red-700"
                                    }`}
                                >
                                    {isApproved ? "✓ Approved" : "✗ Rejected"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
                                        Offered
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {proposal.offered_items.map((item) => (
                                            <span
                                                key={item.item_id}
                                                className="px-1.5 py-0.5 rounded bg-muted text-[11px]"
                                            >
                                                {item.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
                                        Requested
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {proposal.requested_items.map((item) => (
                                            <span
                                                key={item.item_id}
                                                className="px-1.5 py-0.5 rounded bg-muted text-[11px]"
                                            >
                                                {item.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-[10px] text-muted-foreground mt-1.5">
                                {new Date(proposal.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                {" · "}
                                {(proposal.votes?.length ?? 0)} vote
                                {(proposal.votes?.length ?? 0) !== 1 ? "s" : ""}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
