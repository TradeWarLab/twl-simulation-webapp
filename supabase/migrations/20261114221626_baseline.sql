-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  TWL Simulation: baseline migration                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Recreates the public schema of the TEST project (nknmkvjylmzxboflferw) as
-- it was on 2026-11-14. It records the live database, not scripts/schema.sql.
-- Insecure items stay as they are. Fixes come in later migrations. Audit IDs
-- refer to docs/architecture/2026-11-14-architecture-audit.md.
--
-- Do not run this file on a project that already has the schema. Mark it as
-- applied there: supabase migration repair --status applied 20261114221626
--
-- Check: scripts/db/check-drift.mjs compares a database with
-- supabase/schema-fingerprint.json.


-- ──────────────────────────────────────────────
-- 0. Role Permissions
-- ──────────────────────────────────────────────

-- A fresh project can grant more than the test project has (for example to
-- service_role, see auto_expose_new_tables in config.toml). Revoke first, then
-- grant only what the test project has. The app does not use service_role.
revoke all on schema public from public, service_role;
grant usage on schema public to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from postgres, anon, authenticated, service_role;

-- Future tables, sequences and functions automatically get these grants.
-- Audit S1: anon gets read and write on every table. Fix in a later migration.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated;


-- ──────────────────────────────────────────────
-- 1. Users (mirrors auth.users)
-- ──────────────────────────────────────────────

create table public.users (
  id uuid not null,
  full_name text,
  email text,
  role text default 'student'::text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint users_pkey PRIMARY KEY (id),
  constraint users_role_check CHECK ((role = ANY (ARRAY['instructor'::text, 'student'::text]))),
  constraint users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

alter table public.users enable row level security;

-- Audit S1: open to all callers, including anon.
create policy "Public profiles are viewable by everyone."
  on public.users for select
  using (true);

create policy "Users can insert their own profile."
  on public.users for insert
  with check ((auth.uid() = id));

-- Audit S4: no column limit. A user can change their own role and email.
create policy "Users can update own profile."
  on public.users for update
  using ((auth.uid() = id));


-- ──────────────────────────────────────────────
-- 2. Classes
-- ──────────────────────────────────────────────

create table public.classes (
  id uuid not null default gen_random_uuid(),
  instructor_id uuid not null,
  name text not null,
  status text default 'active'::text,
  current_period integer default 0,  -- 0=Setup, 1=Domestic Negotiation, 2=Bilateral Negotiation, 3=End
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  normalized_name text not null,
  class_code text not null,
  notebooklm_url text,  -- Predefined link to NotebookLM resource
  constraint classes_pkey PRIMARY KEY (id),
  constraint classes_class_code_key UNIQUE (class_code),
  constraint classes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text]))),
  constraint classes_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

alter table public.classes enable row level security;

-- Audit S1: open to all callers, including class codes.
create policy "Classes are viewable by everyone."
  on public.classes for select
  using (true);

create policy "Instructors can create classes."
  on public.classes for insert
  with check ((auth.uid() = instructor_id));

create policy "Instructors can update their own classes."
  on public.classes for update
  using ((auth.uid() = instructor_id));


-- ──────────────────────────────────────────────
-- 3. Teams (USA / China per class)
-- ──────────────────────────────────────────────

create table public.teams (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  country text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint teams_pkey PRIMARY KEY (id),
  constraint teams_class_id_country_key UNIQUE (class_id, country),
  constraint teams_country_check CHECK ((country = ANY (ARRAY['USA'::text, 'China'::text]))),
  constraint teams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

alter table public.teams enable row level security;

create policy "Teams are viewable by everyone in the class."
  on public.teams for select
  using (true);

create policy "Instructors can manage teams."
  on public.teams for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = teams.class_id) AND (classes.instructor_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = teams.class_id) AND (classes.instructor_id = auth.uid())))));


-- ──────────────────────────────────────────────
-- 4. Student Enrollment
-- ──────────────────────────────────────────────

create table public.students_classes (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid not null,
  team_id uuid,
  interest_block text,  -- 'Economy', 'National Security', 'Technology', 'Environment', 'Nationalism'
  joined_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint students_classes_pkey PRIMARY KEY (id),
  constraint students_classes_student_id_class_id_key UNIQUE (student_id, class_id),
  constraint students_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint students_classes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  constraint students_classes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.students_classes enable row level security;

-- Audit S1: open to all callers.
create policy "Enrollments are viewable by everyone in the class."
  on public.students_classes for select
  using (true);

-- schema.sql also has "Students can insert their own enrollment." The test
-- project does not. Students enroll through enroll_student().
create policy "Instructors can manage enrollments."
  on public.students_classes for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = students_classes.class_id) AND (classes.instructor_id = auth.uid())))));


