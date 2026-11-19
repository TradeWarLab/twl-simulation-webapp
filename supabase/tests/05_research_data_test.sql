-- Database tests: research data capture.
-- simulation_events, class_outcomes, round2_started_at, the S8 fix and
-- force_accept_votes.

begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ──────────────────────────────────────────────
-- Helpers and fixtures. Keep this block the same in every test file.
-- All of it is rolled back at the end of the file.
-- ──────────────────────────────────────────────

create schema tests;
grant usage on schema tests to anon, authenticated;

-- Fixed ids for the fixture rows. An unknown name is an error, not null.
create function tests.id(p_name text)
 returns uuid
 language plpgsql
 immutable
as $fn$
declare
  v_id uuid;
begin
  v_id := case p_name
    when 'inst_a'       then '10000000-0000-0000-0000-00000000000a'::uuid
    when 'inst_b'       then '10000000-0000-0000-0000-00000000000b'::uuid
    when 'usa_a'        then '20000000-0000-0000-0000-0000000000a1'::uuid
    when 'china_a'      then '20000000-0000-0000-0000-0000000000a2'::uuid
    when 'unassigned_a' then '20000000-0000-0000-0000-0000000000a3'::uuid
    when 'usa_b'        then '20000000-0000-0000-0000-0000000000b1'::uuid
    when 'china_b'      then '20000000-0000-0000-0000-0000000000b2'::uuid
    when 'outsider'     then '30000000-0000-0000-0000-000000000001'::uuid
    when 'class_a'      then '40000000-0000-0000-0000-00000000000a'::uuid
    when 'class_b'      then '40000000-0000-0000-0000-00000000000b'::uuid
    when 'team_usa_a'   then '50000000-0000-0000-0000-0000000000a1'::uuid
    when 'team_china_a' then '50000000-0000-0000-0000-0000000000a2'::uuid
    when 'team_usa_b'   then '50000000-0000-0000-0000-0000000000b1'::uuid
    when 'team_china_b' then '50000000-0000-0000-0000-0000000000b2'::uuid
    when 'item_usa_a'   then '60000000-0000-0000-0000-0000000000a1'::uuid
    when 'item_china_a' then '60000000-0000-0000-0000-0000000000a2'::uuid
    when 'item_usa_b'   then '60000000-0000-0000-0000-0000000000b1'::uuid
    when 'item_china_b' then '60000000-0000-0000-0000-0000000000b2'::uuid
    when 'proposal_a'   then '70000000-0000-0000-0000-00000000000a'::uuid
    when 'proposal_a2'  then '70000000-0000-0000-0000-0000000000a2'::uuid
    when 'briefing_a'   then '80000000-0000-0000-0000-00000000000a'::uuid
    when 'briefing_b'   then '80000000-0000-0000-0000-00000000000b'::uuid
  end;
  if v_id is null then
    raise exception 'tests.id: unknown fixture name %', p_name;
  end if;
  return v_id;
end;
$fn$;

-- Act as a signed-in user, as PostgREST does for a request with a JWT.
create function tests.act_as(p_name text)
 returns void
 language plpgsql
as $fn$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.id(p_name), 'role', 'authenticated')::text, true);
end;
$fn$;

-- Act as a caller with only the publishable key (no session).
create function tests.act_as_anon()
 returns void
 language plpgsql
as $fn$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end;
$fn$;

-- Runs one statement as the current role, then rolls it back, so a write
-- that is wrongly allowed does not change the fixtures for later tests.
-- Returns 'rows=<n>' (rows returned or changed) or the SQLSTATE of the error.
create function tests.attempt(p_sql text)
 returns text
 language plpgsql
as $fn$
declare
  v_rows bigint;
  v_result text;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    v_result := 'rows=' || v_rows;
    raise exception 'tests.attempt: roll back';
  exception when others then
    if v_result is null then
      v_result := sqlstate;
    end if;
  end;
  return v_result;
end;
$fn$;

-- True if the statement is refused: it returns or changes no rows, or it
-- fails with an access error (42501), a raised exception (P0001), or a check
-- constraint (23514). Other errors (for example a typo in the test) are false,
-- so they show as a failure.
create function tests.denied(p_sql text)
 returns boolean
 language sql
as $fn$
  select tests.attempt(p_sql) in ('rows=0', '42501', 'P0001', '23514');
