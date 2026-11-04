"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPostSurvey } from "@/app/actions/post-survey";
import { Button } from "@/components/ui/button";
import { getSurveyQuestions, SCALE_POINTS } from "@/lib/post-survey";

const SCALE = Array.from({ length: SCALE_POINTS }, (_, index) => index + 1);

/** Shown in place of the results until the student submits it. */
export function PostSurveyForm({
	classId,
	dealReached,
}: {
	classId: string;
	dealReached: boolean;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const questions = getSurveyQuestions(dealReached);

	return (
		<form
			action={(formData) => {
				setError(null);
				startTransition(async () => {
					const result = await submitPostSurvey(classId, formData);
					if (result.error) {
						setError(result.error);
						return;
					}
					router.refresh();
				});
			}}
			className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-10"
		>
			<div className="space-y-1 text-center">
				<h2 className="text-3xl font-semibold tracking-tight text-foreground">
					Before your results
				</h2>
				<p className="text-sm text-muted-foreground">
					Answer these {questions.length} questions to see how the negotiation
					scored. Your answers go to the research team.
				</p>
			</div>

			{questions.map((question, index) => (
				<fieldset key={question.id} className="space-y-3">
					<legend className="text-sm font-medium leading-6 text-foreground">
						{index + 1}. {question.prompt}
					</legend>

					{question.kind === "choice" ? (
						<div className="flex flex-col gap-2">
							{question.options.map((option) => (
								<label
									key={option}
									className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/50"
								>
									<input
										type="radio"
										name={question.id}
										value={option}
										required
									/>
									{option}
								</label>
							))}
						</div>
					) : (
						<div className="space-y-2">
							<div
								className="grid gap-1"
								style={{
									gridTemplateColumns: `repeat(${SCALE_POINTS}, minmax(0, 1fr))`,
								}}
							>
								{SCALE.map((point) => (
									<label
										key={point}
										className="flex cursor-pointer flex-col items-center gap-1 rounded-md border py-2 text-sm tabular-nums has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/50"
									>
										<input
											type="radio"
											name={question.id}
											value={point}
											required
											aria-label={`${point} of ${SCALE_POINTS}`}
										/>
										{point}
									</label>
								))}
							</div>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>1 = {question.low}</span>
								<span>
									{SCALE_POINTS} = {question.high}
								</span>
							</div>
						</div>
					)}
				</fieldset>
			))}

			{error && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					{error}
				</p>
			)}

			<Button type="submit" disabled={isPending} className="self-center px-8">
				{isPending ? "Submitting…" : "Submit and see results"}
			</Button>
		</form>
	);
}
