# House Scanner implementation

For continuation, read the [12 October 2026 handoff](house-scanner-handoff-2026-10-12.md) alongside the canonical private specifications and this work record.

This guide is public-safe. The canonical private product plan remains outside this repository. Do not add household preferences, identities, reference properties, real listing snapshots or credentials here.

## Goal and acceptance

Build a private shared shortlist at /projects/house-scanner. This implementation starts with isolated synthetic data and disabled live effects. The public shell can expose the synthetic demo explicitly; private access requires an authenticated active household member.

Foundation acceptance requires route/build checks, a fresh independent auth/ingest review, and authorized behavioral checks for household isolation, actor ownership, replay and atomic publication. Static checks alone do not satisfy that gate. The user authorized local behavior and privacy checks on 12 October 2026. Live accounts, messages, collection and deployment remain outside this authorization.

## Contracts and ownership

Contract version 1 lives in src/features/house-scanner/types/contracts.ts. Zod validates untrusted inputs. Profiles carry revisions; the database owns live criteria. Demo criteria are fictional and must never seed a live household. Null means unknown and conflicts remain explicit. Hard exclusions use confirmed facts only. Buyer notes, source observations and optional model interpretations have distinct ownership.

The coordinator owns contracts, migrations allocation, package files, route/registry wiring and workflows. Features own UI, hooks, network modules and scoped styles. Tools and Supabase code are not imported into the browser. Keep one root MantineProvider; feature portals stay inside the feature scope.

Shared favorites are one row per household/listing/authenticated actor. Removing one row cannot remove another member's save. Manual links are bookmarks, never an instruction to fetch a URL. Collection never writes favorites, notes, membership or notification preferences.

## Security and publication design

Use Supabase Auth with invitation-only password sign-in where each member's password is a personal access code, disabled public signup and current-membership RLS. No email is sent. Remember off uses sessionStorage; remember on uses namespaced SDK token storage. Never persist a private listing snapshot. Clear private state on session change and sign-out.

The ingestion endpoint accepts bounded signed requests. A revocable credential binds one household, ingest scope and approved source IDs. Signature covers method, canonical /functions/v1/house-scanner-ingest path, timestamp, nonce and SHA-256 body digest. The function accepts the gateway-forwarded path but always signs the public canonical path. Nonces are atomically consumed after authentication. The server owns keys; the collector never receives a database service key. Request bodies cannot name actors or household IDs.

Stage observations per run and publish in one database transaction. Failed sources retain prior facts. A failed or empty-placeholder fetch is not successful empty coverage. Persist source cursors only on publication. Replayed batches must have identical content. Comparable asking prices belong to one source and listing episode; unknown prices are not zero. Source IDs are conservative identity links; cross-source merges require stronger evidence and remain deferred.

Alternative: static JSON is useful for fixtures but cannot authorize private access or merge concurrent edits. A local-only backend would make shared state depend on a personal computer. The selected hosted schema isolates that dependency from the public site.

Rollback before activation: revert feature route/registry exposure or local commits. After activation: disable jobs, revoke compromised credentials/membership, preserve user-authored records and the last good edition, export privately before any destructive migration. No down migration deletes household data.

## Source and account prerequisites

No live source is approved. Reachable pages do not establish collection, display, retention, image, notification or model rights. All real source policies start disabled or pending. A bounded permitted proof must establish identity, field semantics, coverage, unknown prices, upcoming listings, pagination and an update route before an adapter can activate.

Before live use: provision an approved free Supabase project, apply and verify migrations, bootstrap the initial owner privately, disable signup, create each member as a Supabase user with their access code as the password (no SMTP needed), verify storage behavior and same-origin scripts, establish source permissions, confirm free account allowances and no overages. No accounts, remote schedules, emails, broker contacts or deployments are created by local implementation.

Map tiles are independent of listing facts and household state. Use a permitted configurable provider with attribution; preserve the list if WebGL or tiles fail. Approximate/unknown positions never become exact pins. Do not batch-geocode arbitrary links.

Optional inference, digests and live scheduling remain disabled. Model failure must not affect collection or matching. A future daily workflow needs reviewed free capacity and source access before activation.