-- ──────────────────────────────────────────────
-- 5. Class Invites (pre-signup invitations)
-- ──────────────────────────────────────────────

create table public.class_invites (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  invited_by uuid not null,
  email text not null,
  affiliation text not null,
  interest_block text,
  status text default 'pending'::text,
  invited_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint class_invites_pkey PRIMARY KEY (id),
  constraint class_invites_class_id_email_key UNIQUE (class_id, email),
  constraint class_invites_affiliation_check CHECK ((affiliation = ANY (ARRAY['USA'::text, 'China'::text]))),
  constraint class_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'account_created'::text]))),
  constraint class_invites_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint class_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);

alter table public.class_invites enable row level security;

create policy "Instructors can view invites for their own classes."
  on public.class_invites for select
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = class_invites.class_id) AND (classes.instructor_id = auth.uid())))));

create policy "Instructors can manage invites for their own classes."
  on public.class_invites for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = class_invites.class_id) AND (classes.instructor_id = auth.uid())))));


-- ──────────────────────────────────────────────
-- 6. Briefings (instructor-uploaded documents)
-- ──────────────────────────────────────────────

create table public.briefings (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  title text not null,
  content text,  -- Optional notes / markdown / URL
  target_role text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  interest_group text,  -- e.g. 'Economy', 'National Security', 'Nationalism'
  file_url text,  -- Path to uploaded PDF
  constraint briefings_pkey PRIMARY KEY (id),
  constraint briefings_target_role_check CHECK ((target_role = ANY (ARRAY['USA'::text, 'China'::text, 'All'::text]))),
  constraint briefings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

alter table public.briefings enable row level security;

create policy "Briefings are viewable by target audience."
  on public.briefings for select
  using (true);

create policy "Instructors can manage briefings."
  on public.briefings for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = briefings.class_id) AND (classes.instructor_id = auth.uid())))));


-- ──────────────────────────────────────────────
-- 7. Messages (real-time chat)
-- ──────────────────────────────────────────────

create table public.messages (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  sender_id uuid not null,
  channel text not null,  -- 'global', 'team_usa', 'team_china'
  content text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  client_message_id text,
  constraint messages_pkey PRIMARY KEY (id),
  constraint messages_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);

CREATE INDEX messages_class_channel_created_idx ON public.messages USING btree (class_id, channel, created_at);
CREATE INDEX messages_client_message_id_idx ON public.messages USING btree (client_message_id);
CREATE UNIQUE INDEX messages_client_message_id_unique ON public.messages USING btree (sender_id, client_message_id);

alter table public.messages enable row level security;

-- Audit S1, S2: every channel, including team channels, is open to all callers.
create policy "Messages are viewable by channel members."
  on public.messages for select
  using (true);

create policy "Users can insert messages."
  on public.messages for insert
  with check ((auth.uid() = sender_id));


-- ──────────────────────────────────────────────
-- 8. Global Issues (Fixed simulation issues)
-- ──────────────────────────────────────────────

create table public.global_issues (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  constraint global_issues_pkey PRIMARY KEY (id)
);

alter table public.global_issues enable row level security;

create policy "Global issues viewable by anyone."
  on public.global_issues for select
  using (true);

