-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  TWL Simulation — Master Schema                                    ║
-- ║  Run this against a fresh Supabase project to recreate everything. ║
-- ╚══════════════════════════════════════════════════════════════════════╝


-- ──────────────────────────────────────────────
-- 0. Role Permissions
-- ──────────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Future tables automatically inherit these grants
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;


-- ──────────────────────────────────────────────
-- 1. Users (mirrors auth.users)
-- ──────────────────────────────────────────────

create table public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  email text,
  role text check (role in ('instructor', 'student')) default 'student',
  created_at timestamptz default now() not null
);

alter table public.users enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.users for select using (true);

create policy "Users can insert their own profile."
  on public.users for insert with check (auth.uid() = id);

create policy "Users can update own profile."
  on public.users for update using (auth.uid() = id);


-- ──────────────────────────────────────────────
-- 2. Classes
-- ──────────────────────────────────────────────

create table public.classes (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid references public.users not null,
  name text not null,
  normalized_name text not null,
  class_code text not null unique,
  status text check (status in ('active', 'archived')) default 'active',
  current_period int default 0,  -- 0=Setup, 1=Domestic Negotiation, 2=Bilateral Negotiation, 3=End
  notebooklm_url text, -- Predefined link to NotebookLM resource
  created_at timestamptz default now() not null
);

alter table public.classes enable row level security;

create policy "Classes are viewable by everyone."
  on public.classes for select using (true);

create policy "Instructors can create classes."
  on public.classes for insert with check (auth.uid() = instructor_id);

create policy "Instructors can update their own classes."
  on public.classes for update using (auth.uid() = instructor_id);


-- ──────────────────────────────────────────────
-- 3. Teams (USA / China per class)
-- ──────────────────────────────────────────────

create table public.teams (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  country text check (country in ('USA', 'China')) not null,
  created_at timestamptz default now() not null,
  unique(class_id, country)
);

alter table public.teams enable row level security;

create policy "Teams are viewable by everyone in the class."
  on public.teams for select using (true);

