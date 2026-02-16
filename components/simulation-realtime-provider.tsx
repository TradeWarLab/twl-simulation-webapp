"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SimulationRealtimeProvider({ classId }: { classId: string }) {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel(`simulation:${classId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "negotiation_actions",
                    filter: `class_id=eq.${classId}`,
                },
                () => {
                    console.log("Negotiation action changed, refreshing...");
                    router.refresh();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "negotiation_bundles",
                    filter: `class_id=eq.${classId}`,
                },
                () => {
                    console.log("Negotiation bundle changed, refreshing...");
                    router.refresh();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "classes",
                    filter: `id=eq.${classId}`,
                },
                () => {
                    console.log("Class state changed (period update), refreshing...");
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, router, classId]);

    return null; // This component renders nothing, just handles subscriptions
}
