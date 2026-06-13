# World Cup Sweepstake — Implementation Plan

## Context

We're building a mobile-first web app for an 8-person family/friends sweepstake on the
2026 World Cup. Each player owns 6 of the 48 teams; the app shows official group tables,
fixtures and results, and computes a **separate** sweepstake leaderboard from match
results (Premier-League-style 3/1/0 per team, summed across each owner's teams). Most
people open it on a phone via a shared link, so the same data must be visible to everyone.

The project must be **free**. This folder (`sweepstake/`) holds everything for the project.
The user's existing `bamboozle` project sets the house stack: **Next.js 16, React 19,
Tailwind v4 (CSS-first `@theme`), TypeScript, App Router under `src/`**, and a clean data layer.

### Confirmed decisions
- **Shared data:** Supabase free tier — but built **last**. The whole app is built first on
  TypeScript seed data + `localStorage` (zero setup, free, demoable), behind a data-store
  interface so Supabase drops in as the final milestone.
- **Admin access:** No gate for the MVP (admin pages open to anyone with the link). Built so
  a PIN/auth gate can be added later.
- **Seed data:** Real 2026 World Cup teams + group draw (hosts USA/Canada/Mexico). The exact
  final draw + fixture dates will be **verified via web lookup** during the seed milestone
  (training cutoff predates the late-March 2026 playoff qualifiers); admin tools let the user
  correct anything wrong.
- **Knockout scoring:** W/D/L 3/1/0 like the group stage; a penalty-shootout win counts as a
  win. Progression/penalty bonuses stay **off** (configurable later).

## Tech stack
- Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind v4 (`@import "tailwindcss"` + `@theme`)
- `uuid` for ids (matches bamboozle)
- **Vitest** for unit-testing the calculation utilities (scoring correctness is an acceptance criterion)
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — final milestone only
- PWA: `manifest.webmanifest` + icons + theme color from the start

## Architecture

### Data store abstraction (key to staging Supabase last)
`src/lib/data/store.ts` defines a `SweepstakeStore` interface — `getPlayers`, `getTeams`,
`getMatches`, `getSettings`, `savePlayer`, `deletePlayer`, `assignTeam`, `clearAssignments`,
`setOverride`, `clearOverride`, `setSetting`, etc.

Two implementations:
- `src/lib/data/localStore.ts` — seeds from `lib/seed/*` on first load, persists mutations to
  `localStorage` (mirrors `bamboozle/src/lib/storage.ts` pattern: `isClient()` guard, JSON in
  one key, try/catch).
- `src/lib/data/supabaseStore.ts` — reads via anon key (public read), mutations via Next.js
  **server actions** using the service-role key (server-only, never shipped to browser).

`src/lib/data/index.ts` picks the implementation from env (Supabase store when
`NEXT_PUBLIC_SUPABASE_URL` is present, else local). This satisfies "works with mock data,
no paid API required" at every stage.

### Calculations (pure, backend-agnostic, unit-tested)
- `src/lib/calculations/groupStandings.ts` — per group, group-stage matches only. P/W/D/L/GF/GA/GD/Pts; sort Pts → GD → GF → name.
- `src/lib/calculations/sweepstakeLeaderboard.ts` — per player, **all** finished matches of owned teams. Sort Pts → wins → GD → GF → name.
- `src/lib/calculations/matchImpact.ts` — "if home wins / draw / away wins" owner-point deltas for a fixture.
- `src/lib/calculations/effectiveResult.ts` — single source of truth for a match outcome:
  - Use override scores when `has_manual_override`, else live/api scores.
  - `home > away` → home win; `away > home` → away win.
  - Equal scores: if `home_pens`/`away_pens` set (knockout) → shootout winner gets the win; else draw (1/1).
  - **Per-team** scoring: when two owned teams meet, each owner is scored on their own team's result independently (same player owning both still gets each team's points separately).

### Display
`src/components/TeamNameWithOwner.tsx` renders `Mexico (Y)`, or `Mexico (-)` if unowned.
Used in group tables, match cards, fixtures, results, My Teams, leaderboard lists, admin
screens, and the third-place table.

### Schema extension vs spec
The spec's `matches` table is used as-is **plus** nullable `home_pens` / `away_pens` integer
columns so a knockout shootout win can score as a win. `stage` distinguishes `group` vs
knockout rounds (`r32`, `r16`, `qf`, `sf`, `final`).

