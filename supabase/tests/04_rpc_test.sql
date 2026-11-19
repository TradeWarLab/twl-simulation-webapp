-- Database access tests: RPC functions.
-- get_no_deal_costs, assign_no_deal_cost, finalize_ratified_package,
-- end_bilateral_round, enroll_student, and S6 hardening.
-- Tests wrapped in todo_start/todo_end state a rule the baseline does not meet
-- yet. Remove the wrapper in the pull request that fixes the rule.

begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

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
-- get_no_deal_costs: both costs to the owner, own team cost to a student
-- (regression locks). Class A has USA -10, China -20.
-- ──────────────────────────────────────────────

select tests.act_as('inst_a');
select results_eq(
  $$select country, cost from public.get_no_deal_costs(tests.id('class_a')) order by country$$,
  $$values ('China'::text, -20), ('USA'::text, -10)$$,
  'get_no_deal_costs gives the owner both costs');

select tests.act_as('usa_a');
select results_eq(
  $$select country, cost from public.get_no_deal_costs(tests.id('class_a'))$$,
  $$values ('USA'::text, -10)$$,
  'get_no_deal_costs gives a USA student only the USA cost');

select tests.act_as('china_a');
select results_eq(
  $$select country, cost from public.get_no_deal_costs(tests.id('class_a'))$$,
  $$values ('China'::text, -20)$$,
  'get_no_deal_costs gives a China student only the China cost');

select tests.act_as('unassigned_a');
select ok(tests.denied($$select * from public.get_no_deal_costs(tests.id('class_a'))$$), 'get_no_deal_costs gives a student with no team nothing');
select tests.act_as('outsider');
select ok(tests.denied($$select * from public.get_no_deal_costs(tests.id('class_a'))$$), 'get_no_deal_costs gives an outsider nothing');
select tests.act_as('inst_b');
select ok(tests.denied($$select * from public.get_no_deal_costs(tests.id('class_a'))$$), 'get_no_deal_costs gives another instructor nothing');
select tests.act_as_anon();
select ok(tests.denied($$select * from public.get_no_deal_costs(tests.id('class_a'))$$), 'get_no_deal_costs gives anon nothing');

-- ──────────────────────────────────────────────
-- assign_no_deal_cost is internal (regression locks)
-- ──────────────────────────────────────────────

reset role;
select ok(not has_function_privilege('authenticated', 'public.assign_no_deal_cost(uuid)', 'execute'), 'authenticated cannot execute assign_no_deal_cost');
select ok(not has_function_privilege('anon', 'public.assign_no_deal_cost(uuid)', 'execute'), 'anon cannot execute assign_no_deal_cost');

select tests.act_as('usa_a');
select throws_ok(
  $$select public.assign_no_deal_cost(tests.id('class_b'))$$,
  '42501', null,
  'a student call to assign_no_deal_cost is refused');

-- ──────────────────────────────────────────────
-- S6. Hardening of SECURITY DEFINER functions
-- ──────────────────────────────────────────────

reset role;

select todo_start('Audit S6: client RPCs are executable by anon; no function sets search_path');
select ok(not has_function_privilege('anon', 'public.enroll_student(text)', 'execute'), 'S6: anon cannot execute enroll_student');
select ok(not has_function_privilege('anon', 'public.finalize_ratified_package(uuid)', 'execute'), 'S6: anon cannot execute finalize_ratified_package');
select ok(not has_function_privilege('anon', 'public.end_bilateral_round(uuid)', 'execute'), 'S6: anon cannot execute end_bilateral_round');
select ok(not has_function_privilege('anon', 'public.get_no_deal_costs(uuid)', 'execute'), 'S6: anon cannot execute get_no_deal_costs');
select is_empty(
  $$select p.proname from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef
       and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')$$,
  'S6: every SECURITY DEFINER function in public sets search_path');
select todo_end();

-- end_bilateral_round compares instructor_id <> auth.uid(). For anon
-- auth.uid() is null, the test is null, and the owner check is skipped.
update public.classes set current_period = 2 where id = tests.id('class_a');
select tests.act_as_anon();
select todo_start('New finding (S6): end_bilateral_round owner check is skipped when auth.uid() is null');
select ok(tests.denied($$select public.end_bilateral_round(tests.id('class_a'))$$), 'S6: anon cannot end the class A round');
select todo_end();