$fn$;

grant execute on all functions in schema tests to anon, authenticated;

-- Users. The on_auth_user_created trigger makes each public.users row.
insert into auth.users (id, email, raw_user_meta_data) values
  (tests.id('inst_a'),       'inst_a@test.local',       '{"full_name": "Instructor A", "role": "instructor"}'),
  (tests.id('inst_b'),       'inst_b@test.local',       '{"full_name": "Instructor B", "role": "instructor"}'),
  (tests.id('usa_a'),        'usa_a@test.local',        '{"full_name": "USA Student A"}'),
  (tests.id('china_a'),      'china_a@test.local',      '{"full_name": "China Student A"}'),
  (tests.id('unassigned_a'), 'unassigned_a@test.local', '{"full_name": "Unassigned Student A"}'),
  (tests.id('usa_b'),        'usa_b@test.local',        '{"full_name": "USA Student B"}'),
  (tests.id('china_b'),      'china_b@test.local',      '{"full_name": "China Student B"}'),
  (tests.id('outsider'),     'outsider@test.local',     '{"full_name": "Outsider"}');

insert into public.classes (id, instructor_id, name, normalized_name, class_code) values
  (tests.id('class_a'), tests.id('inst_a'), 'Test Class A', 'test class a', 'TSTCLSA'),
  (tests.id('class_b'), tests.id('inst_b'), 'Test Class B', 'test class b', 'TSTCLSB');

-- Known no-deal costs for class A. The trigger keeps an existing slot.
insert into public.no_deal_cost_slots (usa_cost, china_cost, class_id, assigned_at)
values (-10, -20, tests.id('class_a'), now());

insert into public.teams (id, class_id, country) values
  (tests.id('team_usa_a'),   tests.id('class_a'), 'USA'),
  (tests.id('team_china_a'), tests.id('class_a'), 'China'),
  (tests.id('team_usa_b'),   tests.id('class_b'), 'USA'),
  (tests.id('team_china_b'), tests.id('class_b'), 'China');

insert into public.students_classes (student_id, class_id, team_id) values
  (tests.id('usa_a'),        tests.id('class_a'), tests.id('team_usa_a')),
  (tests.id('china_a'),      tests.id('class_a'), tests.id('team_china_a')),
  (tests.id('unassigned_a'), tests.id('class_a'), null),
  (tests.id('usa_b'),        tests.id('class_b'), tests.id('team_usa_b')),
  (tests.id('china_b'),      tests.id('class_b'), tests.id('team_china_b'));

-- One mirror item per team. Values differ so scores can be checked.
insert into public.trade_items (id, class_id, team_id, name, value, role) values
  (tests.id('item_usa_a'),   tests.id('class_a'), tests.id('team_usa_a'),   'Issue 1', 10, 'ask'),
  (tests.id('item_china_a'), tests.id('class_a'), tests.id('team_china_a'), 'Issue 1', 20, 'concession'),
  (tests.id('item_usa_b'),   tests.id('class_b'), tests.id('team_usa_b'),   'Issue 1', 30, 'ask'),
  (tests.id('item_china_b'), tests.id('class_b'), tests.id('team_china_b'), 'Issue 1', 40, 'concession');

insert into public.messages (class_id, sender_id, channel, content) values
  (tests.id('class_a'), tests.id('usa_a'),   'global',     'A global'),
  (tests.id('class_a'), tests.id('usa_a'),   'team_usa',   'A USA only'),
  (tests.id('class_a'), tests.id('china_a'), 'team_china', 'A China only'),
  (tests.id('class_b'), tests.id('usa_b'),   'global',     'B global');

insert into public.briefings (id, class_id, title, target_role) values
  (tests.id('briefing_a'), tests.id('class_a'), 'Briefing A', 'All'),
  (tests.id('briefing_b'), tests.id('class_b'), 'Briefing B', 'All');

insert into public.class_invites (class_id, invited_by, email, affiliation) values
  (tests.id('class_a'), tests.id('inst_a'), 'outsider@test.local', 'China'),
  (tests.id('class_a'), tests.id('inst_a'), 'invitee@test.local',  'USA'),
  (tests.id('class_b'), tests.id('inst_b'), 'someone@test.local',  'USA');

