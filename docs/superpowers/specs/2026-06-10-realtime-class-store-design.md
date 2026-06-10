# Realtime Class Store — Design

**Date:** 2026-06-10
**Status:** Approved

## Problem

Trade item values (and proposals, votes, chat) must update live everywhere they
appear — the instructor dashboard, the student trade items panel (domestic
negotiation), and the bilateral negotiation view — while keeping the number of
Supabase realtime channels and message volume low.

Current defects this design fixes:

1. **Instructor dashboard receives no realtime events at all.** The channel
   built in `components/instructor/instructor-live-dashboard.tsx` chains `.on()`
   handlers but never calls `.subscribe()`, so every value is stale until a
   page reload.
2. **Student-side lag during domestic negotiations.** The current
   `SimulationRealtimeProvider` subscribes to 7 tables and calls
   `router.refresh()` on every event — a full server re-render (all page
   queries re-run) per change, multiplied across every connected student.
3. **Scattered subscriptions.** The student page opens 2 channels
   (provider + chat panel); the instructor page builds its own inline channel.
   There is no shared cache, so adding live data to a new component means
   another subscription or another refresh trigger.

## Approach (chosen)

One realtime channel per class page feeding a shared client-side store;
components read slices via selector hooks. Built on `useSyncExternalStore` +
React context — no new dependency. `postgres_changes` (not Broadcast) is used:
at classroom scale (tens of concurrent users per class) it is well within
Supabase limits, and it avoids DB triggers and broadcast authorization
policies. Rejected alternatives: debounced `router.refresh()` (reduces but does
not eliminate lag, no shared cache), Broadcast fan-out (better at large scale,
unnecessary complexity here).

Note: multiple `.channel()` subscriptions in one browser tab share one
websocket connection, so the cost being optimized is channel count × message
volume and the per-event work (full page re-renders), not raw connection
count.

## Architecture

### `lib/realtime/class-store.ts` (new)

Framework-agnostic store, plain TypeScript.

- State: `classRecord`, plus maps keyed by row id —
  `tradeItems: Map<string, TradeItem>`, `proposals: Map<string, TradeProposal>`,
  `votes: Map<string, Vote>`, `messages: Map<string, Message>`.
- Pure apply functions per table event (`upsert` / `delete`).
- `subscribe(listener)` / `getSnapshot()` compatible with
  `useSyncExternalStore`.
- `hydrate(snapshot)` to load initial server data and to resync after a
  reconnect.

### `components/realtime/realtime-class-provider.tsx` (new)

One per page (student simulation page, instructor class detail page).

- Props: `classId`, initial snapshot (server-fetched, same queries as today).
- Creates the store, opens **one** Supabase channel `class:{classId}` with
  `postgres_changes` handlers for `classes`, `trade_items`, `trade_proposals`,
  `votes`, `messages`, and calls `.subscribe()`. Tables with a `class_id`
  column use a server-side `class_id=eq.{classId}` filter; `votes` has no
  `class_id`, so vote events are filtered client-side by the class's team ids
  (as the instructor dashboard does today).
- Exposes the store via React context.
- Calls `router.refresh()` in exactly one case: `classes.current_period`
  changed (page layout is server-rendered per period; period changes are rare
  instructor actions). All other events mutate the store only.

### `lib/realtime/hooks.ts` (new)

`useTradeItems(teamId?)`, `useProposals()`, `useVotes()`,
`useMessages(channel)`, `useClassRecord()`. Each uses `useSyncExternalStore`
with a selector so a trade-item change re-renders only trade-item consumers.

## Data flow

1. Server page fetches the initial snapshot (unchanged queries) and passes it
   to the provider.
2. Student edits a value → optimistic local update in their panel → server
   action writes to Postgres.
3. Postgres change → Supabase fans out to subscribed clients → each client's
   provider applies the event to its store → only components whose selector
   output changed re-render.

## Component changes

| Component | Change |
|---|---|
| `components/simulation/simulation-realtime-provider.tsx` | Deleted; replaced by the new provider. Drops vestigial `negotiation_actions` / `negotiation_bundles` subscriptions (their server actions are referenced only by tests) and `team_scores` (only matters in period 3, covered by the period-change refresh). |
| `components/negotiation/trade-items-panel.tsx` | Reads items from `useTradeItems(myTeamId)`. Optimistic edit rule: an item currently being edited (input focused or write pending) ignores incoming store values until the server echo lands, so a teammate's update cannot clobber in-progress keystrokes. |
| `components/negotiation/negotiation-controller.tsx` | Reads proposals / votes / items from store hooks instead of server props that previously only changed on `router.refresh()`. |
| `components/chat/chat-panel.tsx` | Drops its own channel; reads from `useMessages(channel)`. Student page goes from 2 channels + refresh storms to 1 channel total. |
| `components/instructor/instructor-live-dashboard.tsx` | Inline ~150-line `useEffect` channel deleted; the page wraps in the same provider and the dashboard reads from the same hooks (this also fixes the missing-`.subscribe()` bug). |

Sender-name hydration for messages and votes is resolved from the roster /
user lookup already present in the initial snapshot (as the instructor
dashboard does today), instead of per-event fetches.

## Error handling

- The provider watches channel status. On `CHANNEL_ERROR`, `TIMED_OUT`, or
  rejoin after disconnect, it re-fetches the snapshot via a server action and
  re-hydrates the store, so missed events cannot leave a client permanently
  stale.
- Realtime `DELETE` payloads carry only the primary key; apply functions
  delete by id. `INSERT` / `UPDATE` apply the full new row.

## Testing

- Unit tests (vitest) for store apply functions: upsert ordering, deletes,
  hydrate-overwrites, selector stability.
- Component test for the optimistic-edit merge rule in the trade items panel.
- Manual two-browser verification: student edits a value → instructor
  standings and Trade Breakdown update without reload.

## Future work enabled (not in scope)

- Live roster updates on the instructor page (`students_classes` slice; table
  must first be added to the `supabase_realtime` publication).
- Live point views during domestic negotiations (reads the same trade-items
  slice).
