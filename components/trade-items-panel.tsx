"use client";

import { TradeItem, updateTradeItemValue } from "@/app/actions/trade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useTransition } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function TradeItemsPanel({
    classId,
    initialItems,
    isLocked,
}: {
    classId: string;
    initialItems: TradeItem[];
    isLocked: boolean;
}) {
    const [items, setItems] = useState<TradeItem[]>(initialItems);
    const [isPending, startTransition] = useTransition();

    // Sync state when new props arrive (realtime trigger)
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleValueChange = (itemId: string, newStrValue: string) => {
        // Optimistic update locally
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, value: Number(newStrValue) } : item
            )
        );
    };

    const handleBlurOrSubmit = (itemId: string, newValue: number) => {
        if (isLocked) return;
        
        startTransition(async () => {
            await updateTradeItemValue(itemId, classId, newValue);
        });
    };

    if (items.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground border rounded-md border-dashed">
                <p className="mb-2">No trade items available yet.</p>
                <p className="text-sm">The instructor needs to initialize them.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-md border">
            <div className="p-4 border-b bg-white dark:bg-slate-950 rounded-t-md">
                <h3 className="font-semibold text-sm">Target Trade Values</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    {isLocked 
                        ? "Values are locked during the Negotiation phase." 
                        : "Adjust internal point values for each item. These sync live with your team."}
                </p>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-slate-950 p-3 rounded-lg border shadow-sm">
                            <div className="flex-1">
                                <Label htmlFor={`item-${item.id}`} className="font-medium">
                                    {item.name}
                                </Label>
                            </div>
                            <div className="w-24 relative">
                                <Input
                                    id={`item-${item.id}`}
                                    type="number"
                                    value={item.value}
                                    onChange={(e) => handleValueChange(item.id, e.target.value)}
                                    // Submit to server on blur or Enter key
                                    onBlur={() => handleBlurOrSubmit(item.id, item.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleBlurOrSubmit(item.id, item.value);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    disabled={isLocked || isPending}
                                    className={`text-right ${isLocked ? "bg-muted" : ""}`}
                                />
                                {isPending && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin opacity-50" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