## Work record

Base website commit: cf079861fae0fccd0a8386b737eb30e2292bdcf8 (latest main fetched on 12 October 2026). It contains the textile workshop branch through ab15dbad33e060aaf0c59f1bfc8e7f3b883a9c60.
Private planning reference: 8dc5455, specification v2.6 / agent guide v1.1.
Integration worktree: C:\Users\bhobb\.codex\worktrees\house-scanner\bobbyinscoe.
Original checkout changes are outside this work.

| Task | Dependencies | State | Owner |
| --- | --- | --- | --- |
| F0 contracts, route and source gates | Approved plan | accepted for local consumers; local runtime checks recorded below | Coordinator, gpt-6.1-sol high |
| F0 independent security review | Fixed foundation diff | findings corrected; design reviewed | /root/foundation_review, gpt-6.1-sol high |
| P1 UI and map | ffbc326 | integrated as 346403b; local browser checks passed | /root/project_ui, gpt-6.1-sol medium |
| P1 fixture collector | ffbc326; synthetic only | integrated as 17d3567; local fixture checks passed | /root/fixture_collector, gpt-6.1-sol medium |
| P1 schema/session/ingest | ffbc326; reviewed design | integrated as 4a655a5, 8ca9cf1 and 1dcd2a2; local runtime checks passed; hosted gates remain | /root/private_backend, gpt-6.1-sol high |
| P1 backend security review | Final backend diff | fixed diff reviewed; no remaining source-review blockers; runtime gate pending | /root/backend_review, gpt-6.1-sol high |

Workers are leaves and use separate managed worktrees at the accepted foundation commit. Record requested model/effort and actual launcher acknowledgment; the launcher does not independently attest the execution model. No worker owns shared files without reassignment.

Worker worktrees are house-scanner-ui, house-scanner-tools and house-scanner-backend under the same managed worktree directory, each based on 757cdff6e2faa39bb8c35da98119b5f4c68668f4. All three explicit model/effort requests were acknowledged by the launcher. No nested workers were launched.

Foundation evidence: npm run check, npm run typecheck and npm run build passed after the contract review corrections. No behavior tests ran. npm audit reported GHSA-68fv-2mgg-jv7q in source-map-js 1.2.1, a development dependency already present in the base lockfile. No broad audit fix was applied.

## Local implementation and remaining work

The public route defaults to the configured private-access state and offers an explicit synthetic demo. The same workspace renders suggestions, an attributed union of favorites, manual bookmarks and existing editable owner profiles. Profile saves use revision checks. Polling refreshes private data without deliberately resetting a same-user workspace. Identity changes remount the workspace and clear its private UI state.

The map loads after Open map, uses the same filtered listings as the list and groups homes sharing an exact coordinate. Approximate and unknown coordinates remain list only. Zoom-based clustering, richer photo overlays and licensed geography/transit enrichment remain future work. No nature or journey estimates are inferred from map coloring.

The collector has one synthetic fixture executor, bounded requests and explicit replay inputs. It prepares begin/stage/publish requests in memory. No sender, real adapter, daily workflow or digest is active. The schema and signed endpoint are local source, not a provisioned service.

Backend notes are actor-owned and revisioned. The workspace shows each member's note on the open details card and lets the signed-in member edit only their own, through the session hook or the in-memory demo store. A stale save keeps the draft and offers explicit recovery. The manual form stores an initial note. Manual edit/removal and internationalized manual hostnames are deferred; server bookmark validation currently accepts a conservative ASCII DNS/IP subset. Membership administration, initial profile creation, notifications and source-policy management require a later private administration flow. No live household is seeded with demo criteria.

Retention cleanup exists as `hs_purge_expired` (migration 202610120002), callable by the service role only and dry run by default. It deletes or scrubs expired source records, history, staged payloads and nonces older than one hour, and never touches a listing someone favorited or put a non-empty note on. Nothing calls it yet: a private job or operator procedure must loop until `more` is false, after a private export. Read-time redaction remains the second line. Review snapshot limits and pagination before exceeding 500 homes, ten member records, twenty profiles or 5,000 attributed saves. Historical member attribution counts toward these bounds.

