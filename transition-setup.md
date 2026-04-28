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

## Email Setup

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

- If invite emails fail, check the app env vars first.
- If confirmation or reset emails fail, check the Supabase Auth email settings and Resend integration first.
- Using the same Resend account for both flows is fine, but they are configured separately.

Github/Vercel/Resend set up with tradewarlab@gmail.com email address - Talk to Callie for access
