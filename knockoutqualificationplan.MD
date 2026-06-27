# Knockout Qualification Projection Plan

## Goal

Automatically show teams that have already qualified for the knockout stage in the **Knockout** tab before every official Round of 32 fixture is fully populated by the external football API.

The feature should make the bracket feel closer to Google's presentation:

- confirmed group winners/runners-up appear in their known Round of 32 slots.
- uncertain third-place opponents remain `TBD` until the app can resolve them safely.
- official synced knockout fixtures always override local projections.
- later knockout rounds still use the existing winner-progression logic.

This is a display/projection layer first. It should not invent official fixtures in the database unless the source API has actually provided them.

## Current Gap

The app currently builds the Knockout tab from saved knockout `matches`.

That means:

- if football-data.org has synced a real knockout fixture, the teams appear.
- if no saved knockout match exists, the bracket shows `TBD`.
- winners from finished knockout matches can flow into the next round visually.
- group-stage qualifiers are not currently projected into Round of 32 slots.

The app also only has an approximate group qualification status today. It marks top two as qualified after a group is complete, and does not yet model the 2026 best-third-place qualification rules.

## Milestone 1: Official Round of 32 Slot Rules

Add a pure utility that knows the fixed Round of 32 slot labels for the 2026 World Cup.

Create a file such as:

- `src/lib/knockout/roundOf32Slots.ts`

The utility should define the expected participant sources for match slots 73-88 / bracket slots 1-16.

Example source types:

- `winner:A`
- `runner_up:A`
- `third_place:A/B/C/D/F`
- `tbd`

Known fixed slots from the tournament format should include:

- slot 1: runner-up Group A vs runner-up Group B
- slot 3: winner Group F vs runner-up Group C
- slot 4: winner Group C vs runner-up Group F
- slot 6: runner-up Group E vs runner-up Group I
- slot 11: runner-up Group K vs runner-up Group L
- slot 12: winner Group H vs runner-up Group J
- slot 14: winner Group J vs runner-up Group H
- slot 16: runner-up Group D vs runner-up Group G

Slots involving best third-place teams should expose the allowed groups but should not pick a team until Milestone 3.

### Tests

- Every Round of 32 slot from 1-16 has exactly two participant source definitions.
- Fixed winner/runner-up slots return the expected group source.
- Third-place slots return allowed group sets without selecting a team.
- Invalid slot numbers are rejected or return `null`.

## Milestone 2: Group Qualification Projection

Add a pure utility that turns group tables into qualification candidates.

Create a file such as:

- `src/lib/knockout/groupQualification.ts`

The first version should be conservative:

- only treat a group winner/runner-up as confirmed when all group matches for that group are finished.
- use the existing `computeGroupTable` ordering for the app's display.
- expose third-place teams separately as candidates, but do not mark them as safely qualified yet unless all groups are finished and the app can rank them.

Suggested output model:

```ts
interface GroupQualification {
  groupLetter: string;
  complete: boolean;
  winnerTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdPlaceTeamId: string | null;
}
```

### Tests

- Incomplete groups return `complete: false` and no confirmed winner/runner-up.
- Complete groups return winner, runner-up, and third-place team IDs.
- Groups with no matches return empty qualification data.
- Existing group table ordering is preserved.

## Milestone 3: Best Third-Place Ranking

Add a conservative best-third ranking helper.

This should support the 2026 structure:

- 12 third-place teams.
- top 8 advance.
- ranking by points, goal difference, goals scored.

Do not pretend to be fully official if the app does not have fair-play/team-conduct data or FIFA ranking fallback data. If teams are tied beyond the data the app has, mark those third-place outcomes as unresolved instead of guessing.

Suggested output model:

```ts
interface ThirdPlaceRankingRow {
  groupLetter: string;
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  qualifiedState: 'qualified' | 'eliminated' | 'unresolved';
}
```

### Tests

- Ranks third-place teams by points, goal difference, then goals for.
- Marks clear top-eight teams as `qualified`.
- Marks clear bottom-four teams as `eliminated`.
- Marks boundary ties as `unresolved` when fair-play/ranking data would be needed.
- Does not produce third-place qualification before enough group data exists.

## Milestone 4: Project Round of 32 Participants

Extend the bracket builder so it can overlay projected Round of 32 participants when no official match row exists yet.

Preferred approach:

- keep database `matches` unchanged.
- keep official synced matches as the highest-priority source.
- pass `teams`, `matches`, and `settings` into a new projection builder.
- for each Round of 32 slot:
  - if a real match exists, use the real match teams.
  - otherwise, fill fixed winner/runner-up sources from completed group projections.
  - fill third-place sources only when safely resolved.
  - otherwise keep `TBD`.

Suggested API:

```ts
buildKnockoutBracket({
  matches,
  teams,
  settings,
  includeGroupProjections: true,
})
```

or add a wrapper:

```ts
buildProjectedKnockoutBracket(matches, teams, settings)
```

### Tests

- A completed Group D winner appears in the correct Round of 32 slot when no official match row exists.
- A completed Group A runner-up appears in the correct fixed runner-up slot.
- Official synced knockout match teams override projected teams.
- Third-place slots remain `TBD` while unresolved.
- Later-round winner derivation still works exactly as before.

## Milestone 5: UI Labels for Projected Participants

Update the Knockout tab UI so projected participants are clear but not noisy.

Behavior:

- Real match teams display exactly as they do now.
- Projected group qualifiers display as normal team rows.
- Optionally show a small subtle source label such as `1st A`, `2nd D`, or `3rd?`.
- Third-place unresolved rows remain `TBD`.
- Avoid adding explanatory text blocks to the page.

Suggested participant source additions:

- `group_winner`
- `group_runner_up`
- `best_third`
- `unresolved_third`

### Tests

- Projected participants render team name, flag, and owner code.
- Real match participants do not show projection-only labels.
- Unresolved third-place participant renders as `TBD`.
- Mobile bracket cards remain readable.

## Milestone 6: Integration and Manual Verification

Wire the projected bracket into:

- `src/app/knockout/page.tsx`
- `src/components/KnockoutBracket.tsx`
- existing realtime refresh behavior

No cron change should be required. Realtime and fallback refresh already update open pages when group results or official knockout fixtures change.

### Automated Tests

Run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

### Manual Scenarios

- Complete all Group A matches and confirm the Group A runner-up appears in the fixed Round of 32 slot.
- Complete all Group D matches and confirm the Group D winner and runner-up appear in their fixed slots.
- Leave a group incomplete and confirm its participants stay `TBD`.
- Trigger a sync that inserts an official Round of 32 fixture and confirm official teams override projections.
- Test a third-place boundary tie and confirm the app does not guess.
- Open the Knockout tab in two tabs, update a group result, and confirm realtime refresh updates the other tab.

## Future Refinements

- Add official fair-play/team-conduct data if a reliable source is available.
- Add FIFA ranking fallback if needed for fully official tie resolution.
- Add the full Annex C third-place matchup matrix if the app needs to place best-third teams before the official API fixture rows arrive.
- Add "clinched before group completion" logic, where a team can be mathematically qualified before all group matches are finished.

## Assumptions

- V1 should be conservative and avoid guessing uncertain third-place teams.
- Official synced API fixtures remain the source of truth when available.
- The database does not need new columns for this milestone because projections can be computed from existing teams, matches, and settings.
- The app's current group table rules are sufficient for initial family/friends display, but not fully official FIFA tie-break coverage.
