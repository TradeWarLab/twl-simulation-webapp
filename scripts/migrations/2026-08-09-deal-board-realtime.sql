-- ──────────────────────────────────────────────
-- Add the shared deal board tables to the realtime publication.
--
-- Both already carry `replica identity full` (schema.sql) so DELETE events
-- include the old row, but neither was ever published — so
-- RealtimeClassProvider's subscriptions to them never delivered anything and
-- the board did not sync between students.
--
-- Idempotent: safe to re-run. `alter publication ... add table` errors if the
-- table is already a member, so each is guarded.
-- ──────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'deal_board_items'
  ) then
    alter publication supabase_realtime add table public.deal_board_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'deal_ratification_calls'
  ) then
    alter publication supabase_realtime add table public.deal_ratification_calls;
  end if;
end $$;
