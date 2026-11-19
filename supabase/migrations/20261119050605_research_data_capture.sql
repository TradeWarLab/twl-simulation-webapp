-- Research data capture.
--
-- 1. simulation_events: an append-only log of board, ratification, vote,
--    value and period changes. Database triggers write it, so no code path
--    can skip it.
-- 2. class_outcomes: one row each time Round 2 ends. It records the board at
--    the end and the last package that went to a vote, each scored as if every
--    member approved. Students never see it.
-- 3. classes.round2_started_at: start time for the Round 2 countdown. The
--    instructor still ends the round by hand.
-- 4. Audit S8: end_bilateral_round refuses a caller with no session.
-- 5. force_accept_votes: the class instructor approves the open package for
--    members who did not vote. A reject still fails the deal.
--
-- Only the lab reads the new tables (SQL editor, CLI or service role).
-- anon and authenticated get no access.
-- Audit IDs refer to docs/architecture/2026-11-14-architecture-audit.md.


-- ──────────────────────────────────────────────
-- Columns
-- ──────────────────────────────────────────────

-- Set by a trigger each time the class enters period 2.
alter table public.classes add column round2_started_at timestamp with time zone;

-- Null: the voter cast the vote. Else: the instructor who forced it.
alter table public.votes add column cast_by uuid;


-- ──────────────────────────────────────────────
-- simulation_events
-- ──────────────────────────────────────────────

-- No foreign keys: the log must stay when other rows change or go.
create table public.simulation_events (
  id bigint generated always as identity,
  class_id uuid not null,
  created_at timestamp with time zone not null default clock_timestamp(),
  event_type text not null,
  actor_id uuid,  -- null: no session
  actor_name text,  -- name at the time of the event
  actor_team text,  -- 'USA', 'China', or null for an instructor
  item_id uuid,
  item_name text,
  details jsonb not null default '{}'::jsonb,
  constraint simulation_events_pkey PRIMARY KEY (id)
);

create index simulation_events_class_id_created_at_idx
  on public.simulation_events using btree (class_id, created_at);

alter table public.simulation_events enable row level security;
revoke all on public.simulation_events from anon, authenticated;
revoke all on sequence public.simulation_events_id_seq from anon, authenticated;


-- ──────────────────────────────────────────────
-- class_outcomes
-- ──────────────────────────────────────────────

-- One row each time Round 2 ends. A rewind and a second end add a second row.
-- board_*: the board when the round ended. package_*: the last package that
-- went to a vote. Scores use the finalize_ratified_package rule.
create table public.class_outcomes (
  id bigint generated always as identity,
  class_id uuid not null,
  class_name text not null,
  ended_at timestamp with time zone not null default now(),
  round2_started_at timestamp with time zone,
  outcome text not null,
  ended_by text not null,
  ended_by_user uuid,
  usa_members integer not null,
  china_members integer not null,
  usa_no_deal_cost integer not null,
  china_no_deal_cost integer not null,
  board_items jsonb not null,
  board_usa_score numeric not null,
  board_china_score numeric not null,
  package_id uuid,
  package_status text,  -- status when the round ended; 'pending' = vote still open
  package_items jsonb,
  package_approvals integer,
  package_rejections integer,
  package_forced_approvals integer,
  package_usa_score numeric,
  package_china_score numeric,
  constraint class_outcomes_pkey PRIMARY KEY (id),
  constraint class_outcomes_outcome_check CHECK ((outcome = ANY (ARRAY['deal'::text, 'no_deal'::text]))),
  constraint class_outcomes_ended_by_check CHECK ((ended_by = ANY (ARRAY['ratified'::text, 'instructor'::text])))
);

create index class_outcomes_class_id_idx on public.class_outcomes using btree (class_id);

alter table public.class_outcomes enable row level security;
revoke all on public.class_outcomes from anon, authenticated;
revoke all on sequence public.class_outcomes_id_seq from anon, authenticated;


-- ──────────────────────────────────────────────
-- Internal helpers
-- ──────────────────────────────────────────────

-- Writes one event. The actor comes from the session. A caller can set
-- twl.event_reason (transaction-local) to tag events, for example the board
-- removals of a round end.
CREATE OR REPLACE FUNCTION public.log_simulation_event(
  p_class_id uuid,
  p_event_type text,
  p_item_id uuid DEFAULT NULL,
  p_item_name text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
begin
  insert into public.simulation_events
    (class_id, event_type, actor_id, actor_name, actor_team, item_id, item_name, details)
  values (
    p_class_id,
    p_event_type,
    v_actor,
    (select full_name from public.users where id = v_actor),
    (select t.country
       from public.students_classes sc
       join public.teams t on t.id = sc.team_id
      where sc.student_id = v_actor and sc.class_id = p_class_id),
    p_item_id,
    p_item_name,
    coalesce(p_details, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
           'reason', nullif(current_setting('twl.event_reason', true), '')))
  );
