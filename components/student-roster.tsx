import { inviteStudentToClass } from "@/app/actions/classes";
import { removeStudentFromClass } from "@/app/actions/teams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ClassRosterEntry } from "@/lib/types/domain";

export function StudentRoster({
	classId,
	roster,
}: {
	classId: string;
	roster: ClassRosterEntry[];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-primary"
					>
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					Student Roster
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				<form
					action={inviteStudentToClass}
					className="flex flex-col gap-3 xl:flex-row xl:items-end"
				>
					<input type="hidden" name="class_id" value={classId} />
					<Input
						name="email"
						type="email"
						placeholder="student@example.com"
						required
						className="flex-1"
					/>
					<select
						name="affiliation"
						defaultValue="USA"
						className="h-9 rounded-md border bg-background px-3 text-sm min-w-[140px]"
					>
						<option value="USA">Team USA</option>
						<option value="China">Team PRC</option>
					</select>
					<select
						name="interest_block"
						defaultValue="Economy"
						className="h-9 rounded-md border bg-background px-3 text-sm min-w-[170px]"
					>
						<option value="Economy">Economy</option>
						<option value="National Security">National Security</option>
						<option value="Technology">Technology</option>
						<option value="Environment">Environment</option>
					</select>
					<Button type="submit" className="whitespace-nowrap">
						Invite Student
					</Button>
				</form>

				<div className="rounded-md border overflow-hidden">
					<div className="grid grid-cols-12 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
						<div className="col-span-3">Student</div>
						<div className="col-span-2">Affiliation</div>
						<div className="col-span-3">Interest Group</div>
						<div className="col-span-2">Joined At</div>
						<div className="col-span-1">Status</div>
						{/* <div className="col-span-2 text-right">Actions</div> */}
					</div>
					{roster.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground text-sm">
							No students invited yet.
						</div>
					) : (
						<div>
							{roster.map((entry) => {
								const affiliation =
									entry.affiliation === "China"
										? "PRC"
										: (entry.affiliation ?? "—");
								return (
									<div
										key={entry.email}
										className="grid grid-cols-12 gap-y-1 p-4 text-sm border-t items-center"
									>
										<div className="col-span-3">
											<p className="font-medium">
												{entry.full_name ?? "Pending Account"}
											</p>
											<p className="text-muted-foreground text-xs">
												{entry.email}
											</p>
										</div>
										<div className="col-span-2 text-sm">{affiliation}</div>
										<div className="col-span-3 text-sm text-muted-foreground">
											{entry.interest_group ?? "-"}
										</div>
										<div className="col-span-2 text-xs text-muted-foreground">
											{entry.joined_at
												? new Date(entry.joined_at).toLocaleDateString()
												: "-"}
										</div>
										<div className="col-span-1">
											<Badge
												variant={
													entry.status === "account_created"
														? "default"
														: "secondary"
												}
											>
												{entry.status === "account_created"
													? "Enrolled"
													: "Pending"}
											</Badge>
										</div>
										<div className="col-span-2 text-right">
											<form
												action={async () => {
													"use server";
													await removeStudentFromClass(
														classId,
														entry.email,
														entry.user_id,
													);
												}}
											>
												{/* <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button> */}
											</form>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