The original runtime checklist covered two-household access denial, revoked membership, actor-owned saves/notes, profile conflicts, sign-out and user-switch races, storage denial, signature/replay rejection, duplicate and contradictory batches, failed-source preservation, empty-fetch rejection, atomic publication, source-rights expiry and price-history retention. Also inspect narrow/wide layouts, keyboard controls, map failure and visual isolation from the portfolio. Static builds did not establish these claims. The authorized local evidence below covers a bounded subset; hosted and concurrent transaction checks remain open.

## Original static evidence before rebase

On integration commit 8bc0b11 plus coordinator page wiring, npm run check passed for 130 files, npm run typecheck passed, npm run house-scanner:typecheck passed, npm run build passed and npm run house-scanner:build passed. The collector was compiled but not executed. The Edge function passed Deno check with --no-remote --no-lock --node-modules-dir=manual and supabase/functions/deno.json. SQL was neither parsed nor executed.

The frontend emits a large-chunk warning for the separately loaded MapLibre module (about 1,051 kB minified, 285 kB gzip). It loads only when the map is opened; the warning remains visible. The pre-existing development dependency advisory recorded above remains unresolved.

The fresh independent reviewer inspected the fixed integrated backend, shared retention gate and page composition. Draft findings on session races, storage denial, nested retention, historical replay, nullable JSON, SQL precedence, URL validation, UTF-16 limits, saved-bookmark redaction and coverage labels were corrected. No concrete source-review blockers remained. This is source review, not migration, privacy or concurrency execution evidence.

The original checkout remains at 5349e2d with its existing homepage edit and .claude directory. Its homepage SHA-256 still matches the value captured before work. Worker worktrees are archived after integration; the house-scanner integration worktree remains active on codex/house-scanner. No changes have been pushed or deployed.

For review, run npm run dev from the integration worktree and open /projects/house-scanner. Enter the synthetic demo explicitly. The active session's local preview uses port 5183. Private access defaults off; configuration alone does not establish acceptance.

## Main integration correction

The initial implementation used the redesign checkout at 5349e2d. The user corrected the starting branch. Rebase only the House Scanner commits onto fetched main at cf07986; do not carry the redesign-only history. The prior tip is preserved locally as codex/house-scanner-before-main-rebase for recovery. Local main was fast-forwarded to the fetched commit without checking it out over the user's edits.

Goal: retain main's textile workshop and expose House Scanner with its existing public URL. Done when main and the textile branch are ancestors, the route and workshop folio compile, removed redesign imports/tokens are absent, and static checks pass. Reuse main's Mantine provider, moss/flax colors and Libron headings. No backend behavior, source activation, deployment or unrelated homepage edits are part of this correction.

House Scanner now owns src/features/house-scanner. The app composes its route tree at /projects/house-scanner. Its Mantine page returns to the workshop at /. The workshop's data-only works list, folio link and scene artwork expose the project. Its fifth overview plane has room at desktop and narrow breakpoints. No ProjectFrame, old project registry or --site-* variable is required. Main's provider, theme, global stylesheet, bundled Libron files, Duck Feed and thread geometry remain intact.

The rebased manifest preserves main's Mantine 9.7 dependency ranges and existing toolchain. Only Supabase, MapLibre, Zod and collector scripts are added. Existing locked package versions match main; old redesign font and test packages are not carried over. The migration is byte-for-byte unchanged from the reviewed pre-rebase implementation. Only shared import paths changed in the Edge function and collector.

Fresh static evidence after integration: npm run check passed (78 files), npm run typecheck passed, npm run house-scanner:typecheck passed, npm run build passed, npm run house-scanner:build passed, and the offline Deno Edge check passed. The map chunk warning and pre-existing source-map-js advisory remain. No behavior tests, visual interaction tests or database execution ran. The local preview uses port 5183 and must be restarted after rebasing.

## Authorized local behavior and privacy checks

The user authorized local behavior/privacy checks and continued implementation on 12 October 2026. Goal: execute the existing public UI, session/API, signed handler, collector and actual migration with synthetic data; fix demonstrated failures; retain main's styling. Done when the integrated behavior suite, desktop/narrow browser flows, verification typecheck, normal static gates and independent fix review pass. No live collection, accounts, messages, push or deployment is included.

