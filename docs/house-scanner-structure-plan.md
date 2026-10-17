# House Scanner structure and design plan, 17 October 2026

Public-safe. Written for owner approval before any code moves. Read with the [17 October handoff](house-scanner-handoff-2026-10-17.md).

Scope of the review: every file under `src/features/house-scanner`, `tools/house-scanner` and `supabase/tests`, the docs that describe them, and the running app (demo data) at 1440×1000 and 375×812. The live household data was not reviewed: it needs an access code, and I did not sign in. The demo has five homes and no photos, so card judgments about photos are inferred from the layout code.

## Findings, ranked by value for effort

| # | Finding | Value | Effort |
|---|---|---|---|
| 1 | `household-workspace.tsx` (571 lines) holds tab state, scoping by tab, person and match section, map point building, favorite mutation state, source counts and the markup of all five tabs. Every backlog item (hidden view, chips, click-outside) has to edit it. None of its derivation logic has a unit test. | High | Medium |
| 2 | Shared rules live in two or three places. "Has a pin" is `isOnMap` in `listing-filters.ts`, again inline in `match-listing.ts` (`geographicScope`) and in `listing-card.tsx`. Match section wording is `SECTION_LABELS` in `workspace-view.ts` plus a hand-written tooltip in the workspace, with "Links we added" written twice. In the collector, "a house number in the title means address precision" is written three times (`boneo-parser.ts`, `live-reader.ts`, `geocoder.ts`) and `USER_AGENT` twice. | High | Low |
| 3 | On a phone the first photo starts about 650 px down an 812 px screen. Above it: back link, display-size title, subtitle, status line, five tabs wrapping to two rows, a heading that repeats the active tab, Match, Filters, count and List/Map. On desktop the grid starts about 300 px down. | High | Medium |
| 4 | Pressing a map marker rebuilds every marker, because the marker effect depends on `selectedId`. Keyboard focus drops to the page body after each press (checked in the browser), and at 260 homes every selection recreates 260 DOM nodes. | High | Low |
| 5 | Touch targets on a phone are 30 to 36 px: tabs, star, Details, See on map, map markers. The minimum is 44. | Medium | Low |
| 6 | The Bjurfors suite (`bjurfors-live.test.ts`, 1017 lines) repeats about ten guard tests that `live-reader.test.ts` already proves against the shared reader: robots unreadable, 40 pages, 250 requests, 150 listing pages, shared request cap, robots-disallowed listing page, failed listing page, log shape, run memory reuse and expiry. | Medium | Medium |
| 7 | The collector's adapter boundary leaks. `bjurfors-parser.ts` imports its page types and number helpers from `boneo-parser.ts`. `live-reader.ts` imports `adapterFor` from `source-adapters.ts`, which imports the adapter type back from `live-reader.ts`. `live-reader.ts` (631 lines) also holds robots parsing, the publish request builder and the coverage sentence. | Medium | Low |
| 8 | The selected card expands to a full row and reflows the grid, so every card below it jumps and the member loses their place. The details are a long flat list of small text. | Medium | Medium |
| 9 | On a phone the selected-home card covers the lower half of the map, including the selected pin, because the map centers the pin without accounting for the card. Opening the map with a home already selected also pushes the "not located" marker off screen (checked: it sat at x = −179). | Medium | Low |
| 10 | Cards give the title more weight than the price, show an "Available" badge on every card, prefix the match label with the profile name even with one profile, and carry a filled "Open original listing" button on every card, so nothing stands out. Cards have ragged heights. | Medium | Low |
| 11 | Docs no longer match the code. `docs/architecture.md` says there is no test runner and only a synthetic executor. `docs/house-scanner.md` points new readers at the 12 October handoff and says the map "loads after Open map". Neither describes the folder layout. | Medium | Low |
| 12 | Small: the demo status line turns red because the demo edition is old; Add link fields stretch to 1400 px on desktop; sign-in fields are 196 px wide on a phone; the map's reduced-motion CSS rule targets `scroll-behavior`, which MapLibre does not use; wheel and touch over the map capture page scroll; `live-test-helpers.ts` uses `as unknown as typeof fetch`. | Low | Low |

Motion check against the apple-design guidance: the app animates almost nothing, so there is little to get wrong and nothing that fights the user. Mantine's theme already sets `respectReducedMotion`, and map selection uses `jumpTo`, which does not animate. What is missing is continuity: the expanded card, the pin card and tab changes appear without any link to where they came from (findings 8 and 9). Press feedback comes from Mantine's default button styles and is fine.

