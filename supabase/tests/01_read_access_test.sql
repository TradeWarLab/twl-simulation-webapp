-- Database access tests: reads.
-- S1: anonymous callers, outsiders and other instructors read nothing of a class.
-- S2: a team does not read the other team's channel or valuations before period 3.
-- Tests wrapped in todo_start/todo_end state a rule the baseline does not meet
-- yet. Remove the wrapper in the pull request that fixes the rule.

begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

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

-- ──────────────────────────────────────────────
-- S1. Anonymous callers read nothing
-- ──────────────────────────────────────────────

select tests.act_as_anon();

select todo_start('Audit S1: anon has table grants and using (true) policies');
select ok(tests.denied($$select 1 from public.users$$), 'S1: anon cannot read users');
select ok(tests.denied($$select 1 from public.messages$$), 'S1: anon cannot read messages');
select ok(tests.denied($$select 1 from public.classes$$), 'S1: anon cannot read classes');
select ok(tests.denied($$select 1 from public.students_classes$$), 'S1: anon cannot read students_classes');
select ok(tests.denied($$select 1 from public.votes$$), 'S1: anon cannot read votes');
select ok(tests.denied($$select 1 from public.trade_proposals$$), 'S1: anon cannot read trade_proposals');
select ok(tests.denied($$select 1 from public.team_scores$$), 'S1: anon cannot read team_scores');
select ok(tests.denied($$select 1 from public.teams$$), 'S1: anon cannot read teams');
select ok(tests.denied($$select 1 from public.briefings$$), 'S1: anon cannot read briefings');
select ok(tests.denied($$select 1 from public.deal_board_items$$), 'S1: anon cannot read deal_board_items');
select ok(tests.denied($$select 1 from public.deal_ratification_calls$$), 'S1: anon cannot read deal_ratification_calls');
select todo_end();
select ok(tests.denied($$select 1 from public.trade_items$$), 'anon cannot read trade_items');

-- Already closed today. Keep them closed.
select ok(tests.denied($$select 1 from public.survey_responses$$), 'anon cannot read survey_responses');
select ok(tests.denied($$select 1 from public.class_invites$$), 'anon cannot read class_invites');
select ok(tests.denied($$select 1 from public.instructor_survey_responses$$), 'anon cannot read instructor_survey_responses');
select ok(tests.denied($$select 1 from public.no_deal_cost_slots$$), 'anon cannot read no_deal_cost_slots');

-- ──────────────────────────────────────────────
-- S1. An outsider (signed in, enrolled nowhere) cannot read class A
-- ──────────────────────────────────────────────

select tests.act_as('outsider');

