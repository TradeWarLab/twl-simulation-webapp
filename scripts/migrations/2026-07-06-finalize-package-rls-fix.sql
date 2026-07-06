-- Fix: ratified deals only scored one team (winner +N, loser 0).
--
-- Root cause: submitVote -> executeTrade/updateScores ran with the *voting
-- student's* session. RLS on trade_items restricts a student to their OWN
-- team's rows for both SELECT and UPDATE, so:
--   * only the voter's team mirror rows got is_resolved = true, and
--   * the opponent team's score summed over rows the student couldn't read (0).
-- Advancing the class to the End phase also failed silently (classes UPDATE is
-- instructor-only).
--
-- This SECURITY DEFINER function performs the whole finalization with elevated
-- privileges, so it resolves BOTH teams' rows and scores both sides. It is
-- guarded by a unanimous-approval re-check so it can't be abused via a direct
-- RPC call. Run once against the live database; schema.sql carries the same DDL.

create or replace function public.finalize_ratified_package(p_proposal_id uuid)
returns void as $$
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
$$ language plpgsql security definer;

grant execute on function public.finalize_ratified_package(uuid) to authenticated;


-- Reveal both sides' valuations once the simulation has ended. During play,
-- students only see their own team's trade_items (values are confidential); at
-- the End phase (current_period >= 3) the post-game analysis reveals the full
-- picture, so any enrolled student may read every item in their class.
drop policy if exists "Trade items revealed after the simulation ends."
  on public.trade_items;
create policy "Trade items revealed after the simulation ends."
  on public.trade_items for select using (
    exists (
      select 1
      from public.classes c
      join public.students_classes sc on sc.class_id = c.id
      where c.id = trade_items.class_id
        and sc.student_id = auth.uid()
        and c.current_period >= 3
    )
  );