## Proposed structure

Frontend, inside the existing feature layout. New files are marked new; everything else is a move or a split.

```
src/features/house-scanner/
  api/            unchanged
  components/
    house-scanner-page.tsx, house-scanner-access.tsx   unchanged
    household-workspace.tsx   shell only: tab state, status line, nav, notes controller (~150 lines)
    listings-panel.tsx        new: Listings and Favorites view (heading row, filters, count, list or map)
    add-link-panel.tsx        new: manual form plus the duplicate card
    sources-panel.tsx         new
    settings-panel.tsx        new
    listing-card.tsx          collapsed card only (~130 lines); the future chip row and hidden badge go here
    listing-details.tsx       new: the expanded details section
    listing-photo.tsx         new: ListingPhoto, used by the card and the pin card
    household-map.tsx         moved from map/ to match the engineering layout
    pin-card.tsx, listing-filter-panel.tsx, listing-notes.tsx, manual-listing-form.tsx, profile-editor.tsx
  hooks/
    use-favorite-toggle.ts    new: pending ids, status message, toggle, canSave
    use-household-session.ts, use-demo-household.ts, use-listing-notes.ts   unchanged
  types/
    household.ts              new: one HouseholdActions type for access, workspace and demo
  utils/
    listing-view.ts           new: scopeListings, mapPoints, sourceSummaries (pure, unit-tested)
    listing-position.ts       new: hasPin; later the estimated label
    match-listing.ts          also owns section labels and descriptions, typed by MatchResult['section'], and listingMatches
    format.ts                 renamed from workspace-view.ts: formatPrice, formatDate, compactPrice
    listing-filters.ts, listing-staleness.ts, scan-summary.ts, source-policy.ts
```

How the backlog lands on this shape:
- Hidden listings: a `hidden` field on the snapshot, a three-way `hidden` value in `ListingFilters`, a badge in `listing-card.tsx` and a `dimmed` flag from `mapPoints`. List and map already share one filtered array, so they stay in sync without new wiring.
- Reason chips: chips come from `match-listing.ts` next to the section labels and render in the collapsed card.
- Estimated coordinates: the contract flag plus one label function in `listing-position.ts`.
- Click outside the map card: one `onBackgroundClick` prop on the map, easy once markers stop being rebuilt (fix F1).

Collector, kept flat with two sources:

```
tools/house-scanner/
  page-read.ts       new: PageRead, ReadContext, MorePages, PageFailure, numberOf, positiveInt, area,
                     the page size limits, and positionPrecision(title) for the house-number rule
  robots.ts          new: parseRobots, robotsAllows (moved from live-reader.ts)
  live-reader.ts     SourceAdapter, guarded fetch, page loop, listing page phase, the one USER_AGENT
  live-run.ts        new: prepareLiveRun, assertAdapterOutput, coverage sentence (moved from live-reader.ts)
  boneo-parser.ts, bjurfors-parser.ts   source parsing only, both importing page-read.ts
  source-adapters.ts, source-registry.ts, geocoder.ts, prefilter.ts, run-memory.ts, sender.ts, cli.ts
```

This removes the Bjurfors-to-Boneo import and the import cycle. `cli.ts` imports `live-run.ts`.

## Step order

Every step is one commit and must pass, in full: `npm run check`, `npm run typecheck`, `npm run test:typecheck`, `npm test`, `npm run test:browser`, `npm run build`. Steps R1 to R8 change no behavior. Tests move with the code they test and keep their assertions.