-- ──────────────────────────────────────────────
-- finalize_ratified_package (class A in period 2, proposal_a pending,
-- China has voted, USA has not)
-- ──────────────────────────────────────────────

select tests.act_as('outsider');
select ok(tests.denied($$select public.finalize_ratified_package(tests.id('proposal_a'))$$), 'an outsider cannot finalize a class A deal');
select tests.act_as_anon();
select ok(tests.denied($$select public.finalize_ratified_package(tests.id('proposal_a'))$$), 'anon cannot finalize a deal');
select tests.act_as('usa_a');
select ok(tests.denied($$select public.finalize_ratified_package(tests.id('proposal_a'))$$), 'finalize refuses a deal that is not unanimous');

-- Vote stuffing: an outsider adds the missing approval. Setup only, so an
-- error (the secure result) is ignored here.
select tests.act_as('outsider');
do $do$
begin
  insert into public.votes (proposal_id, user_id, team_id, vote)
  values (tests.id('proposal_a'), tests.id('outsider'), tests.id('team_usa_a'), 'approve');
exception when others then
  null;
end;
$do$;

select tests.act_as('usa_a');
select todo_start('Audit S3: finalize_ratified_package counts votes from non-members');
select ok(tests.denied($$select public.finalize_ratified_package(tests.id('proposal_a'))$$), 'S3: finalize does not succeed when non-member votes fill the count');
select todo_end();

-- A real unanimous approval finalizes the deal.
reset role;
delete from public.votes where user_id = tests.id('outsider');
insert into public.votes (proposal_id, user_id, team_id, vote) values
  (tests.id('proposal_a'), tests.id('usa_a'), tests.id('team_usa_a'), 'approve');

select tests.act_as('usa_a');
select lives_ok($$select public.finalize_ratified_package(tests.id('proposal_a'))$$, 'finalize succeeds with a unanimous approval');

reset role;
select is((select status from public.trade_proposals where id = tests.id('proposal_a')), 'executed', 'finalize marks the package executed');
select is((select count(*)::int from public.trade_items where class_id = tests.id('class_a') and is_resolved), 2, 'finalize resolves both mirror items');
select results_eq(
  $$select t.country, s.score from public.team_scores s join public.teams t on t.id = s.team_id
     where s.class_id = tests.id('class_a') order by t.country$$,
  $$values ('China'::text, 20::numeric), ('USA'::text, 10::numeric)$$,
  'finalize scores each team with its own values');
select is((select count(*)::int from public.deal_board_items where class_id = tests.id('class_a')), 0, 'finalize clears the deal board');
select is((select count(*)::int from public.deal_ratification_calls where class_id = tests.id('class_a')), 0, 'finalize clears the ratification calls');
select is((select current_period from public.classes where id = tests.id('class_a')), 3, 'finalize moves the class to period 3');

-- ──────────────────────────────────────────────
-- end_bilateral_round
-- ──────────────────────────────────────────────

-- New pending package, board item and call. Class A back in period 1.
insert into public.trade_proposals
  (id, class_id, proposing_team_id, receiving_team_id, offered_items, requested_items, created_by, is_package)
values
  (tests.id('proposal_a2'), tests.id('class_a'), tests.id('team_china_a'), tests.id('team_usa_a'),
   '[]'::jsonb, '[]'::jsonb, tests.id('china_a'), true);
insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by) values
  (tests.id('class_a'), tests.id('item_usa_a'), 'Issue 1', tests.id('team_usa_a'), tests.id('team_usa_a'), tests.id('usa_a'));
insert into public.deal_ratification_calls (class_id, team_id, called_by) values
  (tests.id('class_a'), tests.id('team_china_a'), tests.id('china_a'));
update public.classes set current_period = 1 where id = tests.id('class_a');

select tests.act_as('usa_a');
select throws_ok(
  $$select public.end_bilateral_round(tests.id('class_a'))$$,
  'P0001', 'Not authorized to end this round',
  'end_bilateral_round refuses a student');
