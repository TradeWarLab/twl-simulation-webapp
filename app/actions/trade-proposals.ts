"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TradeProposal, TradeProposalItem, TradeVote } from "@/lib/types/domain";

export async function createTradeProposal(
    classId: string,
    proposingTeamId: string,
    offeredItems: TradeProposalItem[],
    requestedItems: TradeProposalItem[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    if (offeredItems.length === 0 && requestedItems.length === 0) {
        return { error: "A proposal must include at least one item on either side." };
    }

    const { data, error } = await supabase
        .from("trade_proposals")
        .insert({
            class_id: classId,
            proposing_team_id: proposingTeamId,
            offered_items: offeredItems,
            requested_items: requestedItems,
            status: "pending",
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/student/simulation/${classId}`);
    return { success: true, proposal: data };
}

export async function voteOnProposal(
    proposalId: string,
    classId: string,
    vote: "approve" | "reject"
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Upsert — student can change their vote
    const { error } = await supabase
        .from("trade_votes")
        .upsert(
            {
                proposal_id: proposalId,
                student_id: user.id,
                vote,
            },
            { onConflict: "proposal_id,student_id" }
        );

    if (error) return { error: error.message };

    // Check if all members of the receiving team have voted
    // First, find the proposal to know which team needs to vote
    const { data: proposal } = await supabase
        .from("trade_proposals")
        .select("*, proposing_team:teams!proposing_team_id(*)")
        .eq("id", proposalId)
        .single();

    if (proposal) {
        // Find the receiving team (opposite of proposing team)
        const { data: receivingTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("class_id", proposal.class_id)
            .neq("id", proposal.proposing_team_id)
            .single();

        if (receivingTeam) {
            // Count members of the receiving team
            const { count: teamMemberCount } = await supabase
                .from("students_classes")
                .select("*", { count: "exact", head: true })
                .eq("team_id", receivingTeam.id);

            // Count votes on this proposal from receiving team members
            const { data: votes } = await supabase
                .from("trade_votes")
                .select("*, student:users!student_id(id)")
                .eq("proposal_id", proposalId);

            if (votes && teamMemberCount) {
                // Filter votes to only receiving team members
                const receivingTeamMemberIds = await supabase
                    .from("students_classes")
                    .select("student_id")
                    .eq("team_id", receivingTeam.id);

                const memberIds = new Set(
                    receivingTeamMemberIds.data?.map((m) => m.student_id) ?? []
                );
                const relevantVotes = votes.filter((v) => memberIds.has(v.student_id));

                if (relevantVotes.length >= teamMemberCount) {
                    // All members voted — check for any rejections
                    const hasRejection = relevantVotes.some((v) => v.vote === "reject");
                    const newStatus = hasRejection ? "rejected" : "approved";

                    await supabase
                        .from("trade_proposals")
                        .update({ status: newStatus })
                        .eq("id", proposalId);
                }
            }
        }
    }

    revalidatePath(`/student/simulation/${classId}`);
    return { success: true };
}

export async function getActiveProposals(classId: string): Promise<TradeProposal[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("trade_proposals")
        .select(`
            *,
            proposing_team:teams!proposing_team_id(id, country),
            votes:trade_votes(*, student:users!student_id(full_name))
        `)
        .eq("class_id", classId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching active proposals:", error);
        return [];
    }

    return (data ?? []) as TradeProposal[];
}

export async function getTradeHistory(classId: string): Promise<TradeProposal[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("trade_proposals")
        .select(`
            *,
            proposing_team:teams!proposing_team_id(id, country),
            votes:trade_votes(*, student:users!student_id(full_name))
        `)
        .eq("class_id", classId)
        .in("status", ["approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching trade history:", error);
        return [];
    }

    return (data ?? []) as TradeProposal[];
}

export async function getAllTradeItems(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("trade_items")
        .select("*, team:teams!team_id(id, country)")
        .eq("class_id", classId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching all trade items:", error);
        return [];
    }

    return data ?? [];
}
