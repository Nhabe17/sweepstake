# Knockout Bracket Implementation Plan

## Goal

Add a new **Knockout** tab that shows a bracket-style tournament view from **Round of 32 -> Round of 16 -> Quarter-finals -> Semi-finals -> Final**, with TBD placeholders, live/final scores, owners, and automatic updates from the existing realtime refresh work.

This should be similar to Google's horizontal knockout display: compact match cards, stage headers, connector lines, and an expanding/scrolling view across rounds. It does not need to be a pixel-perfect clone.

## Milestone 1: Bracket Data Foundation

- Add a `bracketSlot?: number | null` field to `Match`.
- Add `bracket_slot integer` to Supabase `matches`.
- Add a partial unique index for knockout slots:
  - unique on `(stage, bracket_slot)`
  - only where `stage <> 'group'` and `bracket_slot is not null`
- Update Supabase mappers, schema, and migration files.
- Add a knockout template utility, for example `src/lib/knockout/bracket.ts`, with fixed slots:
  - `r32`: 16 slots
  - `r16`: 8 slots
  - `qf`: 4 slots
  - `sf`: 2 slots
  - `final`: 1 slot
  - `third_place`: 1 separate non-bracket card
- The template should render virtual TBD nodes even when no DB match exists yet.
- Actual DB matches should overlay onto template slots by `stage + bracketSlot`.

### Tests

- Bracket builder returns the correct number of slots per round.
- Missing DB rows still render TBD placeholders.
- Existing matches map into the correct bracket slot.
- Finished match winners flow into the next round visually when the next match row is not available yet.

## Milestone 2: Safer Knockout Sync

- Update `footballDataProvider` so sync no longer relies mainly on team-pair matching.
- Match priority should be:
  1. `external_id`
  2. knockout `stage + bracket_slot`
  3. group-stage fallback by team pair + kickoff proximity
- Extend the football-data match type to read provider fields such as `stage` and `matchday` if present.
- Map FIFA match numbers to bracket slots:
  - 73-88 -> `r32` slots 1-16
  - 89-96 -> `r16` slots 1-8
  - 97-100 -> `qf` slots 1-4
  - 101-102 -> `sf` slots 1-2
  - 103 -> `third_place`
  - 104 -> `final`
- When a knockout API fixture appears with known teams, upsert it into `matches`.
- Preserve manual overrides exactly as today.

### Tests

- Sync inserts a new Round of 32 fixture.
- Sync updates a knockout fixture by `external_id`.
- A knockout rematch between teams that met in the group stage does not overwrite the group-stage row.
- Penalty scores still map correctly and score the winner as a win.

## Milestone 3: Knockout UI

- Add route: `src/app/knockout/page.tsx`.
- Add `Knockout` to `BottomNav`.
- Build a `KnockoutBracket` component with:
  - horizontal scroll/snap layout
  - left/right arrow buttons
  - stage headers
  - compact match cards
  - connector lines between paired matches
  - TBD shield placeholder rows
  - flags/team names/owner codes when teams are known
  - scores, penalties, live/full-time states
- Desktop/tablet behavior:
  - show roughly 3 stages at a time, like the Google-style reference.
  - arrow advances the viewport from `R32/R16/QF` to `QF/SF/Final`.
- Mobile behavior:
  - horizontal scroll with snap points.
  - cards remain readable at 360px width.
- Keep Groups page unchanged; Knockout is its own tab.

### Tests

- With no knockout matches, page shows full TBD bracket.
- With partial Round of 32 data, known teams appear and unknowns remain TBD.
- With finished Round of 32 results, winners appear in derived Round of 16 slots if API has not inserted those rows yet.
- Layout is checked at mobile and desktop widths.

## Milestone 4: Integration With Existing App

- Ensure `Leaderboard` continues scoring finished knockout matches. It already should, because the leaderboard logic scores all finished matches.
- Ensure `Matches` page continues showing knockout matches under `All`, `Upcoming`, `Completed`, and `My teams`.
- Ensure betting odds still only appear for scheduled matches with odds data.
- Ensure realtime refresh updates the Knockout tab after cron sync/admin changes.

### Tests

- Add a finished knockout match and confirm leaderboard points update.
- Confirm penalty shootout win affects points correctly.
- Trigger sync/admin result override and confirm Knockout tab refreshes without reload.
- Run:
  - `npm run typecheck`
  - `npm run test`

## Assumptions

- V1 will not compute the complex 2026 best-third-place Round of 32 matrix itself. It will rely on football-data.org/API sync to populate actual Round of 32 teams.
- Before API fixtures are known, the bracket shows TBD placeholders.
- Third-place match is included for scoring, but displayed separately from the main winner-to-final bracket.
- The visual target is Google-like bracket navigation and density, adapted to the existing app design.
