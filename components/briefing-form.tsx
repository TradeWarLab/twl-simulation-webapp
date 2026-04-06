"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBriefing } from "@/app/actions/briefings";
import { useState, useTransition } from "react";

export function BriefingForm({ classId }: { classId: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        
        const formData = new FormData(e.currentTarget);
        const formElement = e.currentTarget;

        startTransition(async () => {
            const result = await createBriefing(classId, formData);
            if (result.error) {
                setError(result.error);
            } else {
                formElement.reset();
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload New Briefing</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 text-red-900 border border-red-200 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium">Title</label>
                        <Input id="title" name="title" placeholder="e.g. Q3 Economic Report" required disabled={isPending} />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="target_role" className="text-sm font-medium">Target Audience</label>
                        <select 
                            name="target_role" 
                            required 
                            defaultValue="All" 
                            disabled={isPending}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="All">All Participants</option>
                            <option value="USA">Team USA</option>
                            <option value="China">Team China</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="content" className="text-sm font-medium">Content or Reference URL</label>
                        <textarea 
                            id="content" 
                            name="content" 
                            placeholder="Enter notes, background info, or a link to a Google Doc..." 
                            required 
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isPending}
                        />
                    </div>

                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Uploading..." : "Publish Briefing"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
