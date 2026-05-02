-- Repair runtime access needed for class creation to seed trade_items.
--
-- Run this against the TEST Supabase project if global_issues has rows
-- but newly-created classes still do not get trade_items.

begin;

grant usage on schema public to anon, authenticated;
grant select on public.global_issues to anon, authenticated;
grant select, insert on public.trade_items to anon, authenticated;
grant select, insert on public.teams to anon, authenticated;

alter table public.global_issues enable row level security;

drop policy if exists "Global issues viewable by anyone." on public.global_issues;
create policy "Global issues viewable by anyone."
	on public.global_issues
	for select
	using (true);

-- These policies should already exist in current schema.sql, but older test
-- projects may be missing one of them after manual prod edits.
drop policy if exists "Teams are viewable by everyone in the class." on public.teams;
create policy "Teams are viewable by everyone in the class."
	on public.teams
	for select
	using (true);

drop policy if exists "Instructors can manage teams." on public.teams;
create policy "Instructors can manage teams."
	on public.teams
	for all
	using (
		exists (
			select 1
			from public.classes
			where classes.id = teams.class_id
				and classes.instructor_id = auth.uid()
		)
	)
	with check (
		exists (
			select 1
			from public.classes
			where classes.id = teams.class_id
				and classes.instructor_id = auth.uid()
		)
	);

drop policy if exists "Instructors can manage trade items." on public.trade_items;
create policy "Instructors can manage trade items."
	on public.trade_items
	for all
	using (
		exists (
			select 1
			from public.classes
			where classes.id = trade_items.class_id
				and classes.instructor_id = auth.uid()
		)
	)
	with check (
		exists (
			select 1
			from public.classes
			where classes.id = trade_items.class_id
				and classes.instructor_id = auth.uid()
		)
	);

commit;

-- Sanity check in the SQL editor:
-- select count(*) as global_issue_count from public.global_issues;
