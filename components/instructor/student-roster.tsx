"use client";

import { useMemo, useState } from "react";
import { inviteStudentToClass } from "@/app/actions/classes";
import { removeStudentFromClassAction } from "@/app/actions/teams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INTEREST_GROUPS } from "@/lib/constants";
import type { ClassRosterEntry, TeamCountry } from "@/lib/types/domain";

export function StudentRoster({
	classId,
	roster,
}: {
	classId: string;
	roster: ClassRosterEntry[];
}) {
	const [query, setQuery] = useState("");
	const [countryFilter, setCountryFilter] = useState<"all" | TeamCountry>("all");
	const [groupFilter, setGroupFilter] = useState("all");
	const [sortBy, setSortBy] = useState<
		"name" | "country" | "group" | "status" | "joined"
	>("country");

	const filteredRoster = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const next = roster.filter((entry) => {
			const matchesQuery =
				normalizedQuery.length === 0 ||
				entry.email.toLowerCase().includes(normalizedQuery) ||
				(entry.full_name ?? "").toLowerCase().includes(normalizedQuery);
			const matchesCountry =
				countryFilter === "all" || entry.affiliation === countryFilter;
			const matchesGroup =
				groupFilter === "all" || entry.interest_group === groupFilter;
			return matchesQuery && matchesCountry && matchesGroup;
		});

		next.sort((a, b) => {
			if (sortBy === "country") {
				return (a.affiliation ?? "").localeCompare(b.affiliation ?? "");
			}
			if (sortBy === "group") {
				return (a.interest_group ?? "").localeCompare(b.interest_group ?? "");
			}
			if (sortBy === "status") {
				return a.status.localeCompare(b.status);
			}
			if (sortBy === "joined") {
				return (b.joined_at ?? "").localeCompare(a.joined_at ?? "");
			}
			return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
		});

		return next;
	}, [countryFilter, groupFilter, query, roster, sortBy]);

	return (
		<Card className="border-0 shadow-none bg-transparent">
			<CardHeader className="px-0 pt-0">
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
			<CardContent className="space-y-5 px-0 pb-0">
				<form
					action={inviteStudentToClass}
					className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 xl:grid-cols-[minmax(0,1.2fr)_150px_190px_auto]"
				>
					<input type="hidden" name="class_id" value={classId} />
					<Input
						name="email"
						type="email"
						required
						placeholder="student@example.com"
					/>
					<select
						name="affiliation"
						defaultValue="USA"
						className="h-10 rounded-md border bg-background px-3 text-sm"
					>
						<option value="USA">Team USA</option>
						<option value="China">Team PRC</option>
					</select>
					<select
						name="interest_block"
						defaultValue={INTEREST_GROUPS[0]}
						className="h-10 rounded-md border bg-background px-3 text-sm"
					>
						{INTEREST_GROUPS.map((group) => (
							<option key={group} value={group}>
								{group}
							</option>
						))}
					</select>
					<Button type="submit">Invite Student</Button>
				</form>

				<div className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 md:grid-cols-4">
					<div className="md:col-span-2">
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Filter by name or email"
						/>
					</div>
					<select
						value={countryFilter}
						onChange={(event) =>
							setCountryFilter(event.target.value as "all" | TeamCountry)
						}
						className="h-10 rounded-md border bg-background px-3 text-sm"
					>
						<option value="all">All countries</option>
						<option value="USA">USA</option>
						<option value="China">China</option>
					</select>
					<div className="grid grid-cols-2 gap-3">
						<select
							value={groupFilter}
							onChange={(event) => setGroupFilter(event.target.value)}
							className="h-10 rounded-md border bg-background px-3 text-sm"
						>
							<option value="all">All groups</option>
							{INTEREST_GROUPS.map((group) => (
								<option key={group} value={group}>
									{group}
								</option>
							))}
						</select>
						<select
							value={sortBy}
							onChange={(event) =>
								setSortBy(
									event.target.value as
										| "name"
										| "country"
										| "group"
										| "status"
										| "joined",
								)
							}
							className="h-10 rounded-md border bg-background px-3 text-sm"
						>
							<option value="country">Sort: country</option>
							<option value="group">Sort: group</option>
							<option value="status">Sort: status</option>
							<option value="joined">Sort: joined</option>
							<option value="name">Sort: name</option>
						</select>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-border/70">
					<div className="grid grid-cols-[minmax(210px,1.2fr)_110px_170px_110px_110px_90px] gap-3 border-b bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						<div>Student</div>
						<div>Country</div>
						<div>Interest Group</div>
						<div>Status</div>
						<div>Joined</div>
						<div className="text-right">Action</div>
					</div>
					<ScrollArea className="h-[340px]">
						<div className="divide-y">
							{filteredRoster.length === 0 ? (
								<div className="p-8 text-center text-sm text-muted-foreground">
									No roster entries match the current filters.
								</div>
							) : (
								filteredRoster.map((entry) => {
									const removeAction = removeStudentFromClassAction.bind(
										null,
										classId,
										entry.email,
										entry.user_id,
									);

									return (
										<div
											key={entry.email}
											className="grid grid-cols-[minmax(210px,1.2fr)_110px_170px_110px_110px_90px] gap-3 px-4 py-3 text-sm"
										>
											<div>
												<div className="font-medium">
													{entry.full_name ?? "Pending Account"}
												</div>
												<div className="text-xs text-muted-foreground">
													{entry.email}
												</div>
											</div>
											<div>{entry.affiliation === "China" ? "PRC" : entry.affiliation ?? "—"}</div>
											<div className="text-muted-foreground">
												{entry.interest_group ?? "—"}
											</div>
											<div>
												<Badge
													variant={
														entry.status === "account_created"
															? "default"
															: "secondary"
													}
												>
													{entry.status === "account_created" ? "Enrolled" : "Pending"}
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground">
												{entry.joined_at
													? new Date(entry.joined_at).toLocaleDateString()
													: "—"}
											</div>
											<div className="text-right">
												<form action={removeAction}>
													<Button variant="ghost" size="sm" className="text-destructive">
														Remove
													</Button>
												</form>
											</div>
										</div>
									);
								})
							)}
						</div>
					</ScrollArea>
				</div>
			</CardContent>
		</Card>
	);
}
