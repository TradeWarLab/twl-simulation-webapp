-- Database access tests: writes by students and other signed-in users.
-- S3: no direct writes to outcome data. S4: identity fields are not editable.
-- Tests wrapped in todo_start/todo_end state a rule the baseline does not meet
-- yet. Remove the wrapper in the pull request that fixes the rule.

begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

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

-- Each write runs through tests.attempt, which rolls it back. A refused write
-- shows as 0 rows or an error code. That is the same proof as reading the row
-- back, and a write that is wrongly allowed does not change later tests.

-- ──────────────────────────────────────────────
-- S3. team_scores: only the system writes scores
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select todo_start('Audit S3: "Class members can manage scores." lets any class member write team_scores');
select ok(tests.denied($$insert into public.team_scores (class_id, team_id, score) values (tests.id('class_a'), tests.id('team_china_a'), 99)$$), 'S3: a student cannot insert team_scores');
select ok(tests.denied($$update public.team_scores set score = 99 where class_id = tests.id('class_a')$$), 'S3: a student cannot update team_scores');
select ok(tests.denied($$delete from public.team_scores where class_id = tests.id('class_a')$$), 'S3: a student cannot delete team_scores');
select todo_end();

select tests.act_as('outsider');
select ok(tests.denied($$update public.team_scores set score = 99 where class_id = tests.id('class_a')$$), 'an outsider cannot update class A team_scores');

-- ──────────────────────────────────────────────
-- S3. trade_proposals: no direct status or item changes
-- ──────────────────────────────────────────────

select todo_start('Audit S3: "Class members can update proposal status." lets any class member update any column');
select tests.act_as('usa_a');
select ok(tests.denied($$update public.trade_proposals set status = 'executed' where id = tests.id('proposal_a')$$), 'S3: a student cannot set trade_proposals status');
select tests.act_as('china_a');
select ok(tests.denied($$update public.trade_proposals set offered_items = '[]'::jsonb where id = tests.id('proposal_a')$$), 'S3: a student cannot change trade_proposals items');
select todo_end();

select tests.act_as('outsider');
select ok(tests.denied($$update public.trade_proposals set status = 'executed' where id = tests.id('proposal_a')$$), 'an outsider cannot update class A trade_proposals');

select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.trade_proposals (class_id, proposing_team_id, receiving_team_id, offered_items, requested_items, created_by) values (tests.id('class_a'), tests.id('team_china_a'), tests.id('team_usa_a'), '[]'::jsonb, '[]'::jsonb, auth.uid())$$), 'a student cannot create a proposal for the other team');

-- ──────────────────────────────────────────────
-- S3. votes: members only, own team only
-- ──────────────────────────────────────────────

select todo_start('Audit S3: votes insert checks only user_id');
select tests.act_as('outsider');
select ok(tests.denied($$insert into public.votes (proposal_id, user_id, team_id, vote) values (tests.id('proposal_a'), auth.uid(), tests.id('team_usa_a'), 'approve')$$), 'S3: an outsider cannot vote on a class A proposal');
select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.votes (proposal_id, user_id, team_id, vote) values (tests.id('proposal_a'), auth.uid(), tests.id('team_china_a'), 'approve')$$), 'S3: a student cannot vote with the other team id');
-- The update policy has no with check, so a voter can move their own vote.
select tests.act_as('china_a');
select ok(tests.denied($$update public.votes set team_id = tests.id('team_usa_a') where user_id = auth.uid()$$), 'S3: a student cannot change the team_id of own vote');
select todo_end();

select tests.act_as('usa_a');

select ok(tests.denied($$update public.votes set vote = 'reject' where user_id = tests.id('china_a')$$), 'a student cannot change another student vote');

-- ──────────────────────────────────────────────
-- S3. trade_items: students change only value, own team, period 1
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select todo_start('Audit S3: trade_items update has no column limit');
select ok(tests.denied($$update public.trade_items set is_resolved = true where id = tests.id('item_usa_a')$$), 'S3: a student cannot set is_resolved');
select ok(tests.denied($$update public.trade_items set name = 'Renamed' where id = tests.id('item_usa_a')$$), 'S3: a student cannot change trade_items name');
select ok(tests.denied($$update public.trade_items set role = 'concession' where id = tests.id('item_usa_a')$$), 'S3: a student cannot change trade_items role');
-- New row check passes because class B is also in period 1.
select ok(tests.denied($$update public.trade_items set class_id = tests.id('class_b') where id = tests.id('item_usa_a')$$), 'S3: a student cannot move own item to another class');
select todo_end();

-- The policy has no with check, so its using clause checks the new row. The
-- student is not on the China team, so this fails today too.
select ok(tests.denied($$update public.trade_items set team_id = tests.id('team_china_a') where id = tests.id('item_usa_a')$$), 'a student cannot change trade_items team_id');
select ok(tests.denied($$update public.trade_items set value = 5 where id = tests.id('item_china_a')$$), 'a student cannot update the other team trade_items');
select is(tests.attempt($$update public.trade_items set value = 7 where id = tests.id('item_usa_a')$$), 'rows=1', 'a student can update own team value in period 1');

reset role;
update public.classes set current_period = 2 where id = tests.id('class_a');
select tests.act_as('usa_a');
select ok(tests.denied($$update public.trade_items set value = 7 where id = tests.id('item_usa_a')$$), 'a student cannot update own value in period 2');

reset role;
update public.classes set current_period = 3 where id = tests.id('class_a');
select tests.act_as('usa_a');
select ok(tests.denied($$update public.trade_items set value = 7 where id = tests.id('item_usa_a')$$), 'a student cannot update own value in period 3');

