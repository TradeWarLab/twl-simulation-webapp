# Architecture audit: TWL Simulation

Date: 2026-11-14. Commit: `34b18f1` (branch `feat/intake-survey-institution`).
Reviewer: Claude (Fable 5.2). Status: findings only. No code was changed.

## Scope and method

Read: `scripts/schema.sql`, all 6 migrations, all 9 server action files, the
Supabase clients, `proxy.ts`, the auth routes, the realtime provider and store,
the email and Sheets modules, and the instructor and student pages.

Checked on the test Supabase project (`nknmkv...`, read-only):

- Live RLS policies, function settings, indexes, and realtime publication.
- Row counts visible to a caller with only the publishable key and no login.
- Supabase advisors (security and performance).

Not checked: the production database, the Supabase Auth dashboard settings,
Vercel project settings, UI components in depth, accessibility.

Severity: **Critical** (exploitable now, exposes data or corrupts research
data), **High**, **Medium**, **Low**. Each finding has an ID for later reviews.

## Summary

The application code is careful. The database is not the security boundary it
must be. Authorization is done in server actions, but every signed-in user (and
for reads, every visitor) can call the Supabase REST and Realtime APIs directly
with the publishable key that ships in the browser bundle. RLS is the only
control on that path, and most policies are `using (true)`.

Three root causes produce most findings:

1. **RLS policies allow too much.** Reads are open to anonymous callers. Writes
   are open to any class member, in some cases any signed-in user.
2. **No migration system.** `schema.sql`, the test database, and production are
   three states with no tool that compares them. The test database already
   differs from `schema.sql` in 8 policies.
3. **No tests of the database.** The 272 tests mock Supabase. No test runs a
   policy or an RPC. One test asserts that anonymous read access works.

Fix order: S1, S2, S3 (one RLS rewrite), then A1 (migrations) and A2 (database
tests) so the fix stays fixed. Everything else can wait.

| ID | Severity | Finding |
|----|----------|---------|
| S1 | Critical | Anonymous callers can read names, emails, chats, class codes, votes, scores |
| S2 | Critical | Team confidentiality is not enforced (chat; valuations on test only) |
| S3 | Critical | Students can write outcome data directly (scores, proposals, votes, items) |
| S8 | Critical | Anonymous callers can end any class's round (added after the tests were written). Fixed in migration `20261119050605`; live on prod until that migration is applied |
| A1 | High | Schema drift, no migration history |
| S4 | High | Identity fields used for authorization are user-editable |
| S9 | High | Any signed-in user can enroll in any class and pick a team (production) |
| S5 | High | Open instructor signup can send email from the lab domain |
| D1 | High | State changes are multi-step and not atomic |
| D2 | High | Unanimity counts every enrolled student, present or not |
| A2 | High | No CI, no database tests |
| D3 | Medium | Research export has no reconciliation |
| D4 | Medium | Value-change history is not stored |
| S6 | Medium | SECURITY DEFINER functions lack hardening |
| P1 | Medium | Realtime design does not scale past a few concurrent classes |
| P2 | Medium | Unbounded reads and N+1 queries |
| M1 | Medium | Authorization and validation patterns are inconsistent |
| M2 | Medium | Errors are swallowed, no monitoring |
| S7 | Low | Open redirect, missing headers, unpinned dependencies |
| P3 | Low | RLS and index performance warnings |
| M3 | Low | Dead code, magic numbers, dangling doc references |

---

## Security

### S1. Anonymous read access to most tables (Critical)

`schema.sql:11-16` grants all table privileges to `anon`. Most SELECT policies
are `using (true)` with no role, so they apply to `anon`.

Verified on the test project with only the publishable key, no session:

| Table | Rows visible to anonymous |
|-------|---------------------------|
| `users` (id, full_name, email, role) | 33 of 33 |
| `messages` | 31 |
| `classes` (includes `class_code`) | 16 |
| `students_classes` | 31 |
| `votes` (includes `user_id`) | 18 |
| `trade_items` | 723 |
| `team_scores` | 10 |
| `survey_responses`, `class_invites` | 0 (correctly closed) |

Also open by policy: `teams`, `briefings`, `trade_proposals`,
`deal_board_items`, `deal_ratification_calls`, `negotiation_actions`.

Effect: anyone with the site URL can download every student's name and email,
which class they are in, and every chat message. For a university user base
this is student record data. Class codes are also listed, so the code is not a
barrier to joining a class.

Direction:
- Revoke `anon` table grants. Add `to authenticated` to every policy.
- Replace `using (true)` with a membership test (one helper function:
  caller is the instructor of, or enrolled in, this class).
- `users`: do not expose `email` to other users. Instructors need roster
  emails; students need names only.
- The sign-up form validates a class code before the account exists
  (`app/actions/auth.ts:54-67`). That needs a narrow RPC that returns only
  true or false, not table access.
- `__tests__/healthcheck/db-permissions.test.ts` asserts that `anon` can read
  `classes`. It must change with the fix.

### S2. Team confidentiality is not enforced (Critical)

The simulation depends on each team hiding information from the other. Two
leaks are larger than the accepted ballot gap:

**Chat.** The `messages` SELECT policy is `true`. `getRealtimeSnapshot`
(`app/actions/realtime-snapshot.ts:72-76`) loads all channels and sends them to
the browser. The realtime subscription filters on `class_id` only
(`realtime-class-provider.tsx:181-188`). The channel filter is in the client
(`lib/realtime/hooks.ts:54-61`). Each student's browser holds the other team's
private channel, live. The comment at `realtime-snapshot.ts:19-21` says the
opposite.

**Valuations.** In `schema.sql` a student reads only their own team's
`trade_items` until period 3. The test database has a different policy,
"Trade items viewable by class." with `using (true)`, and the own-team policy
is absent. On the test database every valuation is readable by anyone. The
state of production is unknown (see A1). This must be checked first.

The no-deal cost is done correctly (`get_no_deal_costs`): it is the model for
the rest.

Direction: channel-level predicate on `messages` (global: class members;
team channel: that team and the instructor). Constrain `channel` to known
values. Confirm and repair the `trade_items` policy in production.

### S3. Students can write outcome data directly (Critical)

Server actions check period, team, and board state. RLS does not, so a direct
API call skips those checks. `trade-controller.ts:359-361` already says the
vote guard is "not a security boundary". That is true of every guard.

| Table | What RLS allows | Consequence |
|-------|-----------------|-------------|
| `team_scores` | Any class member: insert, update, delete | Final scores can be set by hand |
| `trade_proposals` | Any class member: update any column | Change status or items of any proposal |
| `votes` | Any signed-in user: insert for any proposal, any `team_id` | See below |
| `trade_items` | Team member in period 1: update any column | Set `is_resolved = true`, change `name`, `role`, `team_id`, or an out-of-range `value` |
| `messages` | Any signed-in user: insert into any class and channel | Spam in any class log |
| `deal_board_items` | Any class member: insert or delete in any period | Board edits during a frozen vote |
| `survey_responses` | Own row, any JSON in `answers` | Skips `parseSurveyAnswers` |

Two cases need detail:

- **Vote stuffing.** `finalize_ratified_package` (`schema.sql:726-736`) compares
  the count of all votes on the proposal with the count of team members. It
  does not check that each vote is from a team member. Votes from other
  accounts fill the count. The RUDN session showed students do create extra
  accounts.
- **Pre-resolved items.** Final score is the sum of `value` where
  `is_resolved` (`schema.sql:762-772`). A student can set `is_resolved` on their
  own items in period 1. Those items then count in the final score whether or
  not they were in the deal.

`schema.sql` also has "Students can insert their own enrollment."
(`schema.sql:122-123`), which lets a student enroll in any class on any
`team_id` without a code. The `trade_items` policies test `team_id` only, so an
enrollment row that names the other team's id gives read and write on that
team's items. The test database does not have this policy. Production unknown.

These tables feed the research dataset. `dealReached` in the survey export is
derived from `team_scores` (`post-survey.ts:74`).

Direction: students get no direct write on `team_scores`, `trade_proposals`
(status), or `votes`. Each state change goes through one RPC that checks
membership, period, and state. Column-level limits and `with check` on
`trade_items`. Check constraints for value ranges. The deferred anonymous-voting
plan already designs `cast_vote`. Its trigger to revisit was "if stakes are
real". Research data validity is that trigger, separate from ballot privacy.

### S4. Identity fields used for authorization are user-editable (High)

- `users` UPDATE has no column limit. A user can change their own `role` and
  `email`.
- `enroll_student` reads the caller's email from `public.users`
  (`schema.sql:664`) and uses it to match an invite. A student can set their
  email to an invited student's address, enroll, and take that student's team
  and role assignment.
- `handle_new_user` takes `role` from sign-up metadata, which the client
  controls (`schema.sql:591`). The `classes` INSERT policy does not check role
  at all, so any account can create classes.