Vitest runs behavior tests; Testing Library and jsdom run the real React hooks and client with the external Supabase SDK mocked. PGlite runs the actual migration in PostgreSQL WASM, with synthetic roles and an auth.uid shim. Playwright uses installed Microsoft Edge with a fresh context, external requests blocked, and a locally fulfilled blank map style for overlap checks. The interactive browser tool failed to start, so browser evidence comes from Playwright. These are development dependencies; no browser download or paid service is required.

| Task | Dependencies and base | State | Owner/model | Worktree and integrated commit |
| --- | --- | --- | --- | --- |
| V1 test setup | User authorization; dd0821d | accepted | Coordinator, gpt-6.1-sol high | house-scanner; dd0821d, 7d5ea4b |
| V1 database behavior | dd0821d; contract 1 | accepted | /root/db_behavior, gpt-6.1-sol high | house-scanner-db-checks; 1ba8154 from e56597e |
| V1 session behavior | dd0821d; contract 1 | accepted | /root/session_behavior, gpt-6.1-sol high | house-scanner-session-checks; 8f5cf48 from 11c5713 |
| V1 independent review | Fixed integrated diff | accepted; no confirmed privacy blockers | /root/behavior_review, gpt-6.1-sol high | Read-only integration/session worktrees |

Each fresh-context launch explicitly selected the listed model and effort and was acknowledged by the launcher. That acknowledgment does not independently attest execution metadata. All workers remained leaves. The coordinator read both implementation diffs and reran the integrated suites.

Runtime failures corrected:

- Valid ingestion staging failed with PostgreSQL column reference e is ambiguous. Rename the PL/pgSQL evidence loop variable to evidence_item; validation rules and SQL aliases remain intact.
- Late mutations and refreshes could restore private snapshots during logout, and stale callback errors could replace the signed-out state. Guard refresh during sign-out, track session generations, and clear identity refs after auth/load failures. Reject foreign-identity memberships before household selection; refresh identity after token changes.
- A displayed photo remained visible after permission expiry until another render. Schedule a bounded expiry check and remove the image when it expires.
- MapLibre's default worker resolved beside Vite's optimized module and returned 504 in development. Import the installed worker as a Vite URL asset. This also emits a separate worker in production.
- The collector CLI reported two observations for three observations because it counted listing identities. Count staged observations instead.
- A defensive SDK sign-out error case could leave identity-change recovery on the loading screen. Check the returned error and expose the existing error/sign-out controls. The installed SDK normally emits SIGNED_OUT for network failures; the regression test covers an error without that event.

Regression tests were observed failing against the original behavior and passing after the relevant fixes. Initial fixture/control-selector mistakes were corrected in tests without changing product behavior or weakening the assertions.

Fresh integrated evidence: npm test passes 155 tests across nine files, including 30 actual PostgreSQL tests, 68 session/API tests, 17 signed-handler tests, and matching, source policy, photo and collector checks. npm run test:browser passes twelve flows across desktop and narrow viewports. The production preview additionally passes both overlap-selection cases. Screenshots were inspected for narrow list layout and desktop map/details. The map style is a blank local fixture; no claim is made about live tile coverage.

npm run check, npm run typecheck, npm run test:typecheck, npm run house-scanner:typecheck, npm run build, npm run house-scanner:fixture and the offline Deno Edge check pass. test:typecheck includes Node-side SQL/Edge tests and uses a minimal test-only Deno declaration; the actual Edge handler is separately checked by Deno. The CLI reports three observations and three prepared requests, and rejects live or real-source execution. Existing map chunk-size and source-map-js development advisory warnings remain visible.

Limits: PGlite has one connection, so simultaneous nonce, publication and profile-edit transactions are unverified. Synthetic role checks do not establish hosted Auth/PostgREST or gateway configuration. Session tests mock external Auth/RPC and do not prove real OTP/SMTP or SDK synchronization across tabs. Real photo providers and tile transport were not contacted. Retention purge, note display/editing, account setup, source rights and activation remain open as described above. Read-time redaction does not remove stored source content. Live activation remains closed.