select todo_start('Audit S1: using (true) policies open class rows to every signed-in user');
select ok(tests.denied($$select 1 from public.users where id in (tests.id('inst_a'), tests.id('usa_a'), tests.id('china_a'), tests.id('unassigned_a'))$$), 'S1: outsider cannot read profiles of class A members');
select ok(tests.denied($$select 1 from public.messages where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A messages');
select ok(tests.denied($$select 1 from public.classes where id = tests.id('class_a')$$), 'S1: outsider cannot read class A');
select ok(tests.denied($$select 1 from public.students_classes where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A enrollments');
select ok(tests.denied($$select 1 from public.votes where proposal_id = tests.id('proposal_a')$$), 'S1: outsider cannot read class A votes');
select ok(tests.denied($$select 1 from public.trade_proposals where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A trade_proposals');
select ok(tests.denied($$select 1 from public.team_scores where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A team_scores');
select ok(tests.denied($$select 1 from public.teams where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A teams');
select ok(tests.denied($$select 1 from public.briefings where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A briefings');
select ok(tests.denied($$select 1 from public.deal_board_items where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A deal_board_items');
select ok(tests.denied($$select 1 from public.deal_ratification_calls where class_id = tests.id('class_a')$$), 'S1: outsider cannot read class A deal_ratification_calls');
select todo_end();
select ok(tests.denied($$select 1 from public.trade_items where class_id = tests.id('class_a')$$), 'outsider cannot read class A trade_items');

select ok(tests.denied($$select 1 from public.class_invites where class_id = tests.id('class_a')$$), 'outsider cannot read class A class_invites');
select ok(tests.denied($$select 1 from public.survey_responses where class_id = tests.id('class_a')$$), 'outsider cannot read class A survey_responses');

-- ──────────────────────────────────────────────
-- S1. The instructor of class B cannot read class A
-- ──────────────────────────────────────────────

select tests.act_as('inst_b');

select todo_start('Audit S1: using (true) policies open class rows to other instructors');
select ok(tests.denied($$select 1 from public.users where id in (tests.id('usa_a'), tests.id('china_a'), tests.id('unassigned_a'))$$), 'S1: instructor B cannot read profiles of class A students');
select ok(tests.denied($$select 1 from public.messages where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A messages');
select ok(tests.denied($$select 1 from public.classes where id = tests.id('class_a')$$), 'S1: instructor B cannot read class A');
select ok(tests.denied($$select 1 from public.students_classes where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A enrollments');
select ok(tests.denied($$select 1 from public.votes where proposal_id = tests.id('proposal_a')$$), 'S1: instructor B cannot read class A votes');
select ok(tests.denied($$select 1 from public.trade_proposals where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A trade_proposals');
select ok(tests.denied($$select 1 from public.team_scores where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A team_scores');
select ok(tests.denied($$select 1 from public.teams where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A teams');
select ok(tests.denied($$select 1 from public.briefings where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A briefings');
select ok(tests.denied($$select 1 from public.deal_board_items where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A deal_board_items');
select ok(tests.denied($$select 1 from public.deal_ratification_calls where class_id = tests.id('class_a')$$), 'S1: instructor B cannot read class A deal_ratification_calls');
select todo_end();
select ok(tests.denied($$select 1 from public.trade_items where class_id = tests.id('class_a')$$), 'instructor B cannot read class A trade_items');

-- ──────────────────────────────────────────────
-- S1. Email addresses: students see names only, instructors see their roster
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select todo_start('Audit S1: users select is using (true) with no column limit');
select ok(tests.denied($$select 1 from public.users where id <> auth.uid() and email is not null$$), 'S1: a student cannot read the email of another user');
select todo_end();

select tests.act_as('inst_a');
select is(tests.attempt($$select 1 from public.users where id in (tests.id('usa_a'), tests.id('china_a'), tests.id('unassigned_a')) and email is not null$$), 'rows=3', 'instructor A can read the emails of class A students');

-- ──────────────────────────────────────────────
-- S2. Team confidentiality before the End period (class A in period 1)
-- ──────────────────────────────────────────────

select todo_start('Audit S2: messages select is using (true)');
select tests.act_as('usa_a');
select ok(tests.denied($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'team_china'$$), 'S2: USA student cannot read the team_china channel');
select tests.act_as('china_a');
select ok(tests.denied($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'team_usa'$$), 'S2: China student cannot read the team_usa channel');
select todo_end();

select tests.act_as('usa_a');
select ok(tests.denied($$select 1 from public.trade_items where team_id = tests.id('team_china_a')$$), 'USA student cannot read China trade_items before period 3');
select tests.act_as('china_a');
select ok(tests.denied($$select 1 from public.trade_items where team_id = tests.id('team_usa_a')$$), 'China student cannot read USA trade_items before period 3');
select tests.act_as('unassigned_a');
select ok(tests.denied($$select 1 from public.trade_items where class_id = tests.id('class_a')$$), 'a student with no team cannot read trade_items before period 3');

select tests.act_as('usa_a');
select is(tests.attempt($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'team_usa'$$), 'rows=1', 'USA student can read the team_usa channel');
select is(tests.attempt($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'global'$$), 'rows=1', 'USA student can read the global channel');
select is(tests.attempt($$select 1 from public.trade_items where team_id = tests.id('team_usa_a')$$), 'rows=1', 'USA student can read own team trade_items');

select tests.act_as('china_a');
select is(tests.attempt($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'team_china'$$), 'rows=1', 'China student can read the team_china channel');
select is(tests.attempt($$select 1 from public.messages where class_id = tests.id('class_a') and channel = 'global'$$), 'rows=1', 'China student can read the global channel');
select is(tests.attempt($$select 1 from public.trade_items where team_id = tests.id('team_china_a')$$), 'rows=1', 'China student can read own team trade_items');

select tests.act_as('inst_a');
select is(tests.attempt($$select 1 from public.messages where class_id = tests.id('class_a')$$), 'rows=3', 'instructor A can read all class A channels');
select is(tests.attempt($$select 1 from public.trade_items where class_id = tests.id('class_a')$$), 'rows=2', 'instructor A can read both teams trade_items');

-- After the End period both sides are revealed to enrolled students.
reset role;
update public.classes set current_period = 3 where id = tests.id('class_a');

select tests.act_as('usa_a');
select is(tests.attempt($$select 1 from public.trade_items where team_id = tests.id('team_china_a')$$), 'rows=1', 'USA student can read China trade_items in period 3');
select tests.act_as('china_a');
select is(tests.attempt($$select 1 from public.trade_items where team_id = tests.id('team_usa_a')$$), 'rows=1', 'China student can read USA trade_items in period 3');

-- ──────────────────────────────────────────────
-- Closed tables stay closed to students (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('china_a');
select is(tests.attempt($$select 1 from public.survey_responses where student_id = auth.uid()$$), 'rows=1', 'a student can read own survey response');
select ok(tests.denied($$select 1 from public.class_invites$$), 'a student cannot read class_invites');

select tests.act_as('usa_a');
select ok(tests.denied($$select 1 from public.survey_responses where student_id = tests.id('china_a')$$), 'a student cannot read another student survey response');
select ok(tests.denied($$select 1 from public.no_deal_cost_slots$$), 'a student cannot read no_deal_cost_slots');
select ok(tests.denied($$select 1 from public.instructor_survey_responses$$), 'a student cannot read instructor_survey_responses');

select tests.act_as('inst_a');
select is(tests.attempt($$select 1 from public.survey_responses where class_id = tests.id('class_a')$$), 'rows=1', 'instructor A can read class A survey responses');
select is(tests.attempt($$select 1 from public.class_invites where class_id = tests.id('class_a')$$), 'rows=2', 'instructor A can read class A invites');
select is(tests.attempt($$select 1 from public.no_deal_cost_slots where class_id = tests.id('class_a')$$), 'rows=1', 'instructor A can read the class A no-deal cost slot');
select is(tests.attempt($$select 1 from public.instructor_survey_responses$$), 'rows=1', 'instructor A reads only own intake response');

reset role;
select * from finish();
rollback;
