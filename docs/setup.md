# Trade War Lab Transition Setup
 
This document is for the next developer picking up the project. It reflects the current app structure, setup requirements, and the product scope that is already implemented in the repository.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI / shadcn-style primitives
- Supabase Auth, Postgres, and Realtime
- Vitest + Testing Library
- Bun for package management and scripts*
- Biome for linting/formatting checks*

*both optional, I just like working with them

## Quick Start

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local`.
3. Set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

4. Apply the migrations in `supabase/migrations/` to a fresh Supabase instance (see
   [Database Migrations](#database-migrations)).
5. Start the app with `bun run dev`.

## Auth And Environment

Required local environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
RESEND_API_KEY=...
INVITE_FROM_EMAIL="TWL Simulation <onboarding@your-domain.com>"
```

Optional:

```env
INVITE_REPLY_TO_EMAIL=...
NEXT_PUBLIC_APP_URL=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
POST_SURVEY_SHEET_ID=...
```

- Signup and login are handled through Supabase Auth in [`app/actions/auth.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/app/actions/auth.ts:1).
- Email verification lands on [`app/auth/confirm/route.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/app/auth/confirm/route.ts:1).
- New users are mirrored into `public.users` by the `handle_new_user()` database trigger.
- Student signup can include a `class_code`; if present, the trigger auto-enrolls the student and applies any matching invite metadata.
- `RESEND_API_KEY` is used by the app server for custom invite emails only. Do not expose it to the client.
- Production and preview deployments need the same server-side variables configured in Vercel.

## Product Capabilities

- Marketing home page with custom visual treatment
- Instructor dashboard for creating classes
- Instructor class detail view with session controls and roster
- Team management, briefing management, trade-item management, and negotiation log routes
- Student dashboard with enrolled simulations and class-code join flow
- Student simulation workspace with:
  - phase header
  - team/global chat
  - trade-item editing
  - briefing access
  - optional NotebookLM launch link
  - negotiation proposal creation and voting

## Simulation Model