-- A pending ratification package in class A, USA to China.
insert into public.trade_proposals
  (id, class_id, proposing_team_id, receiving_team_id, offered_items, requested_items, created_by, is_package)
values
  (tests.id('proposal_a'), tests.id('class_a'), tests.id('team_usa_a'), tests.id('team_china_a'),
   jsonb_build_array(jsonb_build_object('item_id', tests.id('item_usa_a'), 'name', 'Issue 1', 'value', 10)),
   '[]'::jsonb, tests.id('usa_a'), true);

-- China has voted. USA has not.
insert into public.votes (proposal_id, user_id, team_id, vote) values
  (tests.id('proposal_a'), tests.id('china_a'), tests.id('team_china_a'), 'approve');

-- Only USA teams have a score row, so a test can insert one for China.
insert into public.team_scores (class_id, team_id, score) values
  (tests.id('class_a'), tests.id('team_usa_a'), 0),
  (tests.id('class_b'), tests.id('team_usa_b'), 0);

insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by) values
  (tests.id('class_a'), tests.id('item_usa_a'), 'Issue 1', tests.id('team_usa_a'), tests.id('team_usa_a'), tests.id('usa_a'));

insert into public.deal_ratification_calls (class_id, team_id, called_by) values
  (tests.id('class_a'), tests.id('team_usa_a'), tests.id('usa_a'));

insert into public.survey_responses (class_id, student_id, team_id, answers) values
  (tests.id('class_a'), tests.id('china_a'), tests.id('team_china_a'), '{}'::jsonb);

insert into public.instructor_survey_responses (class_id, instructor_id, answers) values
  (tests.id('class_a'), tests.id('inst_a'), '{}'::jsonb),
  (tests.id('class_b'), tests.id('inst_b'), '{}'::jsonb);

-- Both classes leave Setup. Class B gets its no-deal cost from the trigger.
update public.classes set current_period = 1
 where id in (tests.id('class_a'), tests.id('class_b'));

-- ── End of the shared block ──

-- Tests in this file change state on purpose. Keep the order.

-- ──────────────────────────────────────────────
-- Access: only the lab reads the new tables. Internal helpers are not RPCs.
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');
select ok(tests.denied($$select * from public.simulation_events$$), 'a student cannot read simulation_events');
select ok(tests.denied($$select * from public.class_outcomes$$), 'a student cannot read class_outcomes');
select tests.act_as('inst_a');
select ok(tests.denied($$select * from public.simulation_events$$), 'an instructor cannot read simulation_events');
select ok(tests.denied($$select * from public.class_outcomes$$), 'an instructor cannot read class_outcomes');
select tests.act_as_anon();
select ok(tests.denied($$select * from public.class_outcomes$$), 'anon cannot read class_outcomes');

reset role;
select ok(not has_function_privilege('authenticated', 'public.log_simulation_event(uuid, text, uuid, text, jsonb)', 'execute'), 'authenticated cannot execute log_simulation_event');
select ok(not has_function_privilege('authenticated', 'public.record_class_outcome(uuid, text)', 'execute'), 'authenticated cannot execute record_class_outcome');
select ok(not has_function_privilege('authenticated', 'public.score_items_by_country(uuid, uuid[])', 'execute'), 'authenticated cannot execute score_items_by_country');
select ok(not has_function_privilege('anon', 'public.force_accept_votes(uuid)', 'execute'), 'anon cannot execute force_accept_votes');

-- ──────────────────────────────────────────────
-- Event log: board, period and value changes
-- ──────────────────────────────────────────────

-- The fixtures put Issue 1 on the class A board. A USA student removes it and
-- adds it again.
select tests.act_as('usa_a');
delete from public.deal_board_items where class_id = tests.id('class_a');
insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by)
values (tests.id('class_a'), tests.id('item_usa_a'), 'Issue 1', tests.id('team_usa_a'), tests.id('team_usa_a'), tests.id('usa_a'));

