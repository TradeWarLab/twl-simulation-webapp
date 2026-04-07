# the Trade War Lab - Trade War Simulation

1. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

## For the Next Developer 
 
### Architecture Overview
The Trade War Simulation is built as a full-stack, real-time web application.
- **Frontend / Routing**: Utilizes **Next.js (App Router)** for all client and server-side routing, built on React 19.
- **Components**: UI is built with **TailwindCSS**, **Shadcn-UI** components (using Radix UI primitives), and `lucide-react` for iconography. The negotiation UI also leverages `@dnd-kit` to handle drag-and-drop interactions.
- **Backend Services**: Uses Server Actions within Next.js for secure data mutation. Database interactions, authentication, and real-time sync are handed off to the underlying backend.
- **Testing**: A comprehensive testing suite is powered by **Vitest** combined with `@testing-library/react`. Coverage includes integration tests for DB logic and server actions within the `__tests__/` directory.
- **Structure**:
  - `app/`: App router pages (`login`, `signup`, `instructor`, `student`).
  - `components/`: UI components and page-specific layouts.
  - `lib/`: Contains utility routines, database types, Server Actions, and Supabase client setups (`ssr` support).
  - `scripts/` and `schema.sql`: Contains the raw database structure, RLS constraints, and helper SQL scripts for state modification.

### Tech Stack
- **Framework**: Next.js 15+ (React 19)
- **Styling**: TailwindCSS & Shadcn-UI
- **Drag & Drop**: @dnd-kit/core & @dnd-kit/sortable
- **Testing Engine**: Vitest & React Testing Library
- **Package Manager**: [bun](https://bun.com) (e.g., `bun run dev`, `bun test`)

### Infrastructure
- **Database, Auth & Real-time (Supabase)**: We use **Supabase** (PostgreSQL) for managed Authentication, database tables, and real-time subscriptions (web sockets). The application applies Row Level Security (RLS) to enforce data privileges between 'instructors' and 'students'.
- **Hosting & Deployment (Vercel)**: The Next.js application is designed to be deployed using **Vercel**, enabling edge computing, fast SSR, and zero-configuration framework integration.
