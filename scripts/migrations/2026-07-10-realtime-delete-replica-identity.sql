-- Fix: removing a deal-board item (or withdrawing a ratification call) didn't
-- propagate over realtime, so other clients — notably the instructor's Live
-- Deal Board — kept showing the removed item and an incorrect standing.
--
-- Root cause: the client subscribes to postgres_changes with a
-- `class_id=eq.<id>` filter. For DELETE events, the "old" record only contains
-- the primary key under the default REPLICA IDENTITY, so the filter on
-- `class_id` can never match and the delete is dropped. INSERT/UPDATE carry the
-- full row, which is why adds propagate but removes don't.
--
-- REPLICA IDENTITY FULL makes Postgres emit the full old row on DELETE, so the
-- filter matches and deletes fan out. Run once against the live database;
-- schema.sql carries the same statements for fresh installs.

alter table public.deal_board_items replica identity full;
alter table public.deal_ratification_calls replica identity full;
