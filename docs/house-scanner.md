# House Scanner implementation

This guide is public-safe. The canonical private product plan remains outside this repository. Do not add household preferences, identities, reference properties, real listing snapshots or credentials here.

## Goal and acceptance

Build a private shared shortlist at /projects/house-scanner. This implementation starts with isolated synthetic data and disabled live effects. The public shell can expose the synthetic demo explicitly; private access requires an authenticated active household member.

Foundation acceptance requires route/build checks, a fresh independent auth/ingest review, and authorized behavioral checks for household isolation, actor ownership, replay and atomic publication. Static checks alone do not satisfy that gate. The user authorized local behavior and privacy checks on 12 October 2026. Live accounts, messages, collection and deployment remain outside this authorization.

## Contracts and ownership

Contract version 1 lives in src/features/house-scanner/types/contracts.ts. Zod validates untrusted inputs. Profiles carry revisions; the database owns live criteria. Demo criteria are fictional and must never seed a live household. Null means unknown and conflicts remain explicit. Hard exclusions use confirmed facts only. Buyer notes, source observations and optional model interpretations have distinct ownership.

The coordinator owns contracts, migrations allocation, package files, route/registry wiring and workflows. Features own UI, hooks, network modules and scoped styles. Tools and Supabase code are not imported into the browser. Keep one root MantineProvider; feature portals stay inside the feature scope.

Shared favorites are one row per household/listing/authenticated actor. Removing one row cannot remove another member's save. Manual links are bookmarks, never an instruction to fetch a URL. Collection never writes favorites, notes, membership or notification preferences.

## Security and publication design

Use Supabase Auth with invitation-only email OTP, disabled public signup, custom free SMTP and current-membership RLS. Remember off uses sessionStorage; remember on uses namespaced SDK token storage. Never persist a private listing snapshot. Clear private state on session change and sign-out.

The ingestion endpoint accepts bounded signed requests. A revocable credential binds one household, ingest scope and approved source IDs. Signature covers method, canonical /functions/v1/house-scanner-ingest path, timestamp, nonce and SHA-256 body digest. The function accepts the gateway-forwarded path but always signs the public canonical path. Nonces are atomically consumed after authentication. The server owns keys; the collector never receives a database service key. Request bodies cannot name actors or household IDs.

Stage observations per run and publish in one database transaction. Failed sources retain prior facts. A failed or empty-placeholder fetch is not successful empty coverage. Persist source cursors only on publication. Replayed batches must have identical content. Comparable asking prices belong to one source and listing episode; unknown prices are not zero. Source IDs are conservative identity links; cross-source merges require stronger evidence and remain deferred.

Alternative: static JSON is useful for fixtures but cannot authorize private access or merge concurrent edits. A local-only backend would make shared state depend on a personal computer. The selected hosted schema isolates that dependency from the public site.

Rollback before activation: revert feature route/registry exposure or local commits. After activation: disable jobs, revoke compromised credentials/membership, preserve user-authored records and the last good edition, export privately before any destructive migration. No down migration deletes household data.

## Source and account prerequisites

No live source is approved. Reachable pages do not establish collection, display, retention, image, notification or model rights. All real source policies start disabled or pending. A bounded permitted proof must establish identity, field semantics, coverage, unknown prices, upcoming listings, pagination and an update route before an adapter can activate.

Before live use: provision an approved free Supabase project, apply and verify migrations, bootstrap the initial owner privately, disable signup, configure six-digit ten-minute OTP and eligible free SMTP, restrict return URLs, verify storage behavior and same-origin scripts, establish source permissions, confirm free account allowances and no overages. No accounts, remote schedules, emails, broker contacts or deployments are created by local implementation.

Map tiles are independent of listing facts and household state. Use a permitted configurable provider with attribution; preserve the list if WebGL or tiles fail. Approximate/unknown positions never become exact pins. Do not batch-geocode arbitrary links.

Optional inference, digests and live scheduling remain disabled. Model failure must not affect collection or matching. A future daily workflow needs reviewed free capacity and source access before activation.

## Work record