Rollback for these local fixes is reverting their scoped commits. No schema shape changed and no remote migration ran. The original redesign checkout and homepage edits remain untouched; the integration branch still contains main and the merged textile workshop ancestry.

## Retention purge and shared notes (13 October 2026)

The user approved the retention design and the shared-note plan with the recommended defaults. Local commits only; nothing was pushed, deployed or purged against real data.

| Task | State | Owner/model | Integrated commit |
| --- | --- | --- | --- |
| R1 retention design | accepted | Plan agent, claude-sonnet-5-5 high | recorded in decisions.md |
| N1 shared-note plan | accepted | Plan agent, claude-sonnet-5-5 medium | none (design only) |
| N2 shared-note UI | accepted | worker, claude-sonnet-5-5 medium | a034727 from 4546b2e |
| R2 retention purge | accepted | worker, claude-sonnet-5-5 high | 64fab76 from 3336721, fix 374085e from 75a67cc |
| R3 independent review | one defect confirmed and fixed | Plan agent, claude-sonnet-5-5 high | none (read only) |

Each launch set model and effort explicitly through the launcher, which acknowledged the request; that does not independently attest the execution model. All workers were leaves in separate worktrees with disjoint owned paths. The coordinator read each diff and the migration before integrating.

Behavior added:

- `hs_purge_expired` (migration 202610120002), service role only, dry run by default. Removes or scrubs expired source content, history, staged payloads and nonces older than one hour; skips every listing someone favorited or put a non-empty note on; resets cursors only for lapsed sources. Closes any still-staging run it removes a staged row from as failed, so a later publish or stage raises instead of publishing a partial batch (found in review, fixed in 374085e).
- Notes: the details card lists every member's note and lets the signed-in member edit only their own. Stale saves keep the draft and offer two explicit recoveries. Loads and saves are dropped after sign-out, identity or household change, listing change and unmount. Demo notes live in memory.

Fresh integrated evidence on 374085e: `npm test` 13 files, 245 tests passed (72 in the PostgreSQL file, including the purge and its mutation-checked regressions). `npm run test:browser` 14 passed. `npm run check`, `typecheck`, `test:typecheck`, `house-scanner:typecheck`, `build`, the fixture CLI, the offline Deno handler check and `git diff --check` passed. The worker's roughly 60 deliberate breakages of the purge, applied one at a time, each failed the suite except removing the household row lock, which PGlite cannot exercise, and one equivalent mutant.

Not proven locally: purge versus publish concurrency and lock order, hosted grants and PostgREST exposure, behavior above the documented row ceilings, and the real shape of a PostgREST 40001 error (the note conflict mapping assumes supabase-js exposes `code`). Nothing schedules or calls the purge yet.

Open follow-ups:

1. A private job or operator procedure to loop `hs_purge_expired` until `more` is false, after a private export. Run it when no ingest is in flight.
2. A note that saved but whose reload failed reports "could not save"; a retry resolves through the conflict path.
3. Export copies need a rights decision before activation, and a real source's terms must be checked for retention of saved listings after permission lapses.
4. Private administration, source rights and the collector, digests and hosted acceptance gates are unchanged from the handoff.

## Saved listings kept, with a stale notice (13 October 2026)

The user decided that listings someone favorited or put a non-empty note on stay with their content, and that cleanup of them is manual. This replaces the tombstone design recorded earlier in this file. Work ran in worktrees created from codex/house-scanner and was integrated here; `main` at d6dbbb3 was merged first as fa5d96f.

| Task | State | Owner/model | Integrated commit |
| --- | --- | --- | --- |
| K1 snapshot and purge exemption | accepted | worker, claude-sonnet-5-5 high | 842dc47 and 3001684 from 9e953a6 and b1ecc1e |
| K2 stale notice and demo listing | accepted | worker, claude-sonnet-5-5 medium | 7d43ad1 (fast-forward) |
| R4 independent review | no confirmed defect; limits recorded | Plan agent, claude-sonnet-5-5 high | none (read only) |

