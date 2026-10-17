# House Scanner handoff, 17 October 2026

Public-safe. Private planning (spec v2.6) lives outside this repo. Read this with `docs/house-scanner.md` (work record) and `docs/decisions.md` (why things are the way they are). Do not add household identities, real listing data or credentials here.

## Where things stand

Live and used by the household: access-code sign-in for several members, two sources (Boneo, Bjurfors) collected by a local guarded Node reader and delivered through a signed ingest function into Supabase, a React app at `/projects/house-scanner` with Listings, Favorites (star over the photo), Add link, Sources and Settings tabs, filters, a street and satellite map, see-on-map, a not-located marker, and estimated positions from street addresses (built and unit-tested, not yet run on real data). Work branch `codex/house-scanner`; PR 24 merged to `main`.

Operational facts:
- The collector is run by hand. The profile file `revision` must equal the app's after each profile save. `--force` bypasses the 6-hour guard. A first Bjurfors run takes about 9 minutes.
- The ingest credential and source policy approvals expire (credential mid-December 2026, approvals about 90 days). Calendar them.
- SQL for people and checks is in the runbook section of `docs/house-scanner.md`. Use `hs.admin_set_member`, never raw updates on `hs.members`.
- Local state that must stay out of git: profiles file, `house-scanner.cache*.json` (run memory and geocode cache), env files.

## Deviations from the private spec found on 17 October

Owner decisions on 17 October are marked. The rest still need a decision: change the app or update the spec.
1. Cards show no reasons or caveats when collapsed (spec: up to three reasons plus caveats). Decided: fix with the reason chips in the backlog.
2. Street-only geocoded positions are stored as precision `address` and look exact. Decided: a street address is precise enough; add an `estimated` boolean to the coordinate data (contract and database) so the UI can say so. Buyers will contact the broker for any listing worth a closer look.
3. Public Nominatim is used for geocoding, which the spec cautions against. Decided: accepted. It is free, the volume is one lookup per new home (cached, 60 per run at 1.5 s apart), and that is within its usage policy (identify the client, one request a second, cache). Amend the spec; revisit if it blocks the reader.
4. Esri satellite tiles were never checked for a free licensed use.
5. Coverage gaps: houses, Mölndal, upcoming and unknown-price listings. Bjurfors reads Göteborg only.
6. No backups. Supabase Free has none. Spec asks for weekly encrypted exports and a restore path. Highest priority gap.
7. A free Supabase project can pause after a week of inactivity. A daily scheduler would prevent that.

Known and unbuilt: daily scheduled collection, retention purge job scheduling, digests, nature and transit evidence, optional AI enrichment, zoom clustering, pin placement for manual links, restoring an earlier profile revision, same-origin script review.

Small known issues: the Sources tab shows one scan note for every source; filters reset on reload; relisted Bjurfors homes are not told apart; `Details` from a map pin switches to List view; locked leftover folders under `.worktrees` need deleting after a restart.

## Backlog from the owner, in rough order

1. ~~Structure and developer-experience pass~~ Done and live on 17 October; see "After the structure pass" below.
2. **Click or tap outside the selected-home card on the map closes it**, mobile and desktop, without the X.
3. **Reason chips**: up to three factual chips per card (for example Within budget, Balcony, Lift) plus one gray caveat chip (for example Transit not checked), filterable by chip. No numeric score and no ranking, which matches the spec. This also resolves deviation 1.
4. **Hide button, personal**: hiding affects only the person who hid it. Needs a table (household, listing, user, timestamp), an RPC pair, a snapshot field and a contract change. The filter panel gets a three-way view: not hidden, hidden, both. Hidden homes show a badge on the card and a dimmed pin on the map, so the list and map stay in sync. Never delete anything; it is a view filter.
5. Backups and the scheduler (deviations 6 and 7).
6. Coverage: houses, Mölndal, unknown-price listings.

## Suggested structure pass (a suggestion, not a plan)

The owner intends a senior architect or designer agent (Opus 5.5) to decide the real structure. Treat everything below as input to that agent, which should write a short plan and get the owner's approval before moving files. A mid-tier model (Sonnet 5.5) can then carry out the approved plan and the backlog features. Use the stronger model again for the scheduler design and a final review.

The feature grew to about 25k lines, most of it tests. Goals: easier scaling, clearer ownership, less to read before changing anything. Candidates to examine, not decisions:
- `household-workspace.tsx` mixes tab state, filtering, map points and favorites logic. Split view logic from state.
- The collector's `live-reader.ts` holds shared guards plus per-source steps; check the adapter boundary still reads cleanly with geocoding added.
- Confirm one place owns wording for match sections, and one place owns "has a pin".
- Check tests mirror the structure and none duplicate each other.
- Update `docs/architecture.md` to the real layout afterwards, since the spec's proposed paths differ from the actual ones.

Plan the structure first with a stronger model, then execute mechanically with a mid-tier one, running `npm run check`, `typecheck`, `test:typecheck`, `test`, `test:browser` and `build` after each step. Keep behavior unchanged during the pass.

## After the structure pass (17 October, evening)

Start the next session from this file. It already carries what the private spec says about these features; open the spec only for intent questions (it says dismissal is personal and never hides a home from anyone else). Then read `docs/architecture.md` for where code goes and `docs/house-scanner-structure-plan.md` for why.

Done and merged: every step of the structure plan (R1 to R8, F1 to F3, D1 to D6), the attribution fix, a filled and ringed selected pin, one membership request per refresh instead of two, and no re-render when a refresh brings back identical data. The work record in `docs/house-scanner.md` lists the evidence.

Network calls the owner saw, explained: a refresh is `getUser`, `hs_memberships` and `hs_snapshot`. It runs on window focus (including clicking back into the page from DevTools) and after the member's own saves. The spec's 60-second poll was removed on 17 October; see decisions.md. `hs_notes` runs when Details opens a home; an empty array means nobody has written a note on it.

Where the next features land:
- Click outside the map card (backlog 2): a background-click callback on `components/household-map.tsx`, cleared in `components/listings-panel.tsx`. Markers are no longer rebuilt on selection, so a map click can be told apart from a marker click.
- Reason chips (backlog 3): build the chips in `utils/match-listing.ts` beside the section labels, render them in `components/listing-summary.tsx` so the card and the details sheet share them, and add a chip filter to `utils/listing-filters.ts`.
- Personal hide (backlog 4): high rigor, because it adds a table, two RPCs and a contract field. Plan it, record it in `docs/decisions.md`, then build: migration and PGlite tests in `supabase/`, a `hidden` field in `types/contracts.ts` and the snapshot, client calls in `api/household-client.ts`, a three-way value in `utils/listing-filters.ts`, a badge in `listing-card.tsx` and a `dimmed` flag from `utils/listing-view.ts` `mapPoints`. List and map read one filtered array, so they stay in sync without extra wiring.
- Estimated positions (deviation 2): an `estimated` boolean on the coordinate contract and column, set by `tools/house-scanner/geocoder.ts`, labelled through `utils/listing-position.ts`.

Suggested order: click outside (small, no backend), reason chips (no backend), then hide and the estimated flag together, since both change the contract and need one migration. Backups and the scheduler stay next after that.