reset role;
select results_eq(
  $$select event_type, actor_id, actor_name, actor_team, item_id, item_name, details->>'giving_team'
      from public.simulation_events
     where class_id = tests.id('class_a') and event_type like 'board_item_%'
       and actor_id = tests.id('usa_a')
     order by id$$,
  $$values ('board_item_removed'::text, tests.id('usa_a'), 'USA Student A'::text, 'USA'::text, tests.id('item_usa_a'), 'Issue 1'::text, 'USA'::text),
           ('board_item_added'::text,   tests.id('usa_a'), 'USA Student A'::text, 'USA'::text, tests.id('item_usa_a'), 'Issue 1'::text, 'USA'::text)$$,
  'board changes are logged with the actor, team and item');

-- The instructor starts Round 2.
select tests.act_as('inst_a');
update public.classes set current_period = 2 where id = tests.id('class_a');
reset role;
select isnt((select round2_started_at from public.classes where id = tests.id('class_a')), null, 'entering period 2 sets round2_started_at');
select is(
  (select details from public.simulation_events
    where class_id = tests.id('class_a') and event_type = 'period_changed'
    order by id desc limit 1),
  '{"from": 1, "to": 2}'::jsonb,
  'a period change is logged');

-- A value change, then back, so later scores keep the fixture values.
select tests.act_as('inst_a');
update public.trade_items set value = 15 where id = tests.id('item_usa_a');
update public.trade_items set value = 10 where id = tests.id('item_usa_a');
reset role;
select results_eq(
  $$select actor_id, (details->>'old_value')::numeric, (details->>'new_value')::numeric
      from public.simulation_events
     where event_type = 'item_value_changed' and item_id = tests.id('item_usa_a')
     order by id$$,
  $$values (tests.id('inst_a'), 10::numeric, 15::numeric), (tests.id('inst_a'), 15::numeric, 10::numeric)$$,
  'value changes are logged with the old and new value');

-- ──────────────────────────────────────────────
-- force_accept_votes: deal path (class A, proposal_a pending, China
-- approved, USA has not voted)
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');
select throws_ok(
  $$select public.force_accept_votes(tests.id('proposal_a'))$$,
  'P0001', 'Not authorized to force-accept votes',
  'force_accept_votes refuses a student');
select tests.act_as('inst_b');
select throws_ok(
  $$select public.force_accept_votes(tests.id('proposal_a'))$$,
  'P0001', 'Not authorized to force-accept votes',
  'force_accept_votes refuses another instructor');

select tests.act_as('inst_a');
select is(
  (select public.force_accept_votes(tests.id('proposal_a')) - 'outcome'),
  '{"result": "executed", "votes_added": 1}'::jsonb,
  'force_accept_votes approves for the one member who did not vote and finalizes');

reset role;
select is(
  (select cast_by from public.votes where proposal_id = tests.id('proposal_a') and user_id = tests.id('usa_a')),
  tests.id('inst_a'),
  'the forced vote records the instructor in cast_by');
select is(
  (select cast_by from public.votes where proposal_id = tests.id('proposal_a') and user_id = tests.id('china_a')),
  null,
  'a vote the student cast keeps cast_by null');
select ok(
  (select current_period = 3 from public.classes where id = tests.id('class_a'))
  and (select status = 'executed' from public.trade_proposals where id = tests.id('proposal_a')),
  'the forced deal executes and ends the round');
select results_eq(
  $$select outcome, ended_by, ended_by_user, package_status, package_approvals, package_rejections,
           package_forced_approvals, package_usa_score, package_china_score,
           board_usa_score, board_china_score, usa_members, china_members,
           usa_no_deal_cost, china_no_deal_cost
      from public.class_outcomes where class_id = tests.id('class_a')$$,
  $$values ('deal'::text, 'ratified'::text, tests.id('inst_a'), 'executed'::text, 2, 0,
            1, 10::numeric, 20::numeric, 10::numeric, 20::numeric, 1, 1, -10, -20)$$,
  'a ratified deal writes one class_outcomes row with both scores');
select is(
  (select jsonb_array_length(board_items) from public.class_outcomes where class_id = tests.id('class_a')),
  1,
  'the outcome keeps the board items');
select is(
  (select details->>'reason' from public.simulation_events
    where class_id = tests.id('class_a') and event_type = 'board_item_removed'
    order by id desc limit 1),
  'deal_ratified',
  'the board clear after a deal is logged with its reason');

-- ──────────────────────────────────────────────
-- Class B: a reject still fails a forced vote, then the instructor ends
-- the round with no deal.
-- ──────────────────────────────────────────────