end;
$function$
;

revoke execute on function public.log_simulation_event(uuid, text, uuid, text, jsonb) from public, anon, authenticated;

-- Each team's score for a set of items: the sum of the team's own values over
-- both mirror rows (matched by issue_id, else by name). Same rule as
-- finalize_ratified_package.
CREATE OR REPLACE FUNCTION public.score_items_by_country(p_class_id uuid, p_item_ids uuid[])
 RETURNS TABLE(country text, score numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select t.country, coalesce(sum(ti.value), 0)
    from public.teams t
    left join public.trade_items ti
      on ti.team_id = t.id
     and exists (
       select 1 from public.trade_items src
        where src.id = any(p_item_ids)
          and src.class_id = p_class_id
          and (ti.issue_id = src.issue_id or (src.issue_id is null and ti.name = src.name))
     )
   where t.class_id = p_class_id
   group by t.country;
$function$
;

revoke execute on function public.score_items_by_country(uuid, uuid[]) from public, anon, authenticated;

-- Writes the class_outcomes row for a round that ends now and returns it.
-- Call it before the board is cleared.
CREATE OR REPLACE FUNCTION public.record_class_outcome(p_class_id uuid, p_ended_by text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_board jsonb;
  v_board_ids uuid[];
  v_pkg public.trade_proposals;
  v_pkg_items jsonb;
  v_pkg_ids uuid[];
  v_row public.class_outcomes;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id', b.item_id,
           'issue_id', b.issue_id,
           'name', b.name,
           'giving_team', t.country,
           'added_by', b.added_by,
           'added_at', b.created_at) order by b.created_at), '[]'::jsonb),
         array_agg(b.item_id)
    into v_board, v_board_ids
    from public.deal_board_items b
    left join public.teams t on t.id = b.giving_team_id
   where b.class_id = p_class_id;

  select * into v_pkg
    from public.trade_proposals
   where class_id = p_class_id and is_package
   order by created_at desc
   limit 1;

  -- Offered items are given by the proposing team, requested items by the
  -- receiving team (see callForRatification).
  if v_pkg.id is not null then
    select coalesce(jsonb_agg(e.item || jsonb_build_object('giving_team', t.country)), '[]'::jsonb),
           array_agg((e.item->>'item_id')::uuid) filter (where e.item->>'item_id' is not null)
      into v_pkg_items, v_pkg_ids
      from (
        select x as item, v_pkg.proposing_team_id as team_id
          from jsonb_array_elements(coalesce(v_pkg.offered_items, '[]'::jsonb)) as x
        union all
        select x, v_pkg.receiving_team_id
          from jsonb_array_elements(coalesce(v_pkg.requested_items, '[]'::jsonb)) as x
      ) e
      left join public.teams t on t.id = e.team_id;
  end if;

  insert into public.class_outcomes (
    class_id, class_name, round2_started_at, outcome, ended_by, ended_by_user,
    usa_members, china_members, usa_no_deal_cost, china_no_deal_cost,
    board_items, board_usa_score, board_china_score,
    package_id, package_status, package_items,
    package_approvals, package_rejections, package_forced_approvals,
    package_usa_score, package_china_score
  )
  select
    c.id,
    c.name,
    c.round2_started_at,
    case when p_ended_by = 'ratified' then 'deal' else 'no_deal' end,
    p_ended_by,
    auth.uid(),
    (select count(*) from public.students_classes sc join public.teams t on t.id = sc.team_id
      where sc.class_id = c.id and t.country = 'USA'),
    (select count(*) from public.students_classes sc join public.teams t on t.id = sc.team_id
      where sc.class_id = c.id and t.country = 'China'),
    -- A class from before cost randomization has no slot: the old fixed -10.
    coalesce(s.usa_cost, -10),
    coalesce(s.china_cost, -10),
    v_board,
    coalesce((select score from public.score_items_by_country(c.id, v_board_ids) where country = 'USA'), 0),
    coalesce((select score from public.score_items_by_country(c.id, v_board_ids) where country = 'China'), 0),
    v_pkg.id,
    v_pkg.status,
    v_pkg_items,
    case when v_pkg.id is not null then
      (select count(*) from public.votes where proposal_id = v_pkg.id and vote = 'approve') end,
    case when v_pkg.id is not null then
      (select count(*) from public.votes where proposal_id = v_pkg.id and vote = 'reject') end,
    case when v_pkg.id is not null then
      (select count(*) from public.votes where proposal_id = v_pkg.id and cast_by is not null) end,
    case when v_pkg.id is not null then
      coalesce((select score from public.score_items_by_country(c.id, v_pkg_ids) where country = 'USA'), 0) end,
    case when v_pkg.id is not null then
      coalesce((select score from public.score_items_by_country(c.id, v_pkg_ids) where country = 'China'), 0) end
  from public.classes c
  left join public.no_deal_cost_slots s on s.class_id = c.id
  where c.id = p_class_id
  returning * into v_row;

  perform public.log_simulation_event(p_class_id, 'round_ended', null, null,
    jsonb_build_object('outcome', v_row.outcome, 'ended_by', v_row.ended_by,
                       'class_outcome_id', v_row.id));

  return to_jsonb(v_row);