create policy "Instructors can manage teams."
  on public.teams for all using (
    exists (
      select 1 from public.classes
      where id = teams.class_id and instructor_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────
-- 4. Student Enrollment
-- ──────────────────────────────────────────────

create table public.students_classes (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.users not null,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams,
  interest_block text,  -- 'Economy', 'National Security', 'Technology', 'Environment', 'Nationalism'
  joined_at timestamptz default now() not null,
  unique(student_id, class_id)
);

alter table public.students_classes enable row level security;

create policy "Enrollments are viewable by everyone in the class."
  on public.students_classes for select using (true);

create policy "Students can insert their own enrollment."
  on public.students_classes for insert with check (auth.uid() = student_id);

create policy "Instructors can manage enrollments."
  on public.students_classes for all using (
    exists (
      select 1 from public.classes
      where id = students_classes.class_id and instructor_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────
-- 5. Class Invites (pre-signup invitations)
-- ──────────────────────────────────────────────

create table public.class_invites (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  invited_by uuid references public.users not null,
  email text not null,
  affiliation text check (affiliation in ('USA', 'China')) not null,
  interest_block text,
  status text check (status in ('pending', 'account_created')) default 'pending',
  invited_at timestamptz default now() not null,
  unique(class_id, email)
);

alter table public.class_invites enable row level security;

create policy "Instructors can view invites for their own classes."
  on public.class_invites for select using (
    exists (
      select 1 from public.classes
      where id = class_invites.class_id and instructor_id = auth.uid()
    )
  );

create policy "Instructors can manage invites for their own classes."
  on public.class_invites for all using (
    exists (
      select 1 from public.classes
      where id = class_invites.class_id and instructor_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────
-- 6. Briefings (instructor-uploaded documents)
-- ──────────────────────────────────────────────

create table public.briefings (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  title text not null,
  content text,             -- Optional notes / markdown / URL
  file_url text,            -- Path to uploaded PDF
  target_role text check (target_role in ('USA', 'China', 'All')),
  interest_group text,      -- e.g. 'Economy', 'National Security', 'Nationalism'
  created_at timestamptz default now() not null
);

alter table public.briefings enable row level security;

create policy "Briefings are viewable by target audience."
  on public.briefings for select using (true);

create policy "Instructors can manage briefings."
  on public.briefings for all using (
    exists (
      select 1 from public.classes
      where id = briefings.class_id and instructor_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────
-- 7. Messages (real-time chat)
-- ──────────────────────────────────────────────

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  sender_id uuid references public.users not null,
  channel text not null,  -- 'global', 'team_usa', 'team_china'
  content text not null,
  client_message_id text,
  created_at timestamptz default now() not null
);

create index messages_class_channel_created_idx on public.messages (class_id, channel, created_at desc);
create unique index messages_client_message_id_unique on public.messages (sender_id, client_message_id);

alter table public.messages enable row level security;

create policy "Messages are viewable by channel members."
  on public.messages for select using (true);

create policy "Users can insert messages."
  on public.messages for insert with check (auth.uid() = sender_id);


-- ──────────────────────────────────────────────
-- 8. Global Issues (Fixed simulation issues)
-- ──────────────────────────────────────────────

create table public.global_issues (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamptz default now() not null
);

alter table public.global_issues enable row level security;

create policy "Global issues viewable by anyone."
  on public.global_issues for select using (true);

-- Seed default issues
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
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams not null,
  issue_id uuid references public.global_issues,
  name text not null,
  value numeric default 0 not null,
  role text check (role in ('ask', 'concession')),
  is_resolved boolean default false not null,
  created_at timestamptz default now() not null,
  unique(class_id, team_id, name)
);

alter table public.trade_items enable row level security;

create policy "Trade items viewable by own team or instructor."
  on public.trade_items for select using (
    (exists (select 1 from public.students_classes where student_id = auth.uid() and team_id = trade_items.team_id))
    or
    (exists (select 1 from public.classes where id = trade_items.class_id and instructor_id = auth.uid()))
  );

create policy "Teams can update their own trade items."
  on public.trade_items for update using (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and team_id = trade_items.team_id
    )
    and exists (
      select 1 from public.classes
      where id = trade_items.class_id and current_period < 3
    )
  );

create policy "Instructors can manage trade items."
  on public.trade_items for all using (
    exists (
      select 1 from public.classes
      where id = trade_items.class_id and instructor_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────
-- 9. Negotiation Actions (individual asks/concessions)
-- ──────────────────────────────────────────────

create table public.negotiation_actions (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams not null,
  type text check (type in ('ask', 'concession', 'official_request')) not null,
  status text check (status in ('pending', 'accepted', 'declined', 'draft')) default 'draft',
  details jsonb,
  bundle_id uuid,  -- FK added after negotiation_bundles is created
  created_at timestamptz default now() not null
);

alter table public.negotiation_actions enable row level security;

create policy "Negotiation actions viewable by class."
  on public.negotiation_actions for select using (true);

create policy "Teams can manage their own drafts."
  on public.negotiation_actions for all using (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and team_id = negotiation_actions.team_id
    )
  );


-- ──────────────────────────────────────────────
-- 10. Negotiation Bundles (grouped proposals)
-- ──────────────────────────────────────────────

create table public.negotiation_bundles (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  proposing_team_id uuid references public.teams not null,
  status text check (status in ('proposed', 'accepted', 'declined')) default 'proposed',
  created_at timestamptz default now() not null
);

alter table public.negotiation_bundles enable row level security;

-- Now add the FK from negotiation_actions → negotiation_bundles
alter table public.negotiation_actions
  add constraint negotiation_actions_bundle_id_fkey
  foreign key (bundle_id) references public.negotiation_bundles(id);


-- ──────────────────────────────────────────────
-- 11. Trade Proposals (formal offer + counter-offer)
-- ──────────────────────────────────────────────

create table public.trade_proposals (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  proposing_team_id uuid references public.teams not null,
  receiving_team_id uuid references public.teams not null,
  offered_items jsonb not null,     -- [{item_id, name, value}]
  requested_items jsonb not null,   -- [{item_id, name, value}]
  status text check (status in ('pending', 'approved', 'rejected', 'executed')) default 'pending',
  created_by uuid references public.users not null,
  created_at timestamptz default now() not null
);

alter table public.trade_proposals enable row level security;

create policy "Trade proposals viewable by class."
  on public.trade_proposals for select using (true);

create policy "Team members can create proposals."
  on public.trade_proposals for insert with check (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and team_id = trade_proposals.proposing_team_id
    )
  );

create policy "Class members can update proposal status."
  on public.trade_proposals for update using (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and class_id = trade_proposals.class_id
    )
  );


-- ──────────────────────────────────────────────
-- 12. Votes (per-student vote on trade proposals)
-- ──────────────────────────────────────────────

create table public.votes (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references public.trade_proposals not null,
  user_id uuid references public.users not null,
  team_id uuid references public.teams not null,
  vote text check (vote in ('approve', 'reject')) not null,
  created_at timestamptz default now() not null,
  unique(proposal_id, user_id)
);

alter table public.votes enable row level security;

create policy "Votes viewable by class members."
  on public.votes for select using (true);

create policy "Users can cast their own vote."
  on public.votes for insert with check (auth.uid() = user_id);

create policy "Users can update their own vote."
  on public.votes for update using (auth.uid() = user_id);


-- ──────────────────────────────────────────────
-- 13. Team Scores
-- ──────────────────────────────────────────────

create table public.team_scores (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams not null,
  score numeric default 0 not null,
  updated_at timestamptz default now() not null,
  unique(class_id, team_id)
);

alter table public.team_scores enable row level security;

create policy "Scores viewable by everyone."
  on public.team_scores for select using (true);

create policy "Class members can manage scores."
  on public.team_scores for all using (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and class_id = team_scores.class_id
    )
  );


-- ══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════


-- ──────────────────────────────────────────────
-- handle_new_user: auto-create profile row on signup
-- Also auto-enrolls if a class_code was provided during registration
-- ──────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_class_id uuid;
  v_target_team_id uuid;
  v_target_country text;
  v_target_interest text;
begin
  -- Create the public.users row
  insert into public.users (id, full_name, role, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.email
  );

  -- If a class_code was passed at signup, auto-enroll
  if new.raw_user_meta_data->>'class_code' is not null then
    select id into v_class_id
    from public.classes
    where upper(class_code) = upper(trim(new.raw_user_meta_data->>'class_code'));

    if v_class_id is not null then
      -- Check for a matching invite to inherit team/interest
      select affiliation, interest_block
      into v_target_country, v_target_interest
      from public.class_invites
      where class_id = v_class_id and lower(email) = lower(new.email)
      order by invited_at desc
      limit 1;

      if v_target_country is not null then
        select id into v_target_team_id
        from public.teams
        where class_id = v_class_id and country = v_target_country
        limit 1;
      end if;

      insert into public.students_classes (student_id, class_id, team_id, interest_block)
      values (new.id, v_class_id, v_target_team_id, v_target_interest)
      on conflict do nothing;

      update public.class_invites
      set status = 'account_created'
      where class_id = v_class_id and lower(email) = lower(new.email);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;


-- ──────────────────────────────────────────────
-- enroll_student: RPC for post-signup enrollment via class code
-- Respects prior invites for team/interest-group assignment
-- ──────────────────────────────────────────────

create or replace function public.enroll_student(p_class_code text)
returns void as $$
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

  select id into v_class_id
  from public.classes
  where upper(class_code) = upper(trim(p_class_code));

  if v_class_id is null then
    raise exception 'Invalid class code';
  end if;

  if exists (select 1 from public.students_classes where student_id = v_student_id and class_id = v_class_id) then
    raise exception 'You are already enrolled in this class';
  end if;

  select email into v_user_email from public.users where id = v_student_id;

  -- Check for a matching invite to inherit team/interest
  select affiliation, interest_block
  into v_target_country, v_target_interest
  from public.class_invites
  where class_id = v_class_id and lower(email) = lower(v_user_email)
  order by invited_at desc
  limit 1;

  if v_target_country is not null then
    select id into v_target_team_id
    from public.teams
    where class_id = v_class_id and country = v_target_country
    limit 1;
  end if;

  insert into public.students_classes (student_id, class_id, team_id, interest_block)
  values (v_student_id, v_class_id, v_target_team_id, v_target_interest);

  update public.class_invites
  set status = 'account_created'
  where class_id = v_class_id and lower(email) = lower(v_user_email);
end;
$$ language plpgsql security definer;


-- ──────────────────────────────────────────────
-- Trigger: fire handle_new_user on auth signup
-- ──────────────────────────────────────────────

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


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