Direction: read email from `auth.users` or the JWT inside definer functions.
Make `role` and `email` in `public.users` not writable by the user. Decide if
"instructor" is a real permission; if it is, store it where the user cannot
edit it.

### S5. Open instructor signup can send email from the lab domain (High)

Anyone can sign up as an instructor. Email confirmation was observed off in
production on 2026-11-10. An instructor can call `inviteStudentToClass` with any
address. The email goes out through Resend from the lab's domain. The class
name is attacker-chosen text in the subject and body. There is no rate limit.

The same action enrolls an existing user in the class without their consent
(`classes.ts:373-383`).

This is also the cause of the junk classes and junk intake survey rows found on
2026-11-10.

Direction: turn on email confirmation. Gate instructor accounts (allowlist,
approval, or a code). Rate-limit invites per instructor and per class.

### S6. SECURITY DEFINER functions lack hardening (Medium)

- No function sets `search_path` (advisor: 4 warnings).
- `enroll_student`, `end_bilateral_round`, `finalize_ratified_package`, and
  `get_no_deal_costs` are executable by `anon`. Three of them reject a caller
  with no session. `end_bilateral_round` does not: see S8.
- `finalize_ratified_package` checks class membership, not team membership.
- A failure inside `handle_new_user` blocks sign-up with an opaque error.

### S7. Lower-risk items (Low)

- `app/auth/confirm/route.ts:10,21`: `next` is redirected to without a check.
  It needs a valid token, so impact is small. Allow relative paths only.
- No security headers or CSP in `next.config.ts`.
- `next` and `@supabase/ssr` are `"latest"` in `package.json`. The lockfile
  pins them today, but any reinstall can change major versions.
- No secret or service-role key is used in the app. That is correct and should
  stay a rule.

### S8. Anonymous callers can end any class's round (Critical)

Added 2026-11-14, found while writing the database tests. Reasoned from the
function text; not run against a database.

`end_bilateral_round` checks ownership with `v_instructor <> auth.uid()`
(`schema.sql:813`). For a caller with no session `auth.uid()` is null, the
comparison is null, and the `raise` does not run. `anon` has EXECUTE on the
function, and class ids are readable by `anon` (S1). So any visitor can end
Round 2 of any class in period 2: the open vote is rejected, the board is
cleared, and the class is archived.

Direction: compare with `is distinct from`, reject a null `auth.uid()` first,
and revoke EXECUTE from `anon` and `public`. Apply the same null check to every
definer function. Test `04_rpc_test.sql` holds a TODO for this.

Status (2026-11-18): fixed in `20261119050605_research_data_capture.sql`, as
in the direction above. `04_rpc_test.sql` and `05_research_data_test.sql` lock
it. The other definer functions still need the null check (S6).

### Corrections and additions from the database tests (2026-11-14)

- S3, `trade_items`: a student cannot change `team_id`. With no `with check`,
  Postgres applies the `using` clause to the new row. The other columns
  (`is_resolved`, `name`, `role`, `value`) are open as stated.
- S3, `trade_items`: the update policy does not check `class_id`. A student can
  move their own item into another class that is in period 1.
- S3, `votes`: the UPDATE policy has no `with check`. A voter can change
  `team_id` or `proposal_id` on their own vote. The fix must cover UPDATE.
- `enroll_student` enrolls into an archived class.
- On the test database, `handle_new_user` is an older version that ignores
  invites. A student who signs up with a class code gets no team. `setup.md`
  says the opposite. Production has the newer version, so `setup.md` is
  correct for production.

### Production drift check (2026-11-18)

The drift check compared production with the baseline taken from the test
project. Production was built from `scripts/schema.sql`; the test project had
drifted. Production is now the source of truth, and the baseline migration was
rebuilt from it. Differences that change the findings:

- S2, `trade_items`: production has "Trade items viewable by own team or
  instructor." Valuations are not open to other teams or to anon on
  production. The S2 chat finding stands.
- S1: anon cannot read `trade_items` on production. The other S1 tables are
  open as stated.
