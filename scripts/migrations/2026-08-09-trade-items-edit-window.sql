-- ──────────────────────────────────────────────
-- Narrow the student trade-item edit window to Domestic Negotiation.
--
-- The run guide states point rankings freeze when Round 1 ends, and the UI
-- enforces that (isLocked when current_period !== 1). The policy did not:
-- `current_period < 3` also permitted edits during Bilateral Negotiation, so a
-- student could re-score their asks mid-negotiation via a direct API call.
--
-- Instructors are unaffected — they write through "Instructors can manage
-- trade items." finalize_ratified_package is security definer and bypasses RLS.
--
-- Idempotent: safe to re-run.
-- ──────────────────────────────────────────────

begin;

drop policy if exists "Teams can update their own trade items." on public.trade_items;

create policy "Teams can update their own trade items."
  on public.trade_items for update using (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and team_id = trade_items.team_id
    )
    and exists (
      select 1 from public.classes
      where id = trade_items.class_id and current_period = 1
    )
  );

commit;
