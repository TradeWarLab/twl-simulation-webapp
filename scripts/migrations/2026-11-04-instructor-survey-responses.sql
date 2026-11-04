-- ──────────────────────────────────────────────
-- Instructor intake survey responses.
--
-- An instructor answers the intake survey in the Create Class form. The class
-- and this row are created by the same submit. The same answers are also
-- appended to the research Google Sheet; this table is the backup if that
-- write fails.
--
-- Idempotent: safe to re-run.
-- ──────────────────────────────────────────────

begin;

create table if not exists public.instructor_survey_responses (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null unique,
  instructor_id uuid references public.users not null,
  answers jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.instructor_survey_responses enable row level security;

drop policy if exists "Instructors can view their own intake responses."
  on public.instructor_survey_responses;
create policy "Instructors can view their own intake responses."
  on public.instructor_survey_responses for select
  using (instructor_id = auth.uid());

-- Only for a class the instructor owns.
drop policy if exists "Instructors can submit intake responses for their classes."
  on public.instructor_survey_responses;
create policy "Instructors can submit intake responses for their classes."
  on public.instructor_survey_responses for insert with check (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.classes
      where id = instructor_survey_responses.class_id
        and instructor_id = auth.uid()
    )
  );

commit;