Behavior: `hs_snapshot` returns an interacted source listing with its real title and policy-allowed facts even past retention, with a lapsed policy or an uncovered origin; the blank placeholder branch is gone. Time-bound items (coordinates, evidence, previous price) still age out at read time, and the photo shows only while the policy is current. `hs.purge_expired` never deletes, scrubs or rewrites an interacted listing or its history. A favorite or a note with non-blank text pins a listing; an emptied note does not. When the last favorite and note go, the next purge deletes the listing, which is the manual removal path. The card shows "Not in latest scan" and a notice when a source listing was last observed more than 24 hours before the latest edition. No contract change.

Fresh integrated evidence on 3001684: `npm test` 14 files, 260 tests passed (78 in the PostgreSQL file); `npm run test:browser` 16 passed; `check`, `typecheck`, `test:typecheck`, `house-scanner:typecheck`, `build`, the fixture CLI, the offline Deno handler check and `git diff --check` passed. The worker broke each exemption, the blank-note rule and the photo gate on purpose, one at a time, and each broke the suite. Untested: the 5,000-favorite ceiling, lock behavior under concurrency, and a real PostgREST error shape.

Limits and follow-ups:

1. More than 500 visible homes makes the snapshot raise; saved listings no longer age out. Paginate before a household approaches it.
2. A deactivated member's favorite keeps a listing until the operator clears it with `hs.admin_set_member(..., p_clear_favorites => true)`.
3. The favorite and note writes now take the household lock; verify contention on a hosted project.
4. A database check now guards `retentionDays` (integer 1 to 180) and the origin and field arrays. Policies written through `hs.admin_set_source_policy` are checked against the full policy shape, including timestamps and booleans.
5. Stale detection is inferred from the daily edition, not link checking.
6. A real source's terms must be checked for keeping saved listings after its permission lapses.
## Boneo source adapter (13 October 2026)

The owner decided to read public listing pages for personal use (see decisions.md, "House Scanner reads public listing pages for personal use"). One adapter was built and integrated as 581a4f6 from 7564dc1 by a claude-sonnet-5-5 medium worker in an isolated worktree off codex/house-scanner.

What exists: a parser for Boneo's embedded search-page JSON, a page reader with a more-pages signal, a guarded live fetcher and a CLI path that needs `--live --source=boneo --confirm-personal-read`. The live path only prepares begin, stage and publish requests in memory and prints counts. Nothing is sent, because no ingest endpoint exists yet. The registry entry stays `pending`, with photos off, retention 14 days and nine coverage gaps listed.

Guardrails enforced and tested in code: robots check on the exact path, honest user agent, no cookies, two second minimum gap, five pages per partition, thirty requests per run, stop without retry on 403, 429, any non-200 or an unexpected page, a page without embedded data counted as failed coverage and never as empty, and logs limited to counts, statuses and partition names. Each guard was removed in turn and broke a test.

Live shape confirmed with three requests (robots.txt and two search pages, nothing saved): data sits at `props.pageProps.listData.{pData,facetList,count}`; `count` is the total result count and `?page=N` is honored; price is a number and currency is "SEK" where set; coordinates are lon and lat; the default view returned only "Till salu" items and hides upcoming ones.

Unproven, and recorded as coverage gaps: page size and ordering across several pages, how upcoming listings are queried, whether listings without a price appear by default, the municipality-level path, the house path segment (only apartments are supported), coordinate precision, status labels other than "Till salu", and whether `created_date` is a stable episode id across relistings.

Fresh evidence on 581a4f6: `npm test` 16 files, 329 tests passed (56 in tools/house-scanner, 40 new); `npm run test:browser` 16 passed; `check`, `typecheck`, `test:typecheck`, `house-scanner:typecheck`, `build`, the fixture CLI and `git diff --check` passed. The live CLI path was not run end to end.

Next for sources: run the live reader once by hand to inspect real coverage, resolve the unproven items, then add Bjurfors if wanted. Delivery needs the hosted project, the ingest function and an issued credential.
## Operator runbook: household administration (13 October 2026)

