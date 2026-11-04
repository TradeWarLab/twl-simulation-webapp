"use client";

import { useState } from "react";
import { createClass } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	INSTITUTION_TYPES,
	OUTSIDE_US,
	REGIONS,
	STUDENT_LEVELS,
} from "@/lib/instructor-survey";

const DEFAULT_NOTEBOOKLM_URL =
	"https://notebooklm.google.com/notebook/6a4d5fed-304b-4640-b573-ae55edd18d91";

const OPTION_CLASS =
	"flex cursor-pointer items-start gap-2.5 text-sm leading-snug";
const LEGEND_CLASS = "mb-2 text-sm font-medium";

export function CreateClassForm() {
	const [levelCount, setLevelCount] = useState(0);
	const [institution, setInstitution] = useState("");
	const [region, setRegion] = useState("");

	// A checkbox group has no native `required`, so the button waits for one.
	const canSubmit = levelCount > 0;

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
					// React resets the form after the action. Reset its state too.
					onReset={() => {
						setLevelCount(0);
						setInstitution("");
						setRegion("");
					}}
					className="flex flex-col gap-5"
				>
					<div className="flex flex-col gap-2">
						<Label htmlFor="class-name">Class Name</Label>
						<Input
							id="class-name"
							name="name"
							placeholder="e.g. POLS 170 - Spring 2026"
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

					<div className="flex flex-col gap-5 rounded-lg border border-border bg-muted/30 p-4">
						<div>
							<p className="text-sm font-medium">Instructor questionnaire</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Required for each class. It helps us understand who the
								simulation is reaching.
							</p>
						</div>

						<fieldset>
							<legend className={LEGEND_CLASS}>
								What level of students will be using this simulation?{" "}
								<span className="font-normal text-muted-foreground">
									(select all that apply)
								</span>
							</legend>
							<div className="flex flex-col gap-2">
								{STUDENT_LEVELS.map((level) => (
									<label key={level} className={OPTION_CLASS}>
										<input
											type="checkbox"
											name="student_levels"
											value={level}
											onChange={(event) =>
												setLevelCount(
													(count) => count + (event.target.checked ? 1 : -1),
												)
											}
											className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
										/>
										{level}
									</label>
								))}
							</div>
						</fieldset>

						<fieldset>
							<legend className={LEGEND_CLASS}>
								Which best describes your institution?
							</legend>
							<div className="flex flex-col gap-2">
								{INSTITUTION_TYPES.map((type) => (
									<label key={type} className={OPTION_CLASS}>
										<input
											type="radio"
											name="institution_type"
											value={type}
											required
											onChange={() => setInstitution(type)}
											className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
										/>
										{type}
									</label>
								))}
								{institution === "Other" && (
									<Input
										name="institution_type_other"
										aria-label="Describe your institution"
										maxLength={200}
										required
									/>
								)}
							</div>
						</fieldset>

						<fieldset>
							<legend className={LEGEND_CLASS}>
								Which best describes your institution&apos;s geographic
								region?
							</legend>
							<div className="flex flex-col gap-2">
								{REGIONS.map((option) => (
									<label key={option} className={OPTION_CLASS}>
										<input
											type="radio"
											name="region"
											value={option}
											required
											onChange={() => setRegion(option)}
											className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
										/>
										{option}
									</label>
								))}
							</div>
						</fieldset>

						{region === OUTSIDE_US && (
							<div className="flex flex-col gap-2">
								<Label htmlFor="region-other">
									Where?{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</Label>
								<Input id="region-other" name="region_other" maxLength={200} />
							</div>
						)}

						<div className="flex flex-col gap-2">
							<Label htmlFor="anything-else">
								Anything else you&apos;d like us to know?{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</Label>
							<Input id="anything-else" name="anything_else" maxLength={2000} />
						</div>
					</div>

					<Button type="submit" className="w-full" disabled={!canSubmit}>
						Create Class
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
