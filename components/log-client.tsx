"use client";

import { LogEvent } from "@/app/actions/log";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function LogClient({ logs, className }: { logs: LogEvent[], className?: string }) {
    
    // Convert current logs to a CSV blob and download
    const handleDownloadCSV = () => {
        let csvContent = "Timestamp,Event Type,Actor,Details,Status\n";

        logs.forEach(log => {
            const date = new Date(log.timestamp).toISOString();
            
            if (log.type === "message") {
                const msg = log.data;
                const actor = msg.sender?.full_name ?? msg.sender?.email ?? "Unknown";
                // Escape quotes and wrap in quotes for CSV
                const details = `[${msg.channel}] ${msg.content}`.replace(/"/g, '""');
                csvContent += `"${date}",Message,"${actor.replace(/"/g, '""')}","${details}",""\n`;
            } else if (log.type === "trade") {
                const trade = log.data;
                const actor = trade.creator?.full_name ?? "System";
                
                // Summarize items
                const offered = trade.offered_items.map(i => `${i.name}(${i.value})`).join(", ");
                const requested = trade.requested_items.map(i => `${i.name}(${i.value})`).join(", ");
                
                const details = `${trade.proposing_team?.country ?? "Unknown"} offered [${offered}] to ${trade.receiving_team?.country ?? "Unknown"} for [${requested}]`.replace(/"/g, '""');
                csvContent += `"${date}",Trade,"${actor.replace(/"/g, '""')}","${details}","${trade.status}"\n`;
            }
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `simulation_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={className}>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Timeline</h2>
                    <p className="text-sm text-muted-foreground">Combined view of all messages and trades ({logs.length} events)</p>
                </div>
                <Button onClick={handleDownloadCSV} size="sm" variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <Card className="bg-muted/30">
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No log events exist for this simulation yet.
                        </CardContent>
                    </Card>
                ) : (
                    logs.map(log => {
                        const isMessage = log.type === "message";
                        
                        if (isMessage) {
                            const msg = log.data;
                            return (
                                <Card key={msg.id} className="opacity-90">
                                    <div className="flex p-4 gap-4 items-start">
                                        <div className="mt-1">
                                            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300">MSG</Badge>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-semibold text-sm">{msg.sender?.full_name ?? msg.sender?.email ?? "Unknown"}</span>
                                                <span className="text-xs text-muted-foreground">to #{msg.channel}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        } else {
                            const trade = log.data;
                            return (
                                <Card key={trade.id} className="border-l-4 border-l-primary shadow-sm bg-blue-50/30 dark:bg-blue-900/10">
                                    <div className="flex p-4 gap-4 items-start">
                                        <div className="mt-1 flex flex-col gap-1 items-center">
                                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white">TRADE</Badge>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-semibold text-sm">{trade.creator?.full_name ?? "System"}</span>
                                                <span className="text-xs text-muted-foreground">
                                                     {trade.proposing_team?.country} ↔ {trade.receiving_team?.country}
                                                </span>
                                                <Badge variant="secondary" className="ml-2 text-[10px] py-0 h-4">
                                                    {trade.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm grid gap-1 mt-2">
                                                <div className="flex gap-2">
                                                    <span className="font-medium">Offered:</span>
                                                    <span className="text-muted-foreground">
                                                        {trade.offered_items.length > 0 ? trade.offered_items.map(i => `${i.name} ($${i.value})`).join(", ") : "Nothing"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="font-medium">Requested:</span>
                                                    <span className="text-muted-foreground">
                                                        {trade.requested_items.length > 0 ? trade.requested_items.map(i => `${i.name} ($${i.value})`).join(", ") : "Nothing"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        }
                    })
                )}
            </div>
        </div>
    );
}