Base website commit: cf079861fae0fccd0a8386b737eb30e2292bdcf8 (latest main fetched on 12 October 2026). It contains the textile workshop branch through ab15dbad33e060aaf0c59f1bfc8e7f3b883a9c60.
Private planning reference: 8dc5455, specification v2.6 / agent guide v1.1.
Integration worktree: C:\Users\bhobb\.codex\worktrees\house-scanner\bobbyinscoe.
Original checkout changes are outside this work.

| Task | Dependencies | State | Owner |
| --- | --- | --- | --- |
| F0 contracts, route and source gates | Approved plan | accepted for local consumers; runtime gate pending | Coordinator, gpt-6.1-sol high |
| F0 independent security review | Fixed foundation diff | findings corrected; design reviewed | /root/foundation_review, gpt-6.1-sol high |
| P1 UI and map | ffbc326 | integrated as 346403b; runtime review pending | /root/project_ui, gpt-6.1-sol medium |
| P1 fixture collector | ffbc326; synthetic only | integrated as 17d3567; runtime review pending | /root/fixture_collector, gpt-6.1-sol medium |
| P1 schema/session/ingest | ffbc326; reviewed design | integrated as 4a655a5, 8ca9cf1 and 1dcd2a2; runtime gate pending | /root/private_backend, gpt-6.1-sol high |
| P1 backend security review | Final backend diff | fixed diff reviewed; no remaining source-review blockers; runtime gate pending | /root/backend_review, gpt-6.1-sol high |

Workers are leaves and use separate managed worktrees at the accepted foundation commit. Record requested model/effort and actual launcher acknowledgment; the launcher does not independently attest the execution model. No worker owns shared files without reassignment.

Worker worktrees are house-scanner-ui, house-scanner-tools and house-scanner-backend under the same managed worktree directory, each based on 757cdff6e2faa39bb8c35da98119b5f4c68668f4. All three explicit model/effort requests were acknowledged by the launcher. No nested workers were launched.

Foundation evidence: npm run check, npm run typecheck and npm run build passed after the contract review corrections. No behavior tests ran. npm audit reported GHSA-68fv-2mgg-jv7q in source-map-js 1.2.1, a development dependency already present in the base lockfile. No broad audit fix was applied.

## Local implementation and remaining work

The public route defaults to the configured private-access state and offers an explicit synthetic demo. The same workspace renders suggestions, an attributed union of favorites, manual bookmarks and existing editable owner profiles. Profile saves use revision checks. Polling refreshes private data without deliberately resetting a same-user workspace. Identity changes remount the workspace and clear its private UI state.

The map loads after Open map, uses the same filtered listings as the list and groups homes sharing an exact coordinate. Approximate and unknown coordinates remain list only. Zoom-based clustering, richer photo overlays and licensed geography/transit enrichment remain future work. No nature or journey estimates are inferred from map coloring.

The collector has one synthetic fixture executor, bounded requests and explicit replay inputs. It prepares begin/stage/publish requests in memory. No sender, real adapter, daily workflow or digest is active. The schema and signed endpoint are local source, not a provisioned service.

Backend notes are actor-owned and revisioned, but their display and editing are not connected to the workspace. The manual form can store an initial note. Manual edit/removal and internationalized manual hostnames are deferred; server bookmark validation currently accepts a conservative ASCII DNS/IP subset. Membership administration, initial profile creation, notifications and source-policy management require a later private administration flow. No live household is seeded with demo criteria.

Before activation, add and verify retention cleanup for source records, run staging, nonces and history while preserving user-authored bookmarks and notes. Read-time redaction limits returned source facts; it does not purge stored data. Review snapshot limits and pagination before exceeding 500 homes, ten member records, twenty profiles or 5,000 attributed saves. Historical member attribution counts toward these bounds.

Verification must cover two-household access denial, revoked membership, actor-owned saves/notes, profile conflicts, sign-out and user-switch races, storage denial, signature/replay rejection, duplicate and contradictory batches, failed-source preservation, empty-fetch rejection, atomic publication, source-rights expiry and price-history retention. Also inspect narrow/wide layouts, keyboard controls, map failure and visual isolation from the portfolio. None of these runtime claims is established by the static builds.

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