Current phase labels come from [`lib/constants.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/lib/constants.ts:1):

- `0`: Setup
- `1`: Domestic Negotiation
- `2`: Bilateral Negotiation
- `3`: End

Operationally:

- New classes start in phase `0`.
- Students set their trade-item values during phase `1`, and editing closes when the class
  leaves it.
- The shared deal board and the final ratification vote run in phase `2`.
- Phase `3` reveals both delegations' valuations and posts final scores. A ratified deal
  advances the class there automatically.

## Database Expectations

The Supabase schema currently includes:

- `users`
- `classes`
- `teams`
- `students_classes`
- `class_invites`
- `briefings`
- `messages`
- `global_issues`
- `trade_items`
- `negotiation_actions`
- `negotiation_bundles`
- `trade_proposals`
- `votes`
- `team_scores`
- `deal_board_items`
- `deal_ratification_calls`

Realtime is enabled for messages, proposals, votes, scores, classes, trade items, deal board
items, and deal ratification calls.

## Database Migrations

The schema is in `supabase/migrations/` and is managed by the Supabase CLI. Run the CLI with `npx supabase@latest`. `scripts/schema.sql` and `scripts/migrations/` are old and kept for history only.

Add a migration:

```bash
npx supabase@latest migration new <name>
```

Write the SQL in the new file. Do not edit a migration that a database already has. Add a new one.

Apply migrations to a hosted project (test or production):

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <ref>
npx supabase@latest migration list --remote
npx supabase@latest db push --remote --dry-run
npx supabase@latest db push --remote
```

`db push` and `migration repair` act on the local database unless you give `--remote`.

The first migration, `20261114221626_baseline.sql`, is a copy of the production schema on 2026-11-18. Production is the source of truth. Do not run it on a project that already has the schema. Mark it as applied there, one time per project:

```bash
npx supabase@latest migration repair --status applied 20261114221626 --remote
```

Run the drift check on the project before the repair. Later migrations assume the baseline state, so decide what to do with each difference first.

Check a project for drift (read-only):

```bash
node scripts/db/check-drift.mjs --ref <project-ref>
```

It compares the `public` schema (tables, columns, constraints, indexes, RLS policies, functions, triggers, grants, realtime tables, `global_issues` rows) with `supabase/schema-fingerprint.json`. It prints each difference and exits with code 1 on drift. Other targets: `--db-url <postgres-url>` and `--local`. After you apply a new migration to the test project, update the expected file and commit it with the migration:

```bash
node scripts/db/check-drift.mjs --ref <test-project-ref> --update
```

### Database Tests

`supabase/tests/` holds pgTAP tests of the access rules: RLS policies, grants, and RPC functions. Each file makes its own users and classes, acts as each caller (anonymous, outsider, student of each team, instructor of the class, instructor of another class), and rolls back at the end.

CI runs them on every pull request (`db-tests` job): it builds a fresh local database from the migrations, runs the drift check against it, then runs the tests. To run them locally you need Docker:

```bash
npx supabase@latest start
bun run db:test
```

Some tests are wrapped in `todo_start(...)` / `todo_end()`. A TODO test states a rule the database does not meet yet. Its reason names the audit finding (`docs/architecture/2026-11-14-architecture-audit.md`). It can fail without failing CI. When it passes, the output shows it as an unexpected pass.

To fix a security gap: write the migration. The matching TODO test starts to pass. Remove its TODO wrapper in the same pull request, so the test now fails CI if the gap comes back.

## Important Flows

- Class creation auto-generates a class code, USA/China teams, trade items from `global_issues`, and default briefings.
- Instructor invitations can pre-assign a student’s affiliation and interest block before account creation.
- Students can join either during signup or later from the dashboard with a class code.
- Trade execution marks matching issues resolved and recalculates team scores.

## Testing

Run:

```bash
bun run test
bun run test:coverage
```

Coverage currently focuses on:

- auth server actions
- class/enrollment server actions
- chat, negotiation, and trade server actions
- key auth, instructor, student, negotiation, and simulation components

## Email Setup -- Not Set Up yet

There are two separate email paths in the project.

### 1. Custom Invite Emails

- Instructor roster invites send a custom onboarding email from [`app/actions/classes.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/app/actions/classes.ts:187).
- The send logic lives in [`lib/email/invite.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/lib/email/invite.ts:163).
- This path uses `RESEND_API_KEY` and `INVITE_FROM_EMAIL`.
- If either variable is missing, the app skips sending the invite email and logs a warning.

Operational note:

- `INVITE_FROM_EMAIL` must be a sender address verified in Resend.
- A shared/public sender like `@gmail.com` will not work here. Use a domain you control, ideally a dedicated sending subdomain.

### 2. Supabase Auth Emails

- Signup confirmation and password reset emails are sent by Supabase Auth, not by the invite-email code.
- Supabase is already configured to send those emails through Resend.
- That integration is managed in the Supabase/Resend dashboards, not in app code.

What the next developer should know:
- If confirmation or reset emails fail, check the Supabase Auth email settings and Resend integration first.
- Using the same Resend account for both flows is fine, but they are configured separately.

## Post-Survey Google Sheet

Students answer the post-simulation survey in the End period, before they see results. The questions are in `lib/post-survey.ts`. Each submit is saved to `survey_responses` in Supabase (this unlocks results) and is then appended as one row to a Google Sheet.

If the three `GOOGLE_*` / `POST_SURVEY_SHEET_ID` variables are missing, the Sheet append is skipped with a warning. If the append fails, the error is logged and the student still sees results. In both cases the answers stay in `survey_responses`.

Setup:

1. In the Google Cloud console, create a project (or use one) and enable the **Google Sheets API**.
2. Create a **service account** in that project. You do not need to give it any project roles.
3. On the service account, add a **JSON key** and download it.
4. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` to `client_email` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` to `private_key` from the JSON key. Keep the `\n` sequences as they are.
5. With the shared Gmail account, create the Sheet. Share it with the service account email as **Editor**.
6. Set `POST_SURVEY_SHEET_ID` to the ID in the Sheet URL: `docs.google.com/spreadsheets/d/<this part>/edit`.
7. Optional: set `POST_SURVEY_SHEET_TAB` to a tab name. This lets the post-survey and the instructor intake survey share one spreadsheet on separate tabs. Without a tab name, rows go to the first tab.
8. Put this header row in row 1 of that tab. Rows are appended below it in this order:
   `submitted_at, class_id, class_name, team, student_id, own_no_deal_cost, deal_reached, intention_accuracy, intention_understanding, predictability, trust, own_frustration, other_frustration, nonverbal_reliance, communication_mode`
9. Add the same variables in Vercel for preview and production.

Notes:

- `student_id` is the Supabase user UUID, not a name or email.
- `own_no_deal_cost` is the respondent's own team's cost. To get the full condition of a class, pair its USA and PRC rows by `class_id`.
- The `trust` question uses "would have carried out ... a joint statement" when `deal_reached` is `no`.
- If you change the questions, change the header row to match `SHEET_COLUMNS` in `lib/post-survey.ts`.

## Instructor Intake Survey Sheet

Instructors answer the intake survey in the Create Class form. The questions are in `lib/instructor-survey.ts`. A class is not created until the required questions are answered. Each submit is saved to `instructor_survey_responses` in Supabase and is then appended as one row to a tab of a Google Sheet. It uses the same service account as the post-survey Sheet.

If `INSTRUCTOR_SURVEY_SHEET_ID` is missing, the Sheet append is skipped with a warning. If the append fails, the error is logged and the class is still created. In both cases the answers stay in `instructor_survey_responses`.

Setup:

1. Use the spreadsheet that holds the former Google Form responses, or any other. Share it with the service account email as **Editor**.
2. Add a new tab, for example `App responses`. Do not use the tab the Google Form writes to: Forms adds rows and columns there.
3. Set `INSTRUCTOR_SURVEY_SHEET_ID` to the spreadsheet ID and `INSTRUCTOR_SURVEY_SHEET_TAB` to the tab name. Without a tab name, rows go to the first tab.
4. Put this header row in row 1 of that tab:
   `submitted_at, class_id, class_name, instructor_email, student_levels, institution_type, region, region_other, anything_else`
5. Add the same variables in Vercel for preview and production.

Notes:

- `instructor_email` is the email of the instructor's account.
- `student_levels` holds every selected level, separated by `; `.
- For "Other", `institution_type` holds the text the instructor typed.
- If you change the questions, change the header row to match `INSTRUCTOR_SHEET_COLUMNS` in `lib/instructor-survey.ts`.

## Research Data

The database keeps two lab-only tables. anon and authenticated have no access, so read them in the SQL editor or with `npx supabase@latest db query --remote=<ref> --read-only`.

- `simulation_events`: one row for each board add or remove, ratification call, vote opened or closed, vote cast, item value change and period change. Database triggers write it, so the app cannot skip it. `actor_name` and `actor_team` are copied at the time of the event. `details.reason` tells a student action apart from a board clear (`vote_rejected`, `deal_ratified`, `round_end`).
- `class_outcomes`: one row each time Round 2 ends. `board_*` is the board when the round ended. `package_*` is the last package that went to a vote. Both are scored as if every member approved, with the `finalize_ratified_package` rule. `package_status = 'pending'` means the vote was still open when the round ended. `package_forced_approvals` counts votes an instructor forced. Students see only "No Deal" and their own no-deal cost.

### Class Outcome Sheet

When Round 2 ends (deal, instructor end or force-accept), the server appends the `class_outcomes` row to a Google Sheet tab. It uses the same service account as the survey Sheets. If `CLASS_OUTCOME_SHEET_ID` is missing, the append is skipped with a warning. If it fails, the error is logged. In both cases the row stays in `class_outcomes`.

Setup:

1. Add a tab, for example `Outcomes`, to a spreadsheet that is shared with the service account email as **Editor**.
2. Set `CLASS_OUTCOME_SHEET_ID` to the spreadsheet ID and `CLASS_OUTCOME_SHEET_TAB` to the tab name.
3. Put this header row in row 1 of that tab:
   `ended_at, class_id, class_name, outcome, ended_by, round2_started_at, usa_members, china_members, usa_no_deal_cost, china_no_deal_cost, board_usa_score, board_china_score, package_status, package_approvals, package_rejections, package_forced_approvals, package_usa_score, package_china_score, board_items, package_items, package_id, id`
4. Add the same variables in Vercel for preview and production.

Notes:

- `board_items` and `package_items` are JSON. Each item has `name` and `giving_team`.
- If you change the columns, change the header row to match `OUTCOME_SHEET_COLUMNS` in `lib/class-outcome.ts`.

### Round 2 Timer

`classes.round2_started_at` is set each time a class enters period 2. Students and the instructor see a 50-minute countdown (`ROUND_TWO_MINUTES` in `lib/constants.ts`). The countdown does not end the round: the instructor clicks **End Round**.

## Fun things you can try if bored or need resume bullet points
- Supabase is just a PostgresSQL wrapper, try migrating away from Supabase to AWS, could be a good resume bullet
  - NextAuth/Clerk for Auth?
  - Ably/Web sockets for realtime?
- If you have fun with that, move away from Vercel and switch the frontend to AWS too. Now you're a **'Fullstack Cloud Engineer'**
  - AWS Amplify: closest to Vercel's DX. Supports Next.js App Router natively (SSR, API routes, ISR).
  - SST (Serverless Stack): deploys Next.js to Lambda + CloudFront via OpenNext. More control, infrastructure-as-code, pairs naturally with RDS Postgres in the same AWS account.
  - ECS/Fargate: run Next.js as a Docker container. Full control, but you manage scaling, load balancers, and deployments yourself.
- I mean while you're at it switch Resend to AWS SES too. None of this is free ofc but maybe KU will pay for it?