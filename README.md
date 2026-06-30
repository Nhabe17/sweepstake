# World Cup Sweepstake

A mobile-first web app for a family/friends World Cup sweepstake. Eight players each own six
of the 48 teams; the app shows the official group tables, fixtures and results, and a
**separate** sweepstake leaderboard calculated automatically from match results.

Wherever a team appears, its owner's code is shown in brackets — e.g. **Mexico (Y)**,
**England (M)**.

## How scoring works

Premier-League-style points are awarded **per team**, then summed for that team's owner:

| Result | Points |
| ------ | ------ |
| Win    | 3      |
| Draw   | 1      |
| Loss   | 0      |

- Group **and** knockout matches score. A knockout decided on penalties counts as a **win**
  for the shootout winner.
- If two owned teams play each other, **each owner is scored on their own team's result** —
  including when the same player owns both sides (they get each team's points separately).
- A manual result override always wins over the live/API score.

Leaderboard ties break by: total wins → goal difference → goals for → player name.
Group tables sort by: points → goal difference → goals for → team name.

The scoring values are configurable in **Admin → Settings**.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme`)
- **Vitest** for the scoring/standings unit tests
- **Supabase** (optional) for shared data across devices
- PWA manifest for "add to home screen"

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it — **no API key or database required**. The app boots with deterministic seed data
(8 players, 48 real 2026 teams across 12 groups, generated fixtures/results) persisted in the
browser's `localStorage`.

Other scripts:

```bash
npm run test       # unit tests (scoring, standings, draw, seed integrity)
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Data modes

The app reads/writes through a small store interface (`src/lib/data/store.ts`) with two
backends, chosen automatically:

| Mode | When | Behaviour |
| ---- | ---- | --------- |
| **localStorage** (default) | no Supabase env vars | Per-device data, seeded on first load. Great for trying it out; admin edits stay on that device. |
| **Supabase** (shared) | Supabase env vars present | All devices read the same cloud data via the shared link. Admin writes go through server actions using the service-role key. |

### Seed / reset the local data

Local data seeds itself on first visit. To reset everything back to the seed, use
**Admin → Settings → Reset all data to seed**.

## Enabling shared data (Supabase)

Supabase has a free tier that comfortably covers this app.

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   FOOTBALL_API_KEY=...            # optional live score sync
   ODDS_API_KEY=...                # optional The Odds API betting odds sync
   SUPABASE_SERVICE_ROLE_KEY=...   # server only — never exposed to the browser
   ```

4. Seed the database:

   ```bash
   npm run db:seed
   ```

5. `npm run dev` (or redeploy). The app now uses shared data; open it on two devices to
   confirm an admin edit on one appears on the other.

> [!WARNING]
> **Security — the admin write path is unauthenticated.** Anon Supabase clients can only
> *read* (Row Level Security has no write policy), so the browser can't mutate data directly.
> **However**, all writes go through Next.js server actions (`src/app/actions/sweepstake.ts`,
> marked `'use server'`), and those compile to **public POST endpoints**. Anyone who can reach
> the deployed URL can invoke them directly — resetting data, overriding results, reassigning
> teams — regardless of the read-only RLS. There is intentionally **no admin gate in the MVP**.
> Treat the deployment URL as a shared admin credential, and add a PIN/auth gate (verified
> *inside* each server action, not just in the UI) before sharing widely — see "Extending".

> Note: Supabase pauses free projects after ~7 days of inactivity — fine during a month of
> daily tournament use.

## Using the admin controls

Open **Admin** (bottom nav) to:

- **Players** — add/edit players, set 1–3 char display codes (duplicate codes are flagged),
  mark admins, delete (owned teams are unassigned automatically).
- **Team assignments** — set each team's owner, filter by group/unassigned, search, watch the
  `N/48` progress and per-player `x/6` tally. Includes the random draw:
  - **Fair draw (pots)** — one team from each of the 6 pots to each of the 8 players.
  - **Simple shuffle** — deal all teams out at random.
  - **Fill unassigned** — only assign teams that have no owner, balancing toward 6 each.
  - **Clear all**, and **Lock/Unlock** (locking warns before any later change).
- **Result overrides** — set a match's score, optional penalty result, and status. Overrides
  are flagged and immediately update the group tables and leaderboard. **Revert to API**
  clears the override.
- **Settings** — tournament name, scoring values, optional toggles, and reset-to-seed.

## Pages

Home (leader, today's matches, latest results, upcoming) · Groups (one group at a time with
fixtures + sweepstake impact) · Matches (filterable cards) · Leaderboard (tap a player to
expand) · My Teams (pick your profile) · Admin.

## Replacing mock data with a real football API

The app uses a provider abstraction (`src/lib/football/`):

- `provider.ts` — the interface (`getFixtures`, `getMatchesByDate`, `getMatchResults`,
  `syncMatchesToDatabase`).
- `mockProvider.ts` — backed by seed fixtures (current default).
- `apiProvider.ts` — stubbed with a step-by-step TODO for wiring a real API
  (football-data.org, API-Football, etc.). Write live scores into the `api_*` columns so
  manual overrides keep taking precedence, then run it on a Vercel Cron or an admin button.

Set `FOOTBALL_API_KEY` for live score sync. Set `ODDS_API_KEY` to enable cached 1X2
betting odds from The Odds API when **Admin -> Settings -> Show betting odds** is on.
For existing Supabase projects, run
[`supabase/migrations/20260614000000_add_match_odds.sql`](supabase/migrations/20260614000000_add_match_odds.sql).

## Deploying to Vercel

1. Push the repo to GitHub and import it into Vercel.
2. Add the environment variables from `.env.local` to the Vercel project (Production).
3. Deploy. Share the URL — on a phone, use the browser's "Add to Home Screen" for the PWA.

Without Supabase env vars the deployment still works, but each visitor gets their own
local data, so set up Supabase for a true shared sweepstake.

## Extending later

- Admin PIN or Supabase email auth + `is_admin` (currently ungated for MVP).
- Knockout bracket + best-third-place qualification (status is approximated today).
- Progression/penalty **bonus scoring** (toggles already present, off by default).
- Knockout live-data polish and richer betting markets.