-- Seed default issues. This is reference data the app needs.
insert into public.global_issues (title) values
  ('The U.S. to lift bans on high technology exports such as integrated circuits and aircraft to China.'),
  ('The U.S. to agree to a more limited approach in defining its export control regime and remove Chinese companies like Huawei from the entities list.'),
  ('The U.S. to give equal treatment to Chinese companies in national security review (CFIUS).'),
  ('The U.S. to reduce tariffs on Chinese imports to 2017 levels.'),
  ('The U.S. to open government procurement to Chinese technology products and services.'),
  ('The U.S. to refrain from restricting visas for Chinese students and professionals.'),
  ('The U.S. to recognize core Chinese national interests: keeping national unity of mainland China and Tibet, Xinjiang, Hong Kong, and Taiwan.'),
  ('The U.S. to recognize core Chinese national interests: sovereignty over South China Sea.'),
  ('The U.S. to agree not to send warships or military personnel to Taiwan.'),
  ('China to remove or reduce investment restrictions identified by the U.S.'),
  ('China to strengthen intellectual property protection.'),
  ('China to increase import of American energy products by $10-20 billion.'),
  ('China to cease subsidies and other forms of assistance that support industries targeted in the MiC 2025 plan and other emerging and strategic industries.'),
  ('China to commit to reduction of the trade deficit between China and the U.S.by $100-200 billion by 2020.'),
  ('China to remove specified non-tariff barriers and recognize that the U.S. may impose import restrictions and tariffs on products in critical sectors.'),
  ('China to help identify and discourage Chinese firms that evade U.S. sanctions against Iran/North Korea.'),
  ('China to guarantee human rights and democracy in Hong Kong'),
  ('China to issue an improved nationwide negative list for foreign investment (especially take measures to liberalize the financial sector).'),
  ('China to increase import of American agricultural products by $20-30 billion.'),
  ('China to cease government-sponsored or tolerated cyber espionage and intrusions into U.S. commercial networks.'),
  ('China to establish a high-level dialogue with the U.S. to discuss dual-use technologies.'),
  ('China to refrain from military development of man-made islands in the South China Sea.'),
  ('China to eliminate laws and regulations, such as licensing or procurement, that treat foreign entities less favorably than domestic Chinese firms.'),
  ('China to eliminate specific policies and practices linked to forced technology transfer.');


-- ──────────────────────────────────────────────
-- 9. Trade Items / Target Values (negotiation inventory)
-- ──────────────────────────────────────────────

create table public.trade_items (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null,
  name text not null,
  value numeric not null default 0,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  issue_id uuid,
  role text,
  is_resolved boolean not null default false,
  constraint trade_items_pkey PRIMARY KEY (id),
  constraint trade_items_class_id_team_id_name_key UNIQUE (class_id, team_id, name),
  constraint trade_items_role_check CHECK ((role = ANY (ARRAY['ask'::text, 'concession'::text]))),
  constraint trade_items_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint trade_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.global_issues(id),
  constraint trade_items_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.trade_items enable row level security;

-- Audit S2: every team's valuations are open to all callers. schema.sql has an
-- own-team policy here ("Trade items viewable by own team or instructor.").
create policy "Trade items viewable by class."
  on public.trade_items for select
  using (true);

-- Editing is open only during Domestic Negotiation (period 1). The run guide
-- states rankings freeze when Round 1 ends; a wider window let students
-- re-score during bilateral talks via a direct API call.
-- Audit S3: no column limit and no with check.
create policy "Teams can update their own trade items."
  on public.trade_items for update
  using (((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.team_id = trade_items.team_id)))) AND (EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = trade_items.class_id) AND (classes.current_period = 1))))));

-- Not in schema.sql. Same test as the next policy, without with check.
create policy "Instructors can insert trade items."
  on public.trade_items for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = trade_items.class_id) AND (classes.instructor_id = auth.uid())))));

create policy "Instructors can manage trade items."
  on public.trade_items for all
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = trade_items.class_id) AND (classes.instructor_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = trade_items.class_id) AND (classes.instructor_id = auth.uid())))));

-- Reveal both sides' valuations once the simulation has ended (End phase).
create policy "Trade items revealed after the simulation ends."
  on public.trade_items for select
  using ((EXISTS ( SELECT 1
   FROM (public.classes c
     JOIN public.students_classes sc ON ((sc.class_id = c.id)))
  WHERE ((c.id = trade_items.class_id) AND (sc.student_id = auth.uid()) AND (c.current_period >= 3)))));


-- ──────────────────────────────────────────────
-- 9. Negotiation Actions (individual asks/concessions)
-- ──────────────────────────────────────────────

-- NOTE: negotiation_actions and negotiation_bundles are no longer written or
-- read by the application. The shared deal board (deal_board_items +
-- deal_ratification_calls + is_package proposals) replaced this v1 flow. The
-- tables are retained because live databases hold historical rows.

create table public.negotiation_actions (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null,
  type text not null,
  status text default 'draft'::text,
  details jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  bundle_id uuid,
  constraint negotiation_actions_pkey PRIMARY KEY (id),
  constraint negotiation_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'draft'::text]))),
  constraint negotiation_actions_type_check CHECK ((type = ANY (ARRAY['ask'::text, 'concession'::text, 'official_request'::text]))),
  constraint negotiation_actions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint negotiation_actions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.negotiation_actions enable row level security;

create policy "Negotiation actions viewable by class."
  on public.negotiation_actions for select
  using (true);

create policy "Teams can manage their own drafts."
  on public.negotiation_actions for all
  using ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.team_id = negotiation_actions.team_id)))));


-- ──────────────────────────────────────────────
-- 10. Negotiation Bundles (grouped proposals)
-- ──────────────────────────────────────────────

