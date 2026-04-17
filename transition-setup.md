# Trade War Lab Transition Setup

This document is for the next developer picking up the project. It reflects the current app structure, setup requirements, and the product scope that is already implemented in the repository.

## Quick Start

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local`.
3. Set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

4. Run [`scripts/schema.sql`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/scripts/schema.sql:1) on a fresh Supabase instance.
5. If the database was created before the class research-link change, run [`scripts/resources-migration.sql`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/scripts/resources-migration.sql:1).
6. Start the app with `bun run dev`.

## Auth And Environment

- The app only requires the public Supabase URL and publishable key for local development.
- Signup and login are handled through Supabase Auth in [`app/actions/auth.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/app/actions/auth.ts:1).
- Email verification lands on [`app/auth/confirm/route.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/app/auth/confirm/route.ts:1).
- New users are mirrored into `public.users` by the `handle_new_user()` database trigger.
- Student signup can include a `class_code`; if present, the trigger auto-enrolls the student and applies any matching invite metadata.

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
- Students edit trade-item values before negotiation lock.
- Bilateral negotiation and proposal voting happen in phase `3`.
- Some older comments in the SQL still reference earlier phase names; treat the app constants and route behavior as the current source of truth.

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

Realtime is enabled for messages, proposals, votes, scores, classes, trade items, negotiation actions, and negotiation bundles.

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

There is also a live Supabase healthcheck in [`__tests__/healthcheck/db-permissions.test.ts`](/c:/Users/obijr/Downloads/code/projects/web/twl-simulation-webapp/__tests__/healthcheck/db-permissions.test.ts:1). It uses `.env.local` credentials and is intended to catch broken schema privileges early.

## Known Edges

- The negotiation-action bundle flow exists, but most classroom behavior currently centers on `trade_proposals` and vote resolution.
- The simulation header and student workspace use the current route behavior and constants, even where older SQL comments still mention legacy naming.
- Deployment assumptions remain Supabase + Next.js hosting; no extra infrastructure is required in local development beyond those services.