end;
$function$
;

revoke execute on function public.record_class_outcome(uuid, text) from public, anon, authenticated;


-- ──────────────────────────────────────────────
-- Event triggers
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_deal_board_item_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.deal_board_items;
begin
  if tg_op = 'INSERT' then
    v_row := new;
  else
    v_row := old;
  end if;

  perform public.log_simulation_event(
    v_row.class_id,
    case tg_op when 'INSERT' then 'board_item_added' else 'board_item_removed' end,
    v_row.item_id,
    v_row.name,
    jsonb_build_object(
      'board_item_id', v_row.id,
      'issue_id', v_row.issue_id,
      'giving_team', (select country from public.teams where id = v_row.giving_team_id),
      'added_by', v_row.added_by));
  return null;
end;
$function$
;

CREATE TRIGGER on_deal_board_item_change AFTER INSERT OR DELETE ON public.deal_board_items FOR EACH ROW EXECUTE FUNCTION public.log_deal_board_item_change();

CREATE OR REPLACE FUNCTION public.log_ratification_call_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.deal_ratification_calls;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  perform public.log_simulation_event(
    v_row.class_id,
    case tg_op when 'DELETE' then 'ratification_call_removed' else 'ratification_called' end,
    null,
    null,
    jsonb_build_object(
      'team', (select country from public.teams where id = v_row.team_id),
      'called_by', v_row.called_by));
  return null;
end;
$function$
;

CREATE TRIGGER on_ratification_call_change AFTER INSERT OR UPDATE OR DELETE ON public.deal_ratification_calls FOR EACH ROW EXECUTE FUNCTION public.log_ratification_call_change();

-- Logs package votes opening and closing. A failed vote also clears the board
-- and the calls (blank-slate reset). This was done by the voter's session in
-- submitVote; here it is in the same transaction as the status change.
CREATE OR REPLACE FUNCTION public.handle_package_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_set_reason boolean := false;
begin
  if tg_op = 'INSERT' then
    perform public.log_simulation_event(new.class_id, 'vote_opened', null, null,
      jsonb_build_object(
        'proposal_id', new.id,
        'proposing_team', (select country from public.teams where id = new.proposing_team_id),
        'offered_items', new.offered_items,
        'requested_items', new.requested_items));
    return null;
  end if;

  if new.status is not distinct from old.status then
    return null;
  end if;

  -- Keep a reason that the caller set, for example 'round_end'.
  if new.status = 'rejected' and coalesce(current_setting('twl.event_reason', true), '') = '' then
    perform set_config('twl.event_reason', 'vote_rejected', true);
    v_set_reason := true;
  end if;

  perform public.log_simulation_event(new.class_id, 'vote_' || new.status, null, null,
    jsonb_build_object(
      'proposal_id', new.id,
      'previous_status', old.status,
      'approvals', (select count(*) from public.votes where proposal_id = new.id and vote = 'approve'),
      'rejections', (select count(*) from public.votes where proposal_id = new.id and vote = 'reject')));

  if new.status = 'rejected' and old.status = 'pending' then
    delete from public.deal_board_items where class_id = new.class_id;
    delete from public.deal_ratification_calls where class_id = new.class_id;
  end if;

  -- The reason is for this change only, not for the rest of the transaction.
  if v_set_reason then
    perform set_config('twl.event_reason', '', true);
  end if;
  return null;
end;
$function$
;

CREATE TRIGGER on_package_change AFTER INSERT OR UPDATE OF status ON public.trade_proposals FOR EACH ROW WHEN (new.is_package) EXECUTE FUNCTION public.handle_package_change();

