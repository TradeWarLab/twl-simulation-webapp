-- Shared Deal Board (see docs/superpowers/specs/2026-07-04-shared-deal-board-design.md)
-- Run once against the live database. scripts/schema.sql carries the same DDL
-- for fresh installs.

-- ──────────────────────────────────────────────
-- 14. Deal Board Items (live shared proposal board)
-- ──────────────────────────────────────────────
-- trade_items are per-team mirror rows for the same issue (linked by
-- issue_id, name fallback), so the board dedupes by (class_id, name) and
-- denormalizes issue_id/name/giving_team_id at insert time.

create table public.deal_board_items (
	id uuid default gen_random_uuid() primary key,
	class_id uuid references public.classes not null,
	item_id uuid references public.trade_items not null,  -- the adder's team's row
	issue_id uuid,
	name text not null,
	giving_team_id uuid references public.teams not null, -- team that gives this item
	added_by_team_id uuid references public.teams not null,
	added_by uuid references public.users not null,
	created_at timestamptz default now() not null,
	unique(class_id, name)
);

alter table public.deal_board_items enable row level security;

create policy "Deal board viewable by everyone."
	on public.deal_board_items for select using (true);

create policy "Class members can add board items."
	on public.deal_board_items for insert with check (
		exists (
			select 1 from public.students_classes
			where student_id = auth.uid() and class_id = deal_board_items.class_id
		)
	);

create policy "Class members can remove board items."
	on public.deal_board_items for delete using (
		exists (
			select 1 from public.students_classes
			where student_id = auth.uid() and class_id = deal_board_items.class_id
		)
	);

-- ──────────────────────────────────────────────
-- 15. Deal Ratification Calls (two-team handshake)
-- ──────────────────────────────────────────────

create table public.deal_ratification_calls (
	id uuid default gen_random_uuid() primary key,
	class_id uuid references public.classes not null,
	team_id uuid references public.teams not null,
	called_by uuid references public.users not null,
	created_at timestamptz default now() not null,
	unique(class_id, team_id)
);

alter table public.deal_ratification_calls enable row level security;

create policy "Ratification calls viewable by everyone."
	on public.deal_ratification_calls for select using (true);

create policy "Class members can manage ratification calls."
	on public.deal_ratification_calls for all using (
		exists (
			select 1 from public.students_classes
			where student_id = auth.uid() and class_id = deal_ratification_calls.class_id
		)
	) with check (
		exists (
			select 1 from public.students_classes
			where student_id = auth.uid() and class_id = deal_ratification_calls.class_id
		)
	);

-- ──────────────────────────────────────────────
-- trade_proposals: flag ratification packages
-- ──────────────────────────────────────────────

alter table public.trade_proposals
	add column if not exists is_package boolean default false not null;

-- Realtime: skip if the supabase_realtime publication is FOR ALL TABLES
-- (check with: select * from pg_publication where pubname = 'supabase_realtime')
alter publication supabase_realtime add table public.deal_board_items;
alter publication supabase_realtime add table public.deal_ratification_calls;