create table public.negotiation_bundles (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  proposing_team_id uuid not null,
  status text default 'proposed'::text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint negotiation_bundles_pkey PRIMARY KEY (id),
  constraint negotiation_bundles_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'declined'::text]))),
  constraint negotiation_bundles_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint negotiation_bundles_proposing_team_id_fkey FOREIGN KEY (proposing_team_id) REFERENCES public.teams(id)
);

alter table public.negotiation_bundles enable row level security;

-- Now add the FK from negotiation_actions → negotiation_bundles
alter table public.negotiation_actions
  add constraint negotiation_actions_bundle_id_fkey
  FOREIGN KEY (bundle_id) REFERENCES public.negotiation_bundles(id);


-- ──────────────────────────────────────────────
-- 11. Trade Proposals (formal offer + counter-offer)
-- ──────────────────────────────────────────────

create table public.trade_proposals (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  proposing_team_id uuid not null,
  receiving_team_id uuid not null,
  offered_items jsonb not null,  -- [{item_id, name, value}]
  requested_items jsonb not null,  -- [{item_id, name, value}]
  status text default 'pending'::text,
  created_by uuid not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  is_package boolean not null default false,  -- true = final-deal ratification package (shared deal board)
  constraint trade_proposals_pkey PRIMARY KEY (id),
  constraint trade_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executed'::text]))),
  constraint trade_proposals_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint trade_proposals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  constraint trade_proposals_proposing_team_id_fkey FOREIGN KEY (proposing_team_id) REFERENCES public.teams(id),
  constraint trade_proposals_receiving_team_id_fkey FOREIGN KEY (receiving_team_id) REFERENCES public.teams(id)
);

CREATE UNIQUE INDEX one_pending_package_per_class ON public.trade_proposals USING btree (class_id) WHERE (is_package AND (status = 'pending'::text));

alter table public.trade_proposals enable row level security;

create policy "Trade proposals viewable by class."
  on public.trade_proposals for select
  using (true);

create policy "Team members can create proposals."
  on public.trade_proposals for insert
  with check ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.team_id = trade_proposals.proposing_team_id)))));

-- Audit S3: any class member can update any column of any proposal.
-- schema.sql names this policy "Class members can update proposal status."
create policy "System can update proposal status."
  on public.trade_proposals for update
  using ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = trade_proposals.class_id)))));


-- ──────────────────────────────────────────────
-- 12. Votes (per-student vote on trade proposals)
-- ──────────────────────────────────────────────

create table public.votes (
  id uuid not null default gen_random_uuid(),
  proposal_id uuid not null,
  user_id uuid not null,
  team_id uuid not null,
  vote text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint votes_pkey PRIMARY KEY (id),
  constraint votes_proposal_id_user_id_key UNIQUE (proposal_id, user_id),
  constraint votes_vote_check CHECK ((vote = ANY (ARRAY['approve'::text, 'reject'::text]))),
  constraint votes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.trade_proposals(id),
  constraint votes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  constraint votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

alter table public.votes enable row level security;

create policy "Votes viewable by class members."
  on public.votes for select
  using (true);

-- Audit S3: any signed-in user can vote on any proposal with any team_id.
create policy "Users can cast their own vote."
  on public.votes for insert
  with check ((auth.uid() = user_id));

create policy "Users can update their own vote."
  on public.votes for update
  using ((auth.uid() = user_id));


-- ──────────────────────────────────────────────
-- 13. Team Scores
-- ──────────────────────────────────────────────

create table public.team_scores (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null,
  score numeric not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint team_scores_pkey PRIMARY KEY (id),
  constraint team_scores_class_id_team_id_key UNIQUE (class_id, team_id),
  constraint team_scores_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint team_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.team_scores enable row level security;

create policy "Scores viewable by everyone."
  on public.team_scores for select
  using (true);

-- Audit S3: any class member can insert, update and delete scores.
-- schema.sql names this policy "Class members can manage scores."
create policy "System can manage scores."
  on public.team_scores for all
  using ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = team_scores.class_id)))));


-- ──────────────────────────────────────────────
-- 14. Deal Board Items (live shared proposal board)
-- ──────────────────────────────────────────────
-- trade_items are per-team mirror rows for the same issue (linked by
-- issue_id, name fallback), so the board dedupes by (class_id, name) and
-- denormalizes issue_id/name/giving_team_id at insert time.

