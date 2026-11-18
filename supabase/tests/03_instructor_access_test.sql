-- Database access tests: instructors.
-- A class owner manages their own class. Another instructor cannot change or
-- read the private data of that class. Students cannot do instructor work.
-- Tests wrapped in todo_start/todo_end state a rule the baseline does not meet
-- yet. Remove the wrapper in the pull request that fixes the rule.

begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

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

-- Each write runs through tests.attempt, which rolls it back.

-- ──────────────────────────────────────────────
-- A class owner manages their own class (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('inst_a');

select is(tests.attempt($$update public.classes set name = 'Renamed A' where id = tests.id('class_a')$$), 'rows=1', 'owner can update own class');
select is(tests.attempt($$update public.teams set country = country where class_id = tests.id('class_a')$$), 'rows=2', 'owner can update own class teams');
select is(tests.attempt($$update public.students_classes set team_id = tests.id('team_usa_a') where student_id = tests.id('unassigned_a') and class_id = tests.id('class_a')$$), 'rows=1', 'owner can assign a student to a team');
select is(tests.attempt($$insert into public.students_classes (student_id, class_id, team_id) values (tests.id('outsider'), tests.id('class_a'), tests.id('team_china_a'))$$), 'rows=1', 'owner can enroll a student');
select is(tests.attempt($$insert into public.briefings (class_id, title, target_role) values (tests.id('class_a'), 'New briefing', 'USA')$$), 'rows=1', 'owner can add a briefing');
select is(tests.attempt($$update public.briefings set title = 'Edited' where id = tests.id('briefing_a')$$), 'rows=1', 'owner can edit a briefing');
select is(tests.attempt($$delete from public.briefings where id = tests.id('briefing_a')$$), 'rows=1', 'owner can delete a briefing');
select is(tests.attempt($$insert into public.trade_items (class_id, team_id, name, value) values (tests.id('class_a'), tests.id('team_usa_a'), 'Issue 2', 5)$$), 'rows=1', 'owner can add a trade item');
select is(tests.attempt($$update public.trade_items set value = 50 where id = tests.id('item_china_a')$$), 'rows=1', 'owner can edit a trade item');
select is(tests.attempt($$delete from public.trade_items where id = tests.id('item_china_a')$$), 'rows=1', 'owner can delete a trade item');
select is(tests.attempt($$insert into public.class_invites (class_id, invited_by, email, affiliation) values (tests.id('class_a'), auth.uid(), 'new@test.local', 'USA')$$), 'rows=1', 'owner can invite a student');

-- ──────────────────────────────────────────────
-- The instructor of class B cannot change class A (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('inst_b');

select ok(tests.denied($$update public.classes set name = 'Taken' where id = tests.id('class_a')$$), 'instructor B cannot update class A');
select ok(tests.denied($$update public.classes set current_period = 2 where id = tests.id('class_a')$$), 'instructor B cannot change the class A period');
select ok(tests.denied($$update public.teams set country = country where class_id = tests.id('class_a')$$), 'instructor B cannot update class A teams');
select ok(tests.denied($$delete from public.teams where class_id = tests.id('class_a')$$), 'instructor B cannot delete class A teams');
select ok(tests.denied($$insert into public.students_classes (student_id, class_id, team_id) values (tests.id('outsider'), tests.id('class_a'), tests.id('team_usa_a'))$$), 'instructor B cannot enroll a student in class A');
select ok(tests.denied($$update public.students_classes set team_id = null where class_id = tests.id('class_a')$$), 'instructor B cannot change class A enrollments');
select ok(tests.denied($$insert into public.briefings (class_id, title, target_role) values (tests.id('class_a'), 'Fake', 'All')$$), 'instructor B cannot add a class A briefing');
select ok(tests.denied($$update public.briefings set title = 'Fake' where id = tests.id('briefing_a')$$), 'instructor B cannot edit a class A briefing');
select ok(tests.denied($$insert into public.trade_items (class_id, team_id, name, value) values (tests.id('class_a'), tests.id('team_usa_a'), 'Issue 2', 5)$$), 'instructor B cannot add a class A trade item');
select ok(tests.denied($$update public.trade_items set value = 0 where class_id = tests.id('class_a')$$), 'instructor B cannot edit class A trade items');
select ok(tests.denied($$insert into public.class_invites (class_id, invited_by, email, affiliation) values (tests.id('class_a'), auth.uid(), 'x@test.local', 'USA')$$), 'instructor B cannot invite to class A');
select ok(tests.denied($$delete from public.class_invites where class_id = tests.id('class_a')$$), 'instructor B cannot delete class A invites');
select ok(tests.denied($$insert into public.instructor_survey_responses (class_id, instructor_id, answers) values (tests.id('class_a'), auth.uid(), '{}'::jsonb)$$), 'instructor B cannot submit the class A intake survey');

-- Private class A data stays private.
select ok(tests.denied($$select 1 from public.class_invites where class_id = tests.id('class_a')$$), 'instructor B cannot read class A invites');
select ok(tests.denied($$select 1 from public.survey_responses where class_id = tests.id('class_a')$$), 'instructor B cannot read class A survey responses');
select ok(tests.denied($$select 1 from public.instructor_survey_responses where class_id = tests.id('class_a')$$), 'instructor B cannot read the class A intake response');
select ok(tests.denied($$select 1 from public.no_deal_cost_slots where class_id = tests.id('class_a')$$), 'instructor B cannot read the class A no-deal cost');

-- Instructor B still has full access to class B.
select is(tests.attempt($$select 1 from public.class_invites where class_id = tests.id('class_b')$$), 'rows=1', 'instructor B can read class B invites');

select todo_start('Audit S3: messages insert checks only sender_id');
select ok(tests.denied($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'global', 'spam')$$), 'S3: instructor B cannot post in class A');
select todo_end();

-- ──────────────────────────────────────────────
-- Students cannot do instructor work (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select ok(tests.denied($$insert into public.briefings (class_id, title, target_role) values (tests.id('class_a'), 'Fake', 'All')$$), 'a student cannot add a briefing');
select ok(tests.denied($$delete from public.trade_items where id = tests.id('item_usa_a')$$), 'a student cannot delete a trade item');
select ok(tests.denied($$insert into public.trade_items (class_id, team_id, name, value) values (tests.id('class_a'), tests.id('team_usa_a'), 'Issue 2', 5)$$), 'a student cannot add a trade item');
select ok(tests.denied($$insert into public.class_invites (class_id, invited_by, email, affiliation) values (tests.id('class_a'), auth.uid(), 'x@test.local', 'USA')$$), 'a student cannot invite to a class');
select ok(tests.denied($$update public.teams set country = country where class_id = tests.id('class_a')$$), 'a student cannot update teams');

reset role;
select * from finish();
rollback;
