-- ──────────────────────────────────────────────
-- Post-simulation survey responses.
--
-- A student answers once per class, in the End period, before they see
-- results. A row here unlocks their results screen. The same answers are also
-- appended to the research Google Sheet; this table is the backup if that
-- write fails.
--
-- Idempotent: safe to re-run.
-- ──────────────────────────────────────────────

begin;

create table if not exists public.survey_responses (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  student_id uuid references public.users not null,
  team_id uuid references public.teams not null,
  answers jsonb not null,
  created_at timestamptz default now() not null,
  unique(class_id, student_id)
);

alter table public.survey_responses enable row level security;

drop policy if exists "Students can view their own survey responses."
  on public.survey_responses;
create policy "Students can view their own survey responses."
  on public.survey_responses for select using (student_id = auth.uid());

drop policy if exists "Instructors can view their classes' survey responses."
  on public.survey_responses;
create policy "Instructors can view their classes' survey responses."
  on public.survey_responses for select using (
    exists (
      select 1 from public.classes
      where id = survey_responses.class_id and instructor_id = auth.uid()
    )
  );

-- Only for the student's own team, and only once the simulation has ended.
drop policy if exists "Students can submit their own survey response."
  on public.survey_responses;
create policy "Students can submit their own survey response."
  on public.survey_responses for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.students_classes sc
      join public.classes c on c.id = sc.class_id
      where sc.class_id = survey_responses.class_id
        and sc.student_id = auth.uid()
        and sc.team_id = survey_responses.team_id
        and c.current_period = 3
    )
  );

commit;