- S3: the policies have other names on production ("Class members can manage
  scores.", "Class members can update proposal status."). Same rules.
- S8 is live on production. `end_bilateral_round` has the same body and anon
  can execute it.
- Grants: production has the Supabase defaults. anon and authenticated have
  all table privileges, including `TRUNCATE`. The API does not expose
  `TRUNCATE`. Narrow these with the S1 fix.

### S9. Any signed-in user can enroll in any class (High, production)

Production has "Students can insert their own enrollment." on
`students_classes`, which checks only `student_id = auth.uid()`. Class IDs are
readable (S1). A signed-in user can insert a row for any class, with any
`team_id` and `interest_block`, without the class code or an invite. This also
puts the user in that class's chat and votes. Students enroll through
`enroll_student()`, so the policy is not needed. Fix: drop it. Test
`02_student_write_access_test.sql` holds a TODO for this.

---

## Data integrity

### D1. State changes are multi-step and not atomic (High)

- `createClass` (`classes.ts:125-245`): class, survey row, Sheet row, teams,
  48 trade items, briefings. Each step can fail alone. Errors are logged and the
  action returns nothing, so a half-built class looks normal to the instructor.
- `submitVote` (`trade-controller.ts:330-463`): vote, count, then status update
  and two deletes as separate statements.
- `callForRatification`: call, recount, proposal insert.
- Period changes: `updateClassPeriod` accepts any integer. There is no check
  constraint on `current_period` and no rule on allowed transitions. The two
  parked defects (rewind keeps `team_scores` and `is_resolved`; archived class
  can be reopened) are symptoms of this.

`end_bilateral_round` shows the right pattern: one RPC, one transaction,
authorization inside. Direction: one RPC per state transition
(`create_class`, `cast_vote`, `set_period`), with the transition rules in one
place.

### D2. Unanimity counts every enrolled student (High)

The vote resolves when votes cast reach the count of all students on both
teams (`trade-controller.ts:402-416`, `schema.sql:726-736`). One absent
student, or one duplicate account, blocks ratification for the whole class
until the instructor removes that row. This is a product decision more than a
bug: decide what the quorum is (enrolled, present, or instructor-confirmed) and
record the decision.

### D3. Research export has no reconciliation (Medium)

Sheet appends are best effort (`post-survey.ts:94-116`, `classes.ts:109-122`).
A failed append is a console line. No column records whether a row reached the
Sheet, so there is no way to find and resend missing rows. For the intake
survey the Sheet append runs even if the database insert failed, so the two
stores can differ in both directions.

Direction: the database is the source of truth. Add a synced marker and a
resend path, or replace append-on-submit with a periodic export.

### D4. Value-change history is not stored (Medium)

The instructor log shows valuation changes, but it builds them from realtime
events in component state (`log-client.tsx:55,157`). Changes are lost if the
log page is not open, and on reload. `trade_items` keeps only the last value
and has no `updated_at`. If the research design needs the path of valuations in
round 1, add an append-only history table written by a trigger.

### D5. Other (Low)

- Foreign keys have no delete rules and the app has no delete path for classes
  or accounts. Junk-class cleanup and privacy deletion requests are manual SQL.
- `negotiation_actions` and `negotiation_bundles` are unused but still
  writable by students and still in the realtime publication.

---

## Scalability

Current load is small (about 170 users in production). Nothing here is urgent.
These are the limits you reach first.

### P1. Realtime design (Medium)

Each client opens 7 `postgres_changes` subscriptions. Postgres Changes checks
RLS for each subscriber on each change, on one thread. Cost is changes times
subscribers across all classes.

The `votes` subscription has no filter (`realtime-class-provider.tsx:157-160`),
so every client receives every vote in every class and filters in the browser.

The S1 fix makes each RLS check more expensive, so plan both together.
Direction: add `class_id` to `votes` and filter on it now. If many classes run
at the same time, move to Broadcast on private per-class channels.

### P2. Unbounded reads and N+1 (Medium)

- `getRealtimeSnapshot` loads every message in the class on each page render,
  each period change, and each reconnect. `getSimulationLogSnapshot` does the
  same.
- `getTradeProposals` runs 2 queries per proposal
  (`trade-controller.ts:98-107`).
- `submitVote` makes about 8 sequential round trips.

### P3. RLS and index warnings (Low)

Advisors: 14 `auth_rls_initplan` (use `(select auth.uid())`), 30
`multiple_permissive_policies`. No index on `students_classes(class_id)` or
`(team_id)`, which every membership policy will use after the S1 fix, or on
`classes(instructor_id)`, `votes(team_id)`, `trade_items(team_id)`.

---

## Architecture and maintainability

### A1. Schema drift, no migration history (High)

`scripts/schema.sql` plus hand-run files in `scripts/migrations/`. The
`supabase/` directory is empty. Production is in another account and changed by
hand. Policy names on the test database compared with `schema.sql`:

| Only in test database | Only in `schema.sql` |
|-----------------------|----------------------|
| `trade_items`: Trade items viewable by class. (`true`) | `trade_items`: Trade items viewable by own team or instructor. |
| `trade_items`: Instructors can insert trade items. | `students_classes`: Students can insert their own enrollment. |
| `team_scores`: System can manage scores. | `team_scores`: Class members can manage scores. |
| `trade_proposals`: System can update proposal status. | `trade_proposals`: Class members can update proposal status. |

So `schema.sql` does not describe any running database with certainty, and
security review of the file does not prove anything about production.

Direction: adopt Supabase CLI migrations. Take the baseline from production,
not from `schema.sql`. Make test and production reach the same state by the
same files. Add a drift check.

**Do first, in production (read-only):** list `pg_policies` for schema
`public` and compare with the table above and with S1 to S3.

### A2. No CI, no database tests (High)

- No `.github` workflows. Lint, typecheck, and tests run only by hand.
- `tsc --noEmit` has 33 errors, all in 3 integration test files, so typecheck
  cannot be a gate until they are fixed or excluded.
- One test failed once in three full runs (not identified).
- All integration tests use `__tests__/helpers/supabase-mock.ts`. They test the
  server-action guards, which S3 shows are not the boundary.

Direction: CI with Biome, `tsc`, and Vitest. A database test suite that runs
as anonymous, student A, student on the other team, outsider, and instructor,
and asserts an access table. This suite is what keeps S1 to S3 fixed after the
review ends.

### M1. Authorization and validation are inconsistent (Medium)

Three patterns exist: `ensureInstructorOwnsClass`, an inline ownership query,
and no check with reliance on RLS (`updateClassPeriod`, `endSimulation`, all of
`teams.ts` except remove, `deleteBriefing`, trade item create and delete). The
third pattern returns `{ success: true }` when RLS filters the write to zero
rows.

No input schema validation. Server action arguments are untrusted but are cast
(`formData.get("x") as string`) or used as typed (`period: number`,
`newValue: number`, `channel: string`).

No generated database types; query results are cast (`as unknown as`, 9
places).

Direction: one `requireInstructor(classId)` and one `requireStudent(classId)`
helper. One validation approach for action inputs. Generated types from the
schema. Check affected row counts on writes.

### M2. Errors are swallowed, no monitoring (Medium)

`createClass` and `inviteStudentToClass` return `void` and log to the console.
The user sees no error. Sheet failures, invite failures, and finalize failures
are visible only in Vercel logs if someone looks. Add error tracking and return
errors to the form.

### M3. Smaller items (Low)

- Period numbers are bare integers in SQL and TypeScript (`periodCount - 2`,
  `current_period = 2`). Stale comments say "period 3" for negotiation
  (`trade-controller.ts:287`).
- Dead code: empty `if` block at `trade-controller.ts:216-222`,
  `initializeTradeItems`, three home-hero variants, `eslint.config.mjs` next to
  Biome, `SHOW_CSV_EXPORTS`.
- Code comments point to specs in `docs/superpowers/`, which is gitignored
  (`classes.ts:610`, `deal-controller.ts:7`). Other readers cannot open them.

---

## What is done well

- No service-role key in the application. All access uses the caller's session.
- `get_no_deal_costs` and `end_bilateral_round`: authorization inside the
  function, one transaction, reasons recorded in comments.
- Migrations are idempotent and explain why.
- `client_message_id` gives idempotent chat sends.
- The realtime store resyncs from a snapshot after a dropped connection.
- HTML in invite emails is escaped.

## Recommended sequence

1. Check production policies (A1 query). Decide if S2 valuations are exposed
   there now.
2. Turn on email confirmation and gate instructor signup (S5). Dashboard
   settings, no code.
3. RLS rewrite for reads (S1, S2). One migration, with the membership helper
   and indexes (P3).
4. Move writes to RPCs and close direct writes (S3, D1, S4). This is the
   largest item. Order: `cast_vote` and scores, then `trade_items` limits, then
   period transitions.
5. Migrations and CI with database tests (A1, A2). Start the test suite with
   step 3 so each fix has a test.
6. Decisions to record as ADRs: quorum rule (D2), instructor role model (S4),
   Sheet as export not store (D3), value history (D4).
7. Remaining Medium and Low items as time allows.

## Accepted gaps (not re-reported)

- Ballot `user_id` visible to class members (anonymous-voting plan, deferred).
  S3 gives a new reason to do the `cast_vote` part.
- Rewind does not clear `team_scores` or `is_resolved`. Archived class can be
  reopened. Both are covered by D1.
- 33 `tsc` errors in test files. Covered by A2.