Implemented in migration 202610120003 by a claude-sonnet-5-5 high worker and integrated as 5b8663a. All functions live in schema `hs`, are plain invoker functions granted to nobody, and are run by the project owner in the Supabase SQL editor as `postgres`. Every success appends one row to `hs.admin_log`; a failed call appends none. Values below are placeholders.

Order for a new project: apply migrations 0001, 0002 and 0003, create each person as an auth user in the dashboard, then bootstrap.

```sql
-- 1. First household, owner and profile (criteria are an argument with no default; keep real criteria out of the repo)
select hs.admin_bootstrap_household('Household name', '<auth user uuid>', 'Owner name', 'Profile name', '<criteria jsonb>'::jsonb);

-- 2. Add or update a member; deactivate and keep their rows
select hs.admin_set_member('<household>', '<user>', 'Member name', 'member', true);
select hs.admin_set_member('<household>', '<user>', 'Member name', 'member', false);

-- 3. Clear a departed member's saves or notes only when you decide to (member must be inactive)
select hs.admin_set_member('<household>', '<user>', 'Member name', 'member', false, true, false);

-- 4. Source policy (full policy json with a revision above the stored one; status stays pending until you approve it)
select hs.admin_set_source_policy('<household>', '<policy jsonb>'::jsonb);

-- 5. Scanner credential, at most 90 days; key ids are never reused
select hs.admin_issue_credential('<household>', 'key-id-1', array['boneo'], now() + interval '60 days');
select hs.admin_revoke_credential('key-id-1');
```

Outside SQL: create auth users in the dashboard first (the functions only look them up); generate an HMAC secret of at least 32 characters and add it to the ingest function environment under `HS_INGEST_KEYS_JSON` keyed by the key id, together with `SUPABASE_URL` and the service role key; rotate by issuing a new key id, switching the collector, then revoking the old one. Never run a raw `update hs.members set active=false`; use the function so the owner and member-cap rules hold.

Independent review of 5b8663a confirmed two defects, fixed in f7a4986 and the contract change below: `hs.valid_policy` accepted origins (for example `https://a.b.c.4`) that made the ingest function throw after the nonce was consumed, and the note, favorite, manual-add and profile writers checked membership before taking the household lock, so a waiting request could land after the operator deactivated that member. Writers now re-check membership after the lock, the validator rejects punycode and numeric-looking hosts, the ingest function guards the policy parse and returns 403, and the URL refinements in `contracts.ts` fail validation instead of throwing. The 90-day credential cap uses 2160 hours so a DST change cannot exceed it, and a credential source list must be one-dimensional.

Evidence on the final branch: `npm test` 18 files, 562 tests passed (including 219 in supabase/tests/house-scanner-admin.test.ts and the new contracts tests); the new regression tests were watched failing against the unfixed code; `check`, `typecheck`, `test:typecheck`, `house-scanner:typecheck`, `build` and `git diff --check` passed. About 60 deliberate breakages of the migration were applied one at a time and each failed the suite, except removing the household lock in `admin_issue_credential`, which PGlite cannot distinguish. Not proven locally: behavior as the real non-superuser `postgres` role, hosted privilege defaults and PostgREST exposure, and lock contention.
## Hosted acceptance script (13 October 2026)

`tools/house-scanner/acceptance/` holds a script the owner runs on their own machine against a real Supabase project. It was built by a claude-sonnet-5-5 medium worker (ea261f8, integrated here) and exists because local tests used hand-made roles and a mocked client. It reads keys and two or three fictional test users from environment variables, never prints them, and refuses to run without `--confirm-hosted`, against a non-supabase host, or with a secret key (only a publishable key is accepted).

Steps once the project exists: apply migrations 0001, 0002 and 0003 in the SQL editor; create the test users in the dashboard with passwords (test accounts only); print the seed SQL with `npm run house-scanner:accept -- --print-seed-sql`, replace the user UUID placeholders and run it as postgres; set the `HS_ACCEPT_*` variables listed in the folder README; then run `npm run house-scanner:accept -- --confirm-hosted --out report.json`. The exit code is 0 only when no check fails, 2 for a refusal.