create table public.deal_board_items (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  item_id uuid not null,  -- the adder's team's row
  issue_id uuid,
  name text not null,
  giving_team_id uuid not null,  -- team that gives this item
  added_by_team_id uuid not null,
  added_by uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint deal_board_items_pkey PRIMARY KEY (id),
  constraint deal_board_items_class_id_name_key UNIQUE (class_id, name),
  constraint deal_board_items_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id),
  constraint deal_board_items_added_by_team_id_fkey FOREIGN KEY (added_by_team_id) REFERENCES public.teams(id),
  constraint deal_board_items_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint deal_board_items_giving_team_id_fkey FOREIGN KEY (giving_team_id) REFERENCES public.teams(id),
  constraint deal_board_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.trade_items(id)
);

alter table public.deal_board_items enable row level security;

create policy "Deal board viewable by everyone."
  on public.deal_board_items for select
  using (true);

create policy "Class members can add board items."
  on public.deal_board_items for insert
  with check ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = deal_board_items.class_id)))));

create policy "Class members can remove board items."
  on public.deal_board_items for delete
  using ((EXISTS ( SELECT 1
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = deal_board_items.class_id)))));


-- ──────────────────────────────────────────────
-- 15. Deal Ratification Calls (two-team handshake)
-- ──────────────────────────────────────────────

create table public.deal_ratification_calls (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null,
  called_by uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint deal_ratification_calls_pkey PRIMARY KEY (id),
  constraint deal_ratification_calls_class_id_team_id_key UNIQUE (class_id, team_id),
  constraint deal_ratification_calls_called_by_fkey FOREIGN KEY (called_by) REFERENCES public.users(id),
  constraint deal_ratification_calls_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint deal_ratification_calls_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.deal_ratification_calls enable row level security;

create policy "Ratification calls viewable by everyone."
  on public.deal_ratification_calls for select
  using (true);

create policy "Class members can manage ratification calls."
  on public.deal_ratification_calls for all
  using ((team_id IN ( SELECT students_classes.team_id
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = deal_ratification_calls.class_id)))))
  with check ((team_id IN ( SELECT students_classes.team_id
   FROM public.students_classes
  WHERE ((students_classes.student_id = auth.uid()) AND (students_classes.class_id = deal_ratification_calls.class_id)))));

-- REPLICA IDENTITY FULL so realtime DELETE events carry the full old row:
-- otherwise a class_id-filtered subscription drops deletes (removed board items
-- / withdrawn ratification calls wouldn't propagate to other clients).
alter table public.deal_board_items replica identity full;
alter table public.deal_ratification_calls replica identity full;


-- ══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════
-- Function definitions are copied exactly from the test project.
-- Audit S6: no function sets search_path. Fix in a later migration.


-- ──────────────────────────────────────────────
-- handle_new_user: auto-create profile row on signup
-- Also auto-enrolls if a class_code was provided during registration.
-- The test project version does not read class_invites: the student gets no
-- team or interest group here (schema.sql differs).
-- Audit S4: role comes from client-controlled sign-up metadata.
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_class_id uuid;
begin
  insert into public.users (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'student'), new.email);
  
  if new.raw_user_meta_data->>'class_code' is not null then
    select id into v_class_id from public.classes where upper(class_code) = upper(trim(new.raw_user_meta_data->>'class_code'));
    if v_class_id is not null then
      insert into public.students_classes (student_id, class_id)
      values (new.id, v_class_id)
      on conflict do nothing;

      -- Update any pending invite
      update public.class_invites 
      set status = 'account_created' 
      where class_id = v_class_id and lower(email) = lower(new.email);
    end if;
  end if;

  return new;
end;
$function$
;


