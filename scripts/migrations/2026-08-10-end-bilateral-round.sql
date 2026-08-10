-- ──────────────────────────────────────────────
-- end_bilateral_round: instructor ends Round 2 by hand (external timer).
--
-- Cancels any open ratification vote, clears the shared board, advances to
-- the End period, and archives, all in ONE transaction.
--
-- Why SECURITY DEFINER: every write below is gated on a students_classes row
-- and an instructor has none, so an instructor cannot mark the proposal
-- rejected or clear the board under RLS. Same reason finalize_ratified_package
-- exists. Authorization is re-derived from auth.uid() against
-- classes.instructor_id inside the function.
--
-- Why atomic: cancelling first broadcasts a `rejected` realtime UPDATE and
-- students briefly see "the deal was rejected" before the End screen;
-- advancing first reopens the race this closes.
--
-- Idempotent: safe to re-run.
-- ──────────────────────────────────────────────

begin;

create or replace function public.end_bilateral_round(p_class_id uuid)
returns void as $$
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
$$ language plpgsql security definer;

grant execute on function public.end_bilateral_round(uuid) to authenticated;

commit;