select tests.act_as('inst_b');
select throws_ok(
  $$select public.end_bilateral_round(tests.id('class_a'))$$,
  'P0001', 'Not authorized to end this round',
  'end_bilateral_round refuses another instructor');

-- Outside period 2 the owner call changes nothing.
select tests.act_as('inst_a');
select lives_ok($$select public.end_bilateral_round(tests.id('class_a'))$$, 'end_bilateral_round runs for the owner in period 1');
reset role;
select ok(
  (select current_period = 1 and status = 'active' from public.classes where id = tests.id('class_a')),
  'end_bilateral_round outside period 2 keeps the period and status');
select ok(
  (select status = 'pending' from public.trade_proposals where id = tests.id('proposal_a2'))
  and exists (select 1 from public.deal_board_items where class_id = tests.id('class_a')),
  'end_bilateral_round outside period 2 keeps the package and the board');

-- In period 2 the owner ends the round.
update public.classes set current_period = 2 where id = tests.id('class_a');
select tests.act_as('inst_a');
select lives_ok($$select public.end_bilateral_round(tests.id('class_a'))$$, 'end_bilateral_round runs for the owner in period 2');
reset role;
select ok(
  (select current_period = 3 and status = 'archived' from public.classes where id = tests.id('class_a')),
  'end_bilateral_round moves the class to period 3 and archives it');
select is((select status from public.trade_proposals where id = tests.id('proposal_a2')), 'rejected', 'end_bilateral_round rejects the pending package');
select is((select status from public.trade_proposals where id = tests.id('proposal_a')), 'executed', 'end_bilateral_round keeps an executed package');
select is((select count(*)::int from public.deal_board_items where class_id = tests.id('class_a')), 0, 'end_bilateral_round clears the deal board');
select is((select count(*)::int from public.deal_ratification_calls where class_id = tests.id('class_a')), 0, 'end_bilateral_round clears the ratification calls');

-- ──────────────────────────────────────────────
-- enroll_student
-- ──────────────────────────────────────────────

select tests.act_as('outsider');
select throws_ok(
  $$select public.enroll_student('NOSUCH1')$$,
  'P0001', 'Invalid class code',
  'enroll_student rejects a bad code');
select tests.act_as('usa_a');
select throws_ok(
  $$select public.enroll_student('TSTCLSA')$$,
  'P0001', 'You are already enrolled in this class',
  'enroll_student rejects a student who is already enrolled');
select tests.act_as_anon();
select ok(tests.denied($$select public.enroll_student('TSTCLSA')$$), 'enroll_student refuses anon');

-- The outsider has a China invite for class A. Code case and spaces do not matter.
select tests.act_as('outsider');
select lives_ok($$select public.enroll_student(' tstclsa ')$$, 'enroll_student enrolls with a valid code');
reset role;
select ok(
  exists (select 1 from public.students_classes
           where student_id = tests.id('outsider') and class_id = tests.id('class_a')
             and team_id = tests.id('team_china_a')),
  'enroll_student puts the student on the invited team');
select is(
  (select status from public.class_invites where class_id = tests.id('class_a') and email = 'outsider@test.local'),
  'account_created',
  'enroll_student marks the invite used');
select tests.act_as('outsider');
select throws_ok(
  $$select public.enroll_student('TSTCLSA')$$,
  'P0001', 'You are already enrolled in this class',
  'enroll_student rejects a second enrollment');

-- Invite takeover: a student sets their email to an invited address, then
-- enrolls. Setup only, so errors (the secure result) are ignored here.
select tests.act_as('usa_b');
do $do$
begin
  update public.users set email = 'invitee@test.local' where id = tests.id('usa_b');
exception when others then
  null;
end;
$do$;
do $do$
begin
  perform public.enroll_student('TSTCLSA');
exception when others then
  null;
end;
$do$;

reset role;
select todo_start('Audit S4: enroll_student matches invites on the user-editable public.users email');
select ok(
  not exists (select 1 from public.students_classes
               where student_id = tests.id('usa_b') and class_id = tests.id('class_a')
                 and team_id is not null),
  'S4: a student cannot take another invite by changing their email');
select todo_end();

reset role;
select * from finish();
rollback;