CREATE OR REPLACE FUNCTION public.log_vote_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- A repeated upsert of the same vote is not a change.
  if tg_op = 'UPDATE' and old.vote is not distinct from new.vote then
    return null;
  end if;

  perform public.log_simulation_event(
    (select class_id from public.trade_proposals where id = new.proposal_id),
    'vote_cast',
    null,
    null,
    jsonb_build_object(
      'proposal_id', new.proposal_id,
      'voter_id', new.user_id,
      'voter_team', (select country from public.teams where id = new.team_id),
      'vote', new.vote,
      'previous_vote', case when tg_op = 'UPDATE' then old.vote end,
      'cast_by', new.cast_by));
  return null;
end;
$function$
;

CREATE TRIGGER on_vote_change AFTER INSERT OR UPDATE ON public.votes FOR EACH ROW EXECUTE FUNCTION public.log_vote_change();

-- Round 1 valuations: each change of a team's value for an item.
CREATE OR REPLACE FUNCTION public.log_trade_item_value_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.log_simulation_event(new.class_id, 'item_value_changed', new.id, new.name,
    jsonb_build_object(
      'team', (select country from public.teams where id = new.team_id),
      'issue_id', new.issue_id,
      'old_value', old.value,
      'new_value', new.value));
  return null;
end;
$function$
;

CREATE TRIGGER on_trade_item_value_change AFTER UPDATE OF value ON public.trade_items FOR EACH ROW WHEN ((old.value IS DISTINCT FROM new.value)) EXECUTE FUNCTION public.log_trade_item_value_change();

CREATE OR REPLACE FUNCTION public.log_class_period_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.log_simulation_event(new.id, 'period_changed', null, null,
    jsonb_build_object('from', old.current_period, 'to', new.current_period));
  return null;
end;
$function$
;

CREATE TRIGGER on_class_period_change AFTER UPDATE OF current_period ON public.classes FOR EACH ROW WHEN ((old.current_period IS DISTINCT FROM new.current_period)) EXECUTE FUNCTION public.log_class_period_change();

-- Starts the Round 2 countdown. A rewind into period 2 starts it again.
CREATE OR REPLACE FUNCTION public.set_round2_started_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.round2_started_at := now();
  return new;
end;
$function$
;

CREATE TRIGGER on_class_round_two BEFORE UPDATE OF current_period ON public.classes FOR EACH ROW WHEN (((new.current_period = 2) AND (old.current_period IS DISTINCT FROM 2))) EXECUTE FUNCTION public.set_round2_started_at();


-- ──────────────────────────────────────────────
-- finalize_ratified_package: now returns the class_outcomes row (null when
-- nothing was finalized) and also accepts the class instructor as caller, for
-- force_accept_votes. The return type changes, so drop and create.
-- ──────────────────────────────────────────────

drop function public.finalize_ratified_package(uuid);