## File structure (under `src/`)
```
app/
  layout.tsx (BottomNav + PWA meta)        page.tsx (Home)
  groups/page.tsx   matches/page.tsx   leaderboard/page.tsx   my-teams/page.tsx
  admin/page.tsx  admin/players/page.tsx  admin/assign/page.tsx
  admin/results/page.tsx  admin/settings/page.tsx
  actions/*.ts (server actions — Supabase milestone)
components/
  BottomNav, TeamNameWithOwner, MatchCard, GroupTable, LeaderboardCard,
  PlayerTeamsCard, AdminTeamAssignmentCard, PlayerForm, ResultOverrideForm,
  GroupSwitcher, MatchFilters, LoadingState, EmptyState, ErrorState
lib/
  types.ts
  data/ (store.ts, localStore.ts, supabaseStore.ts, index.ts)
  calculations/ (groupStandings, sweepstakeLeaderboard, matchImpact, effectiveResult)
  seed/ (players.ts, teams.ts, matches.ts)
  supabase/ (client.ts, server.ts)  — final milestone
  football/ (provider.ts, mockProvider.ts, apiProvider.ts)  — adapter stubs + TODO
supabase/schema.sql        scripts/seed-supabase.ts   — final milestone
```

## Milestones (each independently testable)

> Progress is tracked with the checkbox on each milestone. Tick it (`[x]`) only after that
> milestone's _Verify_ step passes.

**M0 — Scaffold + shell.** `[x]` Next.js 16/TS/Tailwind v4 app, `src/`, sticky bottom nav
(Home/Groups/Matches/Table/My Teams + Admin), responsive (sidebar/top-nav on desktop),
PWA manifest + icon.
_Verify:_ `npm install && npm run dev` serves; on a phone-width viewport the bottom nav
switches all 5 routes. (AC 1, 15, 17)

**M1 — Domain, real seed, calculations + tests.** `[x]` `types.ts`; real 2026 seed (8 players w/
display codes, 48 teams with real groups/pots, fixtures incl. several finished results and
upcoming) — group draw + dates confirmed via web lookup; `store.ts` + `localStore`; all four
calculation modules; Vitest suite covering: standard win/draw, two owned teams meeting,
**same** player owning both sides, manual override changing the result, and shootout win.
_Verify:_ `npm run test` green; `npx tsc --noEmit` clean. (AC 5, 13, 16)

**M2 — Public view pages.** `[x]` Home (current leader, top 3, today's/upcoming matches, latest
results, recent point changes, link to leaderboard); Groups (one group at a time via
switcher, full table row, group fixtures + per-match impact, optional third-place table);
Matches (cards, filters All/Today/Upcoming/Completed/By group/My teams, status, score,
impact); Leaderboard (ranked cards, tiebreaker sort, tap to expand teams/points/next
fixture/status); My Teams (player dropdown, 6 teams w/ points, next match, latest result,
group position). Owner code shown everywhere via `TeamNameWithOwner`.
_Verify (mobile viewport):_ each page renders from seed; leader/results/standings match the
unit-tested numbers; owner initials present on every team. (AC 2, 3, 4, 5, 6, 15)

**M3 — Admin (ungated).** `[x]` Players CRUD with required name/displayCode, 1–3 char code,
duplicate-code warning; Team assignments (per-team owner dropdown, filters by group/
unassigned, name search, "N/48 assigned" progress, warning when a player ≠ 6 teams); Random
draw (fair pot-based: one team per player from each of 6 pots; and simple shuffle; reroll;
clear all); Lock/unlock setting with the spec's confirmation warning; Result overrides
(select match, set home/away score + optional pens + status, save → marked overridden, clear
→ revert); Settings (tournament name; scoring display; bonus toggles default off).
_Verify:_ every admin action persists and reflects in the public pages; entering an override
changes both the group table and the leaderboard; random draw yields exactly 6 teams each.
(AC 7, 8, 9, 10, 11, 12, 13)

**M4 — Supabase (shared data).** `[x]` `supabase/schema.sql` (spec tables + `home_pens`/`away_pens`,
`settings`, optional `sync_logs`); `supabaseStore` + server actions (service-role server-only);
env-driven store factory; `scripts/seed-supabase.ts` to push seed; public read, mutations via
actions; football provider adapter files with mock impl + TODO for a real API.
_Verify:_ with Supabase env set, an edit on one browser appears on another; with env unset the
app still runs fully on localStorage (free, no API). (AC 14; delivers shared-link goal)

**M5 — Docs + polish.** `[x]` README (overview, stack, setup, env vars, run, seed, admin guide,
scoring rules, how to plug a real football API, Vercel deploy notes); PWA install check;
final mobile pass.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(server only), `FOOTBALL_API_KEY` / `FOOTBALL_API_PROVIDER` (optional, future). App runs with
none set (localStorage mode).

## Verification summary
- `npm run test` — calculation correctness incl. edge cases (the core risk).
- `npx tsc --noEmit` — no major TS errors (AC 16).
- `npm run dev` at phone width — manual walk of all pages + admin actions (AC 1–13, 15, 17).
- Two-browser check after M4 — shared data via the link (AC 14 + shared-link goal).
- Maps to all 17 acceptance criteria in the spec.