-- ──────────────────────────────────────────────
-- enroll_student: RPC for post-signup enrollment via class code
-- Respects prior invites for team/interest-group assignment
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enroll_student(p_class_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_class_id uuid;
  v_user_email text;
  v_student_id uuid;
  v_target_team_id uuid;
  v_target_country text;
  v_target_interest text;
begin
  v_student_id := auth.uid();
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_class_id from public.classes 
  where upper(class_code) = upper(trim(p_class_code));
  if v_class_id is null then
    raise exception 'Invalid class code';
  end if;
  -- Verify user isn't already enrolled
  if exists (select 1 from public.students_classes where student_id = v_student_id and class_id = v_class_id) then
    raise exception 'You are already enrolled in this class';
  end if;
  select email into v_user_email from public.users where id = v_student_id;
  -- See if there was a previous invite to get their pre-assigned affiliation and interest block
  select affiliation, interest_block 
  into v_target_country, v_target_interest
  from public.class_invites 
  where class_id = v_class_id and lower(email) = lower(v_user_email)
  order by invited_at desc 
  limit 1;
  -- Find the team ID corresponding to the target country (if any)
  if v_target_country is not null then
    select id into v_target_team_id from public.teams 
    where class_id = v_class_id and country = v_target_country
    limit 1;
  end if;
  insert into public.students_classes (student_id, class_id, team_id, interest_block)
  values (v_student_id, v_class_id, v_target_team_id, v_target_interest);
  update public.class_invites 
  set status = 'account_created' 
  where class_id = v_class_id and lower(email) = lower(v_user_email);
end;
$function$
;


-- ──────────────────────────────────────────────
-- finalize_ratified_package: RPC for resolving a unanimously-approved deal
-- Runs with elevated privileges so it can resolve BOTH teams' trade_items and
-- score both sides (student RLS only exposes a student's own team). Guarded by
-- a unanimous-approval re-check so it can't be abused via a direct RPC call.
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_ratified_package(p_proposal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_class_id uuid;
  v_proposing uuid;
  v_receiving uuid;
  v_is_package boolean;
  v_total int;
  v_votes int;
  v_rejections int;
  v_item_ids uuid[];
begin
  -- Load the still-pending proposal (idempotent: a second call no-ops).
  select class_id, proposing_team_id, receiving_team_id, is_package
    into v_class_id, v_proposing, v_receiving, v_is_package
  from public.trade_proposals
  where id = p_proposal_id and status = 'pending';

  if v_class_id is null then
    return;
  end if;

  -- Caller must be enrolled in this class.
  if not exists (
    select 1 from public.students_classes
    where student_id = auth.uid() and class_id = v_class_id
  ) then
    raise exception 'Not authorized to finalize this deal';
  end if;

  -- Require a completed, unanimous approval before anything is resolved.
  select count(*) into v_total
    from public.students_classes
    where team_id in (v_proposing, v_receiving);
  select count(*) into v_votes
    from public.votes where proposal_id = p_proposal_id;
  select count(*) into v_rejections
    from public.votes where proposal_id = p_proposal_id and vote = 'reject';

  if v_total = 0 or v_votes < v_total or v_rejections > 0 then
    raise exception 'Deal is not unanimously approved';
  end if;

  -- Item ids referenced by the package (each is the adder team's mirror row).
  select array_agg((elem->>'item_id')::uuid)
    into v_item_ids
  from public.trade_proposals p
  cross join lateral jsonb_array_elements(
    coalesce(p.offered_items, '[]'::jsonb) || coalesce(p.requested_items, '[]'::jsonb)
  ) as elem
  where p.id = p_proposal_id and (elem->>'item_id') is not null;

  -- Resolve BOTH teams' mirror rows: match by shared issue_id, and by name for
  -- null-issue custom items.
  update public.trade_items ti
     set is_resolved = true
   where ti.class_id = v_class_id
     and (
       ti.issue_id in (
         select issue_id from public.trade_items
         where id = any(v_item_ids) and issue_id is not null
       )
       or ti.name in (
         select name from public.trade_items
         where id = any(v_item_ids) and issue_id is null
       )
     );

  -- Mark executed.
  update public.trade_proposals set status = 'executed' where id = p_proposal_id;

  -- Recompute each team's score = sum of its OWN value over resolved items.
  insert into public.team_scores (class_id, team_id, score, updated_at)
  select v_class_id, t.id,
         coalesce(sum(ti.value) filter (where ti.is_resolved), 0),
         now()
    from public.teams t
    left join public.trade_items ti
      on ti.team_id = t.id and ti.class_id = v_class_id
   where t.class_id = v_class_id
   group by t.id
  on conflict (class_id, team_id)
    do update set score = excluded.score, updated_at = excluded.updated_at;

  -- Package housekeeping: clear the shared board + calls and end the round by
  -- advancing to the End phase (3). Guarded to the Bilateral phase (2).
  if v_is_package then
    delete from public.deal_board_items where class_id = v_class_id;
    delete from public.deal_ratification_calls where class_id = v_class_id;
    update public.classes set current_period = 3
      where id = v_class_id and current_period = 2;
  end if;
end;
$function$
;

grant execute on function public.finalize_ratified_package(uuid) to authenticated;


-- ──────────────────────────────────────────────
-- end_bilateral_round: RPC for an instructor ending Round 2 by hand.
-- Cancels any open ratification vote, clears the shared board, advances to the
-- End period, and archives, all in one transaction.
--
-- SECURITY DEFINER for the same reason as finalize_ratified_package: every
-- write below is gated on a students_classes row and an instructor has none,
-- so an instructor cannot mark the proposal rejected or clear the board under
-- RLS. Authorization is re-derived from auth.uid() inside the function.
--
-- Atomic because cancelling first broadcasts a `rejected` realtime UPDATE and
-- students would briefly see "the deal was rejected" before the End screen,
-- while advancing first leaves a window for a late ballot to finalize.
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.end_bilateral_round(p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_instructor uuid;
  v_period int;
begin
  select instructor_id, current_period into v_instructor, v_period
  from public.classes where id = p_class_id;

  if v_instructor is null then
    raise exception 'Class not found';
  end if;
  if v_instructor <> auth.uid() then
    raise exception 'Not authorized to end this round';
  end if;

  -- No-op outside the bilateral phase. advancePeriod branches on a
  -- server-render snapshot, so a deal that ratified between render and click
  -- would otherwise have its executed proposal marked rejected and its scores
  -- wiped. Also covers a double-click and a stale second tab.
  if v_period <> 2 then
    return;
  end if;

  -- Without this the proposal stays pending after the round ends, and a late
  -- ballot completing unanimity calls finalize_ratified_package, writing
  -- team_scores and silently turning a declared failure into a scored deal.
  update public.trade_proposals
     set status = 'rejected'
   where class_id = p_class_id and is_package and status = 'pending';

  -- Unconditional: a round can end with items on the board and no vote called.
  delete from public.deal_board_items where class_id = p_class_id;
  delete from public.deal_ratification_calls where class_id = p_class_id;

  update public.classes
     set current_period = 3, status = 'archived'
   where id = p_class_id;
end;
$function$
;

grant execute on function public.end_bilateral_round(uuid) to authenticated;


-- ──────────────────────────────────────────────
-- No-deal cost randomization: each class gets one USA/PRC cost-of-failure
-- combination when it leaves Setup, dealt in shuffled blocks of four.
-- Only the trigger writes; a student reads only their own team's cost.
-- ──────────────────────────────────────────────

-- One row per dealt combination. class_id is null until a class takes it.
create table public.no_deal_cost_slots (
  id bigint generated always as identity,
  usa_cost integer not null,
  china_cost integer not null,
  class_id uuid,
  assigned_at timestamp with time zone,
  constraint no_deal_cost_slots_pkey PRIMARY KEY (id),
  constraint no_deal_cost_slots_class_id_key UNIQUE (class_id),
  constraint no_deal_cost_slots_china_cost_check CHECK ((china_cost <= 0)),
  constraint no_deal_cost_slots_usa_cost_check CHECK ((usa_cost <= 0)),
  constraint no_deal_cost_slots_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL
);

alter table public.no_deal_cost_slots enable row level security;

create policy "Instructors can view their classes' no-deal costs."
  on public.no_deal_cost_slots for select
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = no_deal_cost_slots.class_id) AND (classes.instructor_id = auth.uid())))));