Checks: anon is blocked from every `hs_*` function and the `hs` schema is not exposed; a household member sees only their household; user B is denied household A's snapshot, notes, favorites and note writes; favorite and note round trip with the real stale-revision error recorded (and passed only when the code is 40001, which the app assumes); two simultaneous saves of one note yield one winner; signed-in users cannot run the purge or any admin function; an optional check that a deactivated member is denied. The report holds labels, statuses, codes and timings only, and is safe to share.

It cannot prove the app's access-code sign-in screen, the ingest function once deployed, or free-tier limits. Cleanup leaves one manual bookmark per household and an emptied note, because the API has no delete.

Fresh evidence: `npm test` 19 files, 589 tests passed (27 new); `check`, `typecheck`, `test:typecheck`, `house-scanner:typecheck`, `house-scanner:accept:typecheck`, `build` and `git diff --check` passed. The script was run only in its refusal and seed-SQL modes, with no network contact.
## First live Boneo read (13 October 2026)

One guarded run of `node .house-scanner-build/collector.mjs --live --source=boneo --confirm-personal-read` against the Göteborg apartment partition, with the owner's go-ahead. Five requests (robots.txt and four result pages), nothing sent or saved, output was counts only.

Confirmed: the municipality-level path works (`/sv/till_salu/lägenhet/västra götalands/göteborg`); `robots.txt` allowed it; each page holds 25 results; `?page=N` pagination works across at least four pages; no item was skipped as unparseable; the source reports 621 total results for the partition.

Findings that change the plan:

1. The run stopped at the collector's 100 observation ceiling, so it read 100 of 621 (16 percent) and correctly reported `truncated` and `partial`. A useful run needs the ceiling raised, or the query narrowed.
2. 621 apartments is above the snapshot ceiling of 500 listings per household, which makes `hs_snapshot` raise. Delivering the whole municipality is therefore not viable as is. The collector should apply coarse filters from the union of enabled profiles (area, rooms, price cap) and keep unknowns before delivery, or the snapshot needs pagination.
3. Upcoming listings and houses are still unproven. Only apartments in Göteborg are mapped.
## Access codes replace email sign-in (16 October 2026)

The owner chose one access code per person over email one-time codes, because there is no email sender to set up. The sign-in form has two fields: an email or username, and the access code. A username without an `@` signs in as `<username>@house-scanner.bobbyinscoe.com`. The code is the password the owner set for that user and can be any 6 to 72 characters, digits included (use 8 or more).

To add a person: in the Supabase dashboard, Authentication, Users, Add user, tick auto confirm, enter their email (or `<username>@house-scanner.bobbyinscoe.com` for a username login) and the code as the password; then add them to the household with `hs.admin_set_member`. To rotate a code, set that user's password with the SQL update used for the first member (the dashboard only offers an emailed recovery link). To remove access, deactivate the member with `hs.admin_set_member` or delete the user. Supabase rate-limits sign-in attempts, which is the only brute-force defense.

The same user id is used on every device, so favorites and notes stay with the person. Not verified: Supabase's real sign-in rate limits, which the hosted acceptance run and first sign-in will show.
## First real delivery (16 October 2026)

The owner provisioned a Supabase project, applied migrations 0001 to 0003, created the first member and household with the operator functions, approved Boneo for 90 days (`--print-policy-sql`), issued credential `boneo-1` (60 days, expires 15 December 2026), deployed the ingest function and sent one run. Begin, stage and publish all returned 200. The signed-in app then showed an edition of 72 homes from Göteborg, kept from 609 read by the owner's profile bounds (520 too small, 14 over the price cap, 3 too few rooms). Coverage is reported as partial.

Two lessons. A 401 on every signed request was a computer clock about 345 seconds ahead, because the function rejects timestamps more than 300 seconds from its own clock; that check logs nothing, and the function now logs a reason code for its other refusals. Sync the clock before diagnosing anything else.

What the first data shows: every home is under Needs details, because Boneo's search page supplies no floor, lift, balcony or construction year, and none has a map position beyond an approximate area. The next gains are reading those facts from detail pages, then a scheduled daily run, then a second source. The Boneo credential and policy expire before 15 December 2026 and 14 January 2027, so renew them.