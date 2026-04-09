"use client";

import { useState, useTransition } from "react";
import { ClassRosterEntry } from "@/lib/types/domain";
import {
	updateStudentTeam,
	updateInviteAffiliation,
	removeStudentFromClass,
} from "@/app/actions/teams";
import { Badge } from "@/components/ui/badge";

export function ManageTeamsClient({
	classId,
	initialRoster,
}: {
	classId: string;
	initialRoster: ClassRosterEntry[];
}) {
	const [roster, setRoster] = useState<ClassRosterEntry[]>(initialRoster);
	const [isPending, startTransition] = useTransition();

	const handleAffiliationChange = async (
		entry: ClassRosterEntry,
		newAffiliation: "USA" | "China",
	) => {
		if (entry.affiliation === newAffiliation) return;

		// Optimistically update
		const previousRoster = [...roster];
		setRoster((r) =>
			r.map((st) =>
				st.email === entry.email ? { ...st, affiliation: newAffiliation } : st,
			),
		);

		// Submit via server action
		startTransition(async () => {
			let res;
			if (entry.status === "account_created" && entry.user_id) {
				res = await updateStudentTeam(classId, entry.user_id, newAffiliation);
			} else {
				res = await updateInviteAffiliation(
					classId,
					entry.email,
					newAffiliation,
				);
			}

			if (res.error) {
				console.error("Rollback", res.error);
				setRoster(previousRoster);
				alert(`Failed to update ${entry.email}: ${res.error}`);
			}
		});
	};

	const handleInterestChange = async (
		entry: ClassRosterEntry,
		newInterest: string,
	) => {
		if (entry.interest_group === newInterest) return;

		// Optimistically update
		const previousRoster = [...roster];
		setRoster((r) =>
			r.map((st) =>
				st.email === entry.email ? { ...st, interest_group: newInterest } : st,
			),
		);

		// Submit via server action
		startTransition(async () => {
			let res;
			if (entry.status === "account_created" && entry.user_id) {
				const { updateStudentInterest } = await import("@/app/actions/teams");
				res = await updateStudentInterest(classId, entry.user_id, newInterest);
			} else {
				const { updateInviteInterest } = await import("@/app/actions/teams");
				res = await updateInviteInterest(classId, entry.email, newInterest);
			}

			if (res.error) {
				console.error("Rollback", res.error);
				setRoster(previousRoster);
				alert(`Failed to update ${entry.email}: ${res.error}`);
			}
		});
	};

	const handleRemoveStudent = async (entry: ClassRosterEntry) => {
		const confirmed = window.confirm(`Remove ${entry.email} from this class?`);
		if (!confirmed) return;

		const previousRoster = [...roster];
		setRoster((r) => r.filter((st) => st.email !== entry.email));

		startTransition(async () => {
			const res = await removeStudentFromClass(
				classId,
				entry.email,
				entry.user_id,
			);
			if (res.error) {
				console.error("Rollback", res.error);
				setRoster(previousRoster);
				alert(`Failed to remove ${entry.email}: ${res.error}`);
			}
		});
	};

	return (
		<div className="rounded-md border overflow-hidden">
			<div className="grid grid-cols-12 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
				<div className="col-span-3">Student</div>
				<div className="col-span-3">Assigned Team</div>
				<div className="col-span-2">Interest Group</div>
				<div className="col-span-2">Status</div>
				<div className="col-span-1 text-right">Joined</div>
				<div className="col-span-1 text-right">Actions</div>
			</div>

			{roster.length === 0 ? (
				<div className="p-8 text-center text-muted-foreground text-sm">
					No students currently enrolled or invited.
				</div>
			) : (
				<div className="divide-y relative">
					{/* Add overlay if loading changes */}
					<div
						className={`absolute inset-0 bg-white/50 z-10 transition-opacity ${isPending ? "opacity-100 pointer-events-none" : "opacity-0 pointer-events-none"}`}
					/>

					{roster.map((entry) => (
						<div
							key={entry.email}
							className={`grid grid-cols-12 p-4 text-sm items-center transition-colors ${entry.affiliation === "USA" ? "hover:bg-blue-50 dark:hover:bg-blue-900/10" : "hover:bg-red-50 dark:hover:bg-red-900/10"}`}
						>
							<div className="col-span-3">
								<p className="font-medium">
									{entry.full_name ?? "Pending Account"}
								</p>
								<p className="text-muted-foreground text-xs">{entry.email}</p>
							</div>

							<div className="col-span-3 pr-4">
								<select
									className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									value={entry.affiliation ?? ""}
									onChange={(e) =>
										handleAffiliationChange(
											entry,
											e.target.value as "USA" | "China",
										)
									}
									disabled={isPending}
								>
									<option value="" disabled>
										Unassigned
									</option>
									<option value="USA">Team USA</option>
									<option value="China">Team PRC</option>
								</select>
							</div>

							<div className="col-span-2 pr-4">
								<select
									className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									value={entry.interest_group ?? "Economy"}
									onChange={(e) => handleInterestChange(entry, e.target.value)}
									disabled={isPending}
								>
									<option value="Economy">Economy</option>
									<option value="National Security">National Security</option>
									<option value="Technology">Technology</option>
									<option value="Environment">Environment</option>
									<option value="Nationalism">Nationalism</option>
								</select>
							</div>

							<div className="col-span-2">
								<Badge
									variant={
										entry.status === "account_created" ? "default" : "secondary"
									}
								>
									{entry.status === "account_created"
										? "Enrolled"
										: "Pending Invite"}
								</Badge>
							</div>

							<div className="col-span-1 text-right text-xs text-muted-foreground">
								{entry.joined_at
									? new Date(entry.joined_at).toLocaleDateString()
									: "-"}
							</div>
							<div className="col-span-1 text-right">
								<button
									type="button"
									onClick={() => handleRemoveStudent(entry)}
									disabled={isPending}
									className="text-xs text-destructive hover:underline disabled:opacity-50"
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