-- Gives the class a combination if it has none. A class keeps its first
-- combination, so a rewind and restart cannot reroll it.
CREATE OR REPLACE FUNCTION public.assign_no_deal_cost(p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_slot bigint;
begin
  -- Serializes assignment, so two classes that start at the same time cannot
  -- take the same slot or both open a new block.
  perform pg_advisory_xact_lock(hashtext('no_deal_cost_slots'));

  if exists (select 1 from public.no_deal_cost_slots where class_id = p_class_id) then
    return;
  end if;

  select id into v_slot from public.no_deal_cost_slots
   where class_id is null order by id limit 1;

  if v_slot is null then
    -- The four combinations, USA cost first. Edit here to change them; a
    -- block already dealt keeps its old values.
    insert into public.no_deal_cost_slots (usa_cost, china_cost)
    select usa_cost, china_cost
      from (values (-10, -10), (0, 0), (0, -10), (-10, -20)) as c(usa_cost, china_cost)
     order by random();

    select id into v_slot from public.no_deal_cost_slots
     where class_id is null order by id limit 1;
  end if;

  update public.no_deal_cost_slots
     set class_id = p_class_id, assigned_at = now()
   where id = v_slot;
end;
$function$
;

-- Internal only. A client that calls it could use up slots and skew the cycle.
revoke execute on function public.assign_no_deal_cost(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_no_deal_cost_on_round_one()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform public.assign_no_deal_cost(new.id);
  return new;
end;
$function$
;

revoke execute on function public.assign_no_deal_cost_on_round_one() from public, anon, authenticated;

-- Fires only when a class leaves Setup. `>= 1`, not `= 1`: updateClassPeriod
-- lets an instructor skip a period. Requiring Setup as the old period keeps a
-- class that was already past Setup before this migration on the old -10,
-- instead of giving it a new cost in the middle of a run.
CREATE TRIGGER on_class_round_one AFTER UPDATE OF current_period ON public.classes FOR EACH ROW WHEN (((COALESCE(old.current_period, 0) = 0) AND (new.current_period >= 1))) EXECUTE FUNCTION public.assign_no_deal_cost_on_round_one();

-- The no-deal costs the caller may see: both for the class instructor, only
-- their own team's for a student, none for anyone else. A class from before
-- this migration has no slot and reads as the old fixed -10.
CREATE OR REPLACE FUNCTION public.get_no_deal_costs(p_class_id uuid)
 RETURNS TABLE(country text, cost integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select t.country,
         case t.country when 'USA' then coalesce(s.usa_cost, -10)
                        else coalesce(s.china_cost, -10) end
    from public.teams t
    left join public.no_deal_cost_slots s on s.class_id = t.class_id
   where t.class_id = p_class_id
     and (
       exists (
         select 1 from public.classes c
         where c.id = p_class_id and c.instructor_id = auth.uid()
       )
       or exists (
         select 1 from public.students_classes sc
         where sc.class_id = p_class_id and sc.student_id = auth.uid()
           and sc.team_id = t.id
       )
     );
$function$
;

grant execute on function public.get_no_deal_costs(uuid) to authenticated;


-- ──────────────────────────────────────────────
-- Post-simulation survey responses: one per student per class, submitted in
-- the End period. A row unlocks the student's results screen.
-- ──────────────────────────────────────────────

create table public.survey_responses (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null,
  team_id uuid not null,
  answers jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint survey_responses_pkey PRIMARY KEY (id),
  constraint survey_responses_class_id_student_id_key UNIQUE (class_id, student_id),
  constraint survey_responses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint survey_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  constraint survey_responses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

alter table public.survey_responses enable row level security;

create policy "Students can view their own survey responses."
  on public.survey_responses for select
  using ((student_id = auth.uid()));

create policy "Instructors can view their classes' survey responses."
  on public.survey_responses for select
  using ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = survey_responses.class_id) AND (classes.instructor_id = auth.uid())))));