Refactor, behavior unchanged:
1. R1, shared frontend rules. Add `listing-position.ts` with `hasPin` and use it in the filters, matching and card. Move section labels, the tooltip descriptions and "Links we added" into `match-listing.ts` as one typed record, with `listingMatches`. Rename `workspace-view.ts` to `format.ts`, move `compactPrice` into it, and put `normalizeManualUrl` beside its only caller.
2. R2, one `HouseholdActions` type in `types/household.ts`, used by access, workspace and the synthetic workspace.
3. R3, split the workspace. Pure derivations go to `listing-view.ts` with a new test file that pins today's behavior. Favorite state goes to `use-favorite-toggle.ts`. Each tab body becomes a panel component. Shared view state (filters, view, selection, section, person) stays in the shell so switching between Listings and Favorites keeps it, as it does today.
4. R4, split the card into `listing-card.tsx`, `listing-details.tsx` and `listing-photo.tsx`.
5. R5, move `map/` into `components/`. Confirm the build still emits MapLibre as a separate chunk.
6. R6, collector seams: `page-read.ts`, `robots.ts`, `live-run.ts`, one `USER_AGENT`, one `positionPrecision`, and the geocoder's relative import replaced with the alias.
7. R7, collector tests. Move robots tests to `robots.test.ts` and prepared-run tests to `live-run.test.ts`. Delete the Bjurfors tests that repeat a shared guard (finding 6) only where `live-reader.test.ts` proves the same guard; keep every Bjurfors test about headers, empty pages, paging by total, card prefiltering, merged facts and coordinates, memory contents, registry, executor guards and the floor rule. Replace the `as unknown as` cast with a typed `vi.fn<typeof fetch>`. This deletes tests, so it needs your explicit yes.
8. R8, docs. Rewrite the House Scanner section of `docs/architecture.md` to the real layout and commands, update the pointer and stale map line in `docs/house-scanner.md`, and update the file list in `tools/house-scanner/README.md`.

Bug fixes, each with a regression test watched failing first. These change behavior, so they are separate from the refactor:
9. F1, markers are created when the points change and only their pressed state updates on selection. Fixes focus loss and the rebuild cost.
10. F2, the map keeps the "not located" marker in the first view when a home is already selected, and centers the selected pin in the area the card leaves free (MapLibre `padding`).
11. F3, the stale colour applies to real editions only, not the demo line.

Design changes, each a visible change you can accept or skip:
12. D1, 44 px touch targets on coarse pointers: tabs, star, card buttons, markers.
13. D2, a shorter first screen: a compact header inside the app, tabs on one row that never wraps, no heading that repeats the tab, Match, Filters, count and List/Map on one row, and the basemap toggle inside the map corner.
14. D3, card hierarchy: price first and largest, title on one line, status badge only when not available or stale, profile name only when more than one profile is on, one quiet link to the original instead of a filled button, equal card heights, "No photo" placeholder. This also makes room for the chip row.
15. D4, details in a sheet instead of a full-row expansion: a side sheet on desktop and a bottom sheet on a phone, using Mantine's `Drawer` (installed, follows the reduced-motion setting), opened from the card and returning focus to it. Biggest design step; decide it after D3.
16. D5, phone map: the selected home as a bottom sheet on the map's lower edge, and two-finger panning on touch so the page scrolls past the map. Click-outside-to-close from the backlog fits here.
17. D6, form widths: Add link and Settings capped near 36 rem, sign-in fields full width up to about 22 rem.

## What I would not touch, and why

- `supabase/migrations`, `supabase/tests` and the Edge function. The two database suites (5,700 lines) duplicate about a dozen helpers, but their defaults differ and they are the only proof the migrations hold. Merging them saves a few hundred lines and risks changing what they prove. Revisit when the hidden-listing migration adds a third suite.
- `types/contracts.ts`. It is the boundary with the database and the collector. It changes with the hidden and estimated features, not in a structure pass.
- `use-household-session.ts`. Its length comes from session-race fixes that each have a regression test. It works and is not on the backlog's path.
- `tools/house-scanner/acceptance/`, route files, and `docs/decisions.md` (append-only; nothing here reverses a decision).
- A folder per source in the collector. Two sources do not justify it; revisit at the third.
- The spec's desktop layout with map and list side by side. It is a real layout feature, not a fix, and belongs after D2 to D5 if you still want it.
- No new dependencies. Mantine already covers sheets, segmented controls and reduced motion.

## Which steps a mid-tier model can do

- Mechanical, a mid-tier model at medium effort with diff review: R1, R2, R4, R5, R6, R8, F3, D1, D6.
- Mid-tier at high effort, with a careful diff review because the state has to land in the same place: R3.
- Needs judgment, so I would do it or review it line by line: R7 (which tests are true duplicates), F1 and F2 (map lifecycle), D2 to D5 (design calls).

Expected size change: the workspace from 571 to about 150 lines, the card from 359 to about 130, `live-reader.ts` from 631 to about 380, and the Bjurfors suite from 1017 to about 550.