reset role;
update public.classes set current_period = 1 where id = tests.id('class_a');

-- ──────────────────────────────────────────────
-- S2, S3. messages: members only, own channels only
-- ──────────────────────────────────────────────

select todo_start('Audit S3: messages insert checks only sender_id');
select tests.act_as('outsider');
select ok(tests.denied($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'global', 'spam')$$), 'S3: an outsider cannot post in class A');
select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'team_china', 'hello')$$), 'S2: a student cannot post to the other team channel');
select ok(tests.denied($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'backchannel', 'hello')$$), 'S2: a student cannot post to an unknown channel');
select todo_end();

select tests.act_as('usa_a');
select is(tests.attempt($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'global', 'hello')$$), 'rows=1', 'a student can post to the global channel');
select is(tests.attempt($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), auth.uid(), 'team_usa', 'hello')$$), 'rows=1', 'a student can post to own team channel');
select ok(tests.denied($$insert into public.messages (class_id, sender_id, channel, content) values (tests.id('class_a'), tests.id('china_a'), 'global', 'fake')$$), 'a student cannot post as another user');

-- ──────────────────────────────────────────────
-- S3. deal_board_items: edits only in period 2 (class A is in period 1)
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select todo_start('Audit S3: deal_board_items insert and delete do not check the period');
select ok(tests.denied($$insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by) values (tests.id('class_a'), tests.id('item_usa_a'), 'Issue 2', tests.id('team_usa_a'), tests.id('team_usa_a'), auth.uid())$$), 'S3: a student cannot add a board item outside period 2');
select ok(tests.denied($$delete from public.deal_board_items where class_id = tests.id('class_a')$$), 'S3: a student cannot remove a board item outside period 2');
select todo_end();

select tests.act_as('outsider');
select ok(tests.denied($$insert into public.deal_board_items (class_id, item_id, name, giving_team_id, added_by_team_id, added_by) values (tests.id('class_a'), tests.id('item_usa_a'), 'Issue 2', tests.id('team_usa_a'), tests.id('team_usa_a'), auth.uid())$$), 'an outsider cannot add a class A board item');

-- ──────────────────────────────────────────────
-- deal_ratification_calls: own team only (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.deal_ratification_calls (class_id, team_id, called_by) values (tests.id('class_a'), tests.id('team_china_a'), auth.uid())$$), 'a student cannot call ratification for the other team');
select tests.act_as('outsider');
select ok(tests.denied($$delete from public.deal_ratification_calls where class_id = tests.id('class_a')$$), 'an outsider cannot withdraw a class A ratification call');

-- ──────────────────────────────────────────────
-- survey_responses: own row, own team, period 3 only (regression locks)
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.survey_responses (class_id, student_id, team_id, answers) values (tests.id('class_a'), auth.uid(), tests.id('team_usa_a'), '{}'::jsonb)$$), 'a student cannot submit the survey before period 3');

reset role;
update public.classes set current_period = 3 where id = tests.id('class_a');

select tests.act_as('usa_a');
select ok(tests.denied($$insert into public.survey_responses (class_id, student_id, team_id, answers) values (tests.id('class_a'), auth.uid(), tests.id('team_china_a'), '{}'::jsonb)$$), 'a student cannot submit the survey for the other team');
select is(tests.attempt($$insert into public.survey_responses (class_id, student_id, team_id, answers) values (tests.id('class_a'), auth.uid(), tests.id('team_usa_a'), '{}'::jsonb)$$), 'rows=1', 'a student can submit the survey for own team in period 3');
select tests.act_as('outsider');
select ok(tests.denied($$insert into public.survey_responses (class_id, student_id, team_id, answers) values (tests.id('class_a'), auth.uid(), tests.id('team_usa_a'), '{}'::jsonb)$$), 'an outsider cannot submit a class A survey');

reset role;
update public.classes set current_period = 1 where id = tests.id('class_a');

-- ──────────────────────────────────────────────
-- S4. Identity fields
-- ──────────────────────────────────────────────

select tests.act_as('usa_a');

select todo_start('Audit S4: users update has no column limit; classes insert does not check role');
select ok(tests.denied($$update public.users set role = 'instructor' where id = auth.uid()$$), 'S4: a user cannot change own role');
select ok(tests.denied($$update public.users set email = 'other@test.local' where id = auth.uid()$$), 'S4: a user cannot change own email');
select ok(tests.denied($$insert into public.classes (instructor_id, name, normalized_name, class_code) values (auth.uid(), 'Fake', 'fake', 'TSTFAKE')$$), 'S4: a student cannot create a class');
select todo_end();

select is(tests.attempt($$update public.users set full_name = 'New Name' where id = auth.uid()$$), 'rows=1', 'a user can change own full_name');
select ok(tests.denied($$update public.users set full_name = 'Hacked' where id = tests.id('china_a')$$), 'a user cannot change another user profile');
select ok(tests.denied($$update public.students_classes set team_id = tests.id('team_china_a') where student_id = auth.uid()$$), 'a student cannot change own team');
select ok(tests.denied($$update public.classes set current_period = 2 where id = tests.id('class_a')$$), 'a student cannot change the class period');

select tests.act_as('outsider');
select todo_start('Audit S9: "Students can insert their own enrollment." checks only student_id');
select ok(tests.denied($$insert into public.students_classes (student_id, class_id, team_id) values (auth.uid(), tests.id('class_a'), tests.id('team_usa_a'))$$), 'S9: a user cannot enroll directly with a chosen team');
select todo_end();

reset role;
select * from finish();
rollback;
