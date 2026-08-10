"use client";

import { useState } from "react";
import { createClass } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	buildIntakeSurveyUrl,
	isIntakeSurveyConfigured,
} from "@/lib/intake-survey";

const DEFAULT_NOTEBOOKLM_URL =
	"https://notebooklm.google.com/notebook/6a4d5fed-304b-4640-b573-ae55edd18d91";

export function CreateClassForm() {
	const [className, setClassName] = useState("");
	const [questionnaireDone, setQuestionnaireDone] = useState(false);

	// When no form is configured we do not gate creation — shipping a broken
	// link and an unsatisfiable checkbox would lock instructors out entirely.
	const gated = isIntakeSurveyConfigured();
	const canSubmit = !gated || questionnaireDone;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Class</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					action={createClass}
					onSubmit={(event) => {
						// `disabled` stops the button, but not a programmatic submit.
						if (!canSubmit) event.preventDefault();
					}}
					className="flex flex-col gap-5"
				>
					<div className="flex flex-col gap-2">
						<Label htmlFor="class-name">Class Name</Label>
						<Input
							id="class-name"
							name="name"
							placeholder="e.g. POLS 170 — Spring 2026"
							value={className}
							onChange={(event) => setClassName(event.target.value)}
							required
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="notebooklm-url">
							NotebookLM URL{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<Input
							id="notebooklm-url"
							name="notebooklm_url"
							type="url"
							defaultValue={DEFAULT_NOTEBOOKLM_URL}
						/>
						<p className="text-xs text-muted-foreground">
							Pre-filled with the default TWL notebook. Replace if using a
							different one.
						</p>
					</div>

					{gated && (
						<div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
							<div>
								<p className="text-sm font-medium">Instructor questionnaire</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Required before each class. Three questions, about 30 seconds
									— your students&apos; course level, your institution type, and
									your region. It helps us understand who the simulation is
									reaching.
								</p>
							</div>
							<a
								href={buildIntakeSurveyUrl(className)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex w-fit items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
							>
								Open questionnaire
								<span aria-hidden="true">↗</span>
							</a>
							<div className="flex items-start gap-2">
								<input
									type="checkbox"
									id="questionnaire-done"
									checked={questionnaireDone}
									onChange={(event) =>
										setQuestionnaireDone(event.target.checked)
									}
									className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
								/>
								<Label
									htmlFor="questionnaire-done"
									className="text-sm font-normal leading-snug"
								>
									I&apos;ve completed the instructor questionnaire
								</Label>
							</div>
						</div>
					)}

					<Button type="submit" className="w-full" disabled={!canSubmit}>
						Create Class
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