-- Only for the student's own team, and only once the simulation has ended.
create policy "Students can submit their own survey response."
  on public.survey_responses for insert
  with check (((student_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.students_classes sc
     JOIN public.classes c ON ((c.id = sc.class_id)))
  WHERE ((sc.class_id = survey_responses.class_id) AND (sc.student_id = auth.uid()) AND (sc.team_id = survey_responses.team_id) AND (c.current_period = 3))))));


-- ──────────────────────────────────────────────
-- Instructor intake survey responses: one per class, submitted with the
-- Create Class form.
-- ──────────────────────────────────────────────

create table public.instructor_survey_responses (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  instructor_id uuid not null,
  answers jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint instructor_survey_responses_pkey PRIMARY KEY (id),
  constraint instructor_survey_responses_class_id_key UNIQUE (class_id),
  constraint instructor_survey_responses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  constraint instructor_survey_responses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

alter table public.instructor_survey_responses enable row level security;

create policy "Instructors can view their own intake responses."
  on public.instructor_survey_responses for select
  using ((instructor_id = auth.uid()));

-- Only for a class the instructor owns.
create policy "Instructors can submit intake responses for their classes."
  on public.instructor_survey_responses for insert
  with check (((instructor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = instructor_survey_responses.class_id) AND (classes.instructor_id = auth.uid()))))));


-- ──────────────────────────────────────────────
-- Trigger: fire handle_new_user on auth signup
-- ──────────────────────────────────────────────

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════
-- Grants on the objects above
-- ══════════════════════════════════════════════
-- The default privileges in section 0 already give these. Set them again
-- explicitly so the result does not depend on how a fresh project exposes new
-- objects.

revoke all on all tables in schema public from anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated;
revoke all on all functions in schema public from service_role;


-- ══════════════════════════════════════════════
-- Supabase Realtime (enable for live subscriptions)
-- ══════════════════════════════════════════════

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.trade_proposals;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.team_scores;
alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.trade_items;
alter publication supabase_realtime add table public.negotiation_actions;
alter publication supabase_realtime add table public.negotiation_bundles;
alter publication supabase_realtime add table public.deal_board_items;
alter publication supabase_realtime add table public.deal_ratification_calls;