select tests.act_as('inst_b');
update public.classes set current_period = 2 where id = tests.id('class_b');

select tests.act_as('usa_b');
insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by)
values (tests.id('class_b'), tests.id('item_usa_b'), 'Issue 1', tests.id('team_usa_b'), tests.id('team_usa_b'), tests.id('usa_b'));
insert into public.trade_proposals
  (id, class_id, proposing_team_id, receiving_team_id, offered_items, requested_items, created_by, is_package)
values
  ('70000000-0000-0000-0000-0000000000b1', tests.id('class_b'), tests.id('team_usa_b'), tests.id('team_china_b'),
   jsonb_build_array(jsonb_build_object('item_id', tests.id('item_usa_b'), 'name', 'Issue 1')),
   '[]'::jsonb, tests.id('usa_b'), true);
insert into public.votes (proposal_id, user_id, team_id, vote)
values ('70000000-0000-0000-0000-0000000000b1', tests.id('usa_b'), tests.id('team_usa_b'), 'reject');

select tests.act_as('inst_b');
select is(
  (select public.force_accept_votes('70000000-0000-0000-0000-0000000000b1')),
  '{"result": "rejected", "votes_added": 1}'::jsonb,
  'force_accept_votes fails the deal when a member rejected');

reset role;
select is(
  (select status from public.trade_proposals where id = '70000000-0000-0000-0000-0000000000b1'),
  'rejected',
  'the package is rejected');
select is((select count(*)::int from public.deal_board_items where class_id = tests.id('class_b')), 0, 'a failed vote clears the board');
select is(
  (select details->>'reason' from public.simulation_events
    where class_id = tests.id('class_b') and event_type = 'board_item_removed'
    order by id desc limit 1),
  'vote_rejected',
  'the board clear after a failed vote is logged with its reason');
select is((select current_period from public.classes where id = tests.id('class_b')), 2, 'a failed vote keeps the round open');

-- The students build a new board. The instructor ends the round.
select tests.act_as('china_b');
insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by)
values (tests.id('class_b'), tests.id('item_china_b'), 'Issue 1', tests.id('team_china_b'), tests.id('team_china_b'), tests.id('china_b'));

-- Audit S8: no session, no round end.
select tests.act_as_anon();
select ok(tests.denied($$select public.end_bilateral_round(tests.id('class_b'))$$), 'S8: anon cannot end a round');
select tests.act_as('outsider');
select throws_ok(
  $$select public.end_bilateral_round(tests.id('class_b'))$$,
  'P0001', 'Not authorized to end this round',
  'end_bilateral_round refuses an outsider');

select tests.act_as('inst_b');
select is(
  (select public.end_bilateral_round(tests.id('class_b'))->>'outcome'),
  'no_deal',
  'end_bilateral_round returns the no-deal outcome');

reset role;
select results_eq(
  $$select outcome, ended_by, ended_by_user, board_usa_score, board_china_score,
           package_status, package_approvals, package_rejections, package_forced_approvals,
           package_usa_score, package_china_score
      from public.class_outcomes where class_id = tests.id('class_b')$$,
  $$values ('no_deal'::text, 'instructor'::text, tests.id('inst_b'), 30::numeric, 40::numeric,
            'rejected'::text, 1, 1, 1, 30::numeric, 40::numeric)$$,
  'a no-deal round records the board and the last package, scored as if approved');
select ok(
  (select usa_no_deal_cost is not null and china_no_deal_cost is not null
     from public.class_outcomes where class_id = tests.id('class_b')),
  'the no-deal outcome records both no-deal costs');
select is((select count(*)::int from public.team_scores where class_id = tests.id('class_b') and team_id = tests.id('team_china_b')), 0, 'a no-deal round writes no team score');
select is(
  (select details->>'reason' from public.simulation_events
    where class_id = tests.id('class_b') and event_type = 'board_item_removed'
    order by id desc limit 1),
  'round_end',
  'the board clear at round end is logged with its reason');

select tests.act_as('inst_b');
select is(
  (select public.end_bilateral_round(tests.id('class_b'))),
  null,
  'a second end_bilateral_round changes nothing');
reset role;
select is((select count(*)::int from public.class_outcomes where class_id = tests.id('class_b')), 1, 'a second end writes no second outcome');

reset role;
select * from finish();
rollback;
