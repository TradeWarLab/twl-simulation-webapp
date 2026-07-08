# Trade War Lab — Simulation Web App

A real-time, multiplayer web platform for running U.S.–China trade-negotiation simulations in the classroom.

Instructors create and manage classes, invite students, assign teams, and advance the simulation through structured phases. Students join classes, receive team-specific briefings, negotiate in real time, chat in team and global channels, and vote on trade proposals — with scores recalculated as deals are executed.

> _Built for teaching international trade policy: students take on the roles of U.S. and Chinese negotiators and work through domestic and bilateral rounds to reach an agreement._

<!-- Add a screenshot or short GIF of the simulation workspace here — it's the fastest way to convey what the app does. -->

## Features

- **Instructor & student dashboards** with session controls, rosters, and a class-code join flow
- **Automatic class setup** — new classes generate a join code, USA/China teams, trade items, and default briefings
- **Real-time chat** across team and global channels via Supabase Realtime
- **Proposal lifecycle** — create, vote on, and execute trade proposals, with automatic team-score updates
- **Multi-phase flow** — Setup → Domestic Negotiation → Bilateral Negotiation → End
- **Custom invite emails** via Resend, with optional pre-assigned team/interest-group affiliation

## Architecture

The app runs on the **Next.js App Router** with server actions handling instructor and student flows. **Supabase** provides the backbone: Postgres for persistence, Auth for signup/login (mirrored into `public.users` via a database trigger), and Realtime for live chat, proposals, votes, and scores. Custom onboarding emails are sent server-side through Resend.

## Tech Stack

- **Framework:** Next.js (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI / shadcn-style primitives
- **Backend:** Supabase — Auth, Postgres, Realtime
- **Email:** Resend
- **Tooling:** Bun, Biome, Vitest + Testing Library

## Quick Start

```bash
bun install
cp .env.example .env.local   # then fill in Supabase + Resend values
# run scripts/schema.sql on a fresh Supabase instance
bun run dev
```

Full setup — environment variables, database schema and migrations, email configuration, the simulation phase model, and testing — is documented in **[docs/setup.md](docs/setup.md)**.

<!-- ## License -->

<!-- Add a license (e.g. MIT) — no LICENSE file is currently present. -->