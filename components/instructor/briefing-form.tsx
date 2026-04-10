"use client";

import { useState, useTransition } from "react";
import { createBriefing } from "@/app/actions/briefings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
						<label htmlFor="title" className="text-sm font-medium">
							Title
						</label>
						<Input
							id="title"
							name="title"
							placeholder="e.g. Q3 Economic Report"
							required
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="target_role" className="text-sm font-medium">
							Target Audience
						</label>
						<select
							name="target_role"
							required
							defaultValue="All"
							disabled={isPending}
							className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="All">All Participants</option>
							<option value="USA">Team USA</option>
							<option value="China">Team PRC</option>
						</select>
					</div>

					<div className="space-y-2">
						<label htmlFor="interest_group" className="text-sm font-medium">
							Target Interest Group
						</label>
						<select
							name="interest_group"
							defaultValue="All"
							disabled={isPending}
							className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="All">All Groups</option>
							<option value="Economy">Economy</option>
							<option value="National Security">National Security</option>
							<option value="Technology">Technology</option>
							<option value="Environment">Environment</option>
							<option value="Nationalism">Nationalism</option>
						</select>
					</div>

					<div className="space-y-2">
						<label htmlFor="content" className="text-sm font-medium">
							Notes & Reference URL
						</label>
						<textarea
							id="content"
							name="content"
							placeholder="Enter notes, background info, or a link to a Google Doc... (Optional if uploading a file)"
							className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="file" className="text-sm font-medium">
							Upload PDF Document
						</label>
						<Input
							id="file"
							name="file"
							type="file"
							accept=".pdf,application/pdf"
							disabled={isPending}
						/>
						<p className="text-xs text-muted-foreground">
							Optional. A PDF file to distribute to the target audience.
						</p>
					</div>

					<Button type="submit" disabled={isPending}>
						{isPending ? "Uploading..." : "Publish Briefing"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