CREATE FUNCTION public.finalize_ratified_package(p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
  v_outcome jsonb;
begin
  -- Load and lock the still-pending proposal (idempotent: a second call
  -- no-ops). The lock makes a concurrent call wait, then find it executed.
  select class_id, proposing_team_id, receiving_team_id, is_package
    into v_class_id, v_proposing, v_receiving, v_is_package
  from public.trade_proposals
  where id = p_proposal_id and status = 'pending'
  for update;

  if v_class_id is null then
    return null;
  end if;

  -- Caller must be enrolled in this class or be its instructor.
  if auth.uid() is null or not (
    exists (
      select 1 from public.students_classes
      where student_id = auth.uid() and class_id = v_class_id
    )
    or exists (
      select 1 from public.classes
      where id = v_class_id and instructor_id = auth.uid()
    )
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

  -- Package housekeeping: record the outcome while the board is still there,
  -- clear the shared board + calls and end the round by advancing to the End
  -- phase (3). Guarded to the Bilateral phase (2).
  if v_is_package then
    v_outcome := public.record_class_outcome(v_class_id, 'ratified');
    perform set_config('twl.event_reason', 'deal_ratified', true);
    delete from public.deal_board_items where class_id = v_class_id;
    delete from public.deal_ratification_calls where class_id = v_class_id;
    perform set_config('twl.event_reason', '', true);
    update public.classes set current_period = 3
      where id = v_class_id and current_period = 2;
  end if;

  return v_outcome;
end;
$function$
;

revoke execute on function public.finalize_ratified_package(uuid) from public, anon;
grant execute on function public.finalize_ratified_package(uuid) to authenticated, service_role;


-- ──────────────────────────────────────────────
-- end_bilateral_round: now records the outcome first and returns it (null
-- when nothing changed). Audit S8: with no session, auth.uid() is null and
-- `instructor_id <> auth.uid()` is null, so the old owner check passed.
-- ──────────────────────────────────────────────

drop function public.end_bilateral_round(uuid);

CREATE FUNCTION public.end_bilateral_round(p_class_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_instructor uuid;
  v_period int;
  v_outcome jsonb;
begin
  select instructor_id into v_instructor
  from public.classes where id = p_class_id;

  if v_instructor is null then
    raise exception 'Class not found';
  end if;
  if auth.uid() is null or v_instructor is distinct from auth.uid() then
    raise exception 'Not authorized to end this round';
  end if;

  -- Lock the open package first, in the same order as
  -- finalize_ratified_package. If a deal finalizes while this waits, the
  -- period read below sees 3 and nothing changes.
  perform 1 from public.trade_proposals
   where class_id = p_class_id and is_package and status = 'pending'
   for update;

  select current_period into v_period
  from public.classes where id = p_class_id;

  -- No-op outside the bilateral phase. advancePeriod branches on a
  -- server-render snapshot, so a deal that ratified between render and click
  -- would otherwise have its executed proposal marked rejected and its scores
  -- wiped. Also covers a double-click and a stale second tab.
  if v_period is distinct from 2 then
    return null;
  end if;

  -- Record the outcome while the board and the open package are still there.
  v_outcome := public.record_class_outcome(p_class_id, 'instructor');
  perform set_config('twl.event_reason', 'round_end', true);

  -- Without this the proposal stays pending after the round ends, and a late
  -- ballot completing unanimity calls finalize_ratified_package, writing
  -- team_scores and silently turning a declared failure into a scored deal.
  update public.trade_proposals
     set status = 'rejected'
   where class_id = p_class_id and is_package and status = 'pending';

  -- Unconditional: a round can end with items on the board and no vote called.
  delete from public.deal_board_items where class_id = p_class_id;
  delete from public.deal_ratification_calls where class_id = p_class_id;
  perform set_config('twl.event_reason', '', true);

  update public.classes
     set current_period = 3, status = 'archived'
   where id = p_class_id;

  return v_outcome;
end;
$function$
;

revoke execute on function public.end_bilateral_round(uuid) from public, anon;
grant execute on function public.end_bilateral_round(uuid) to authenticated, service_role;


-- ──────────────────────────────────────────────
-- force_accept_votes: for a student who left. The class instructor approves
-- the open package for every member who has not voted, then the vote
-- resolves. A reject already cast fails the deal. Each forced vote has
-- cast_by set. Returns {result, votes_added, outcome}.
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.force_accept_votes(p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_class_id uuid;
  v_proposing uuid;
  v_receiving uuid;
  v_added int;
  v_rejections int;
begin
  if auth.uid() is null then
    raise exception 'Not authorized to force-accept votes';
  end if;

  select class_id, proposing_team_id, receiving_team_id
    into v_class_id, v_proposing, v_receiving
  from public.trade_proposals
  where id = p_proposal_id and is_package and status = 'pending'
  for update;

  if v_class_id is null then
    raise exception 'No open vote found';
  end if;
  if not exists (
    select 1 from public.classes
    where id = v_class_id and instructor_id = auth.uid()
  ) then
    raise exception 'Not authorized to force-accept votes';
  end if;
  if not exists (
    select 1 from public.classes
    where id = v_class_id and current_period = 2
  ) then
    raise exception 'Voting has closed for this round';
  end if;

  insert into public.votes (proposal_id, user_id, team_id, vote, cast_by)
  select p_proposal_id, sc.student_id, sc.team_id, 'approve', auth.uid()
    from public.students_classes sc
   where sc.team_id in (v_proposing, v_receiving)
  on conflict (proposal_id, user_id) do nothing;
  get diagnostics v_added = row_count;

  select count(*) into v_rejections
    from public.votes where proposal_id = p_proposal_id and vote = 'reject';

  if v_rejections > 0 then
    -- handle_package_change clears the board.
    update public.trade_proposals set status = 'rejected' where id = p_proposal_id;
    return jsonb_build_object('result', 'rejected', 'votes_added', v_added);
  end if;

  return jsonb_build_object(
    'result', 'executed',
    'votes_added', v_added,
    'outcome', public.finalize_ratified_package(p_proposal_id));
end;
$function$
;

revoke execute on function public.force_accept_votes(uuid) from public, anon;
grant execute on function public.force_accept_votes(uuid) to authenticated, service_role;
