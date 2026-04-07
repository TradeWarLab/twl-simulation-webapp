-- Fix: Add INSERT/UPDATE/DELETE policy for instructors on the teams table.
-- The live database only has a SELECT policy, which blocks team auto-creation.

-- Drop the old select-only policy if it exists (safe to re-run)
drop policy if exists "Teams are viewable by everyone in the class." on public.teams;

-- Recreate the SELECT policy
create policy "Teams are viewable by everyone in the class."
  on public.teams for select using (true);

-- Add the missing "all operations" policy for instructors
-- This lets instructors INSERT, UPDATE, DELETE teams in classes they own.
drop policy if exists "Instructors can manage teams." on public.teams;

create policy "Instructors can manage teams."
  on public.teams for all using (
    exists (
      select 1 from public.classes
      where id = teams.class_id and instructor_id = auth.uid()
    )
  );
