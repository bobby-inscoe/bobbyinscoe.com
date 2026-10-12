# House Scanner implementation

This guide is public-safe. The canonical private product plan remains outside this repository. Do not add household preferences, identities, reference properties, real listing snapshots or credentials here.

## Goal and acceptance

Build a private shared shortlist at /projects/house-scanner. This implementation starts with isolated synthetic data and disabled live effects. The public shell can expose the synthetic demo explicitly; private access requires an authenticated active household member.

Foundation acceptance requires route/build checks, a fresh independent auth/ingest review, and authorized behavioral checks for household isolation, actor ownership, replay and atomic publication. Static checks alone do not satisfy that gate. Testing beyond source feasibility has not been authorized in this session.

## Contracts and ownership

Contract version 1 lives in src/features/projects/features/house-scanner/types/contracts.ts. Zod validates untrusted inputs. Profiles carry revisions; the database owns live criteria. Demo criteria are fictional and must never seed a live household. Null means unknown and conflicts remain explicit. Hard exclusions use confirmed facts only. Buyer notes, source observations and optional model interpretations have distinct ownership.

The coordinator owns contracts, migrations allocation, package files, route/registry wiring and workflows. Features own UI, hooks, network modules and scoped styles. Tools and Supabase code are not imported into the browser. Keep one root MantineProvider; feature portals stay inside the feature scope.

Shared favorites are one row per household/listing/authenticated actor. Removing one row cannot remove another member's save. Manual links are bookmarks, never an instruction to fetch a URL. Collection never writes favorites, notes, membership or notification preferences.

## Security and publication design

Use Supabase Auth with invitation-only email OTP, disabled public signup, custom free SMTP and current-membership RLS. Remember off uses sessionStorage; remember on uses namespaced SDK token storage. Never persist a private listing snapshot. Clear private state on session change and sign-out.

The ingestion endpoint accepts bounded signed requests. A revocable credential binds one household, ingest scope and approved source IDs. Signature covers method, endpoint path, timestamp, nonce and SHA-256 body digest. Nonces are atomically consumed after authentication. The server owns keys; the collector never receives a database service key. Request bodies cannot name actors or household IDs.

Stage observations per run and publish in one database transaction. Failed sources retain prior facts. A failed or empty-placeholder fetch is not successful empty coverage. Persist source cursors only on publication. Replayed batches must have identical content. Comparable asking prices belong to one source and listing episode; unknown prices are not zero. Source IDs are conservative identity links; cross-source merges require stronger evidence and remain deferred.

Alternative: static JSON is useful for fixtures but cannot authorize private access or merge concurrent edits. A local-only backend would make shared state depend on a personal computer. The selected hosted schema isolates that dependency from the public site.

Rollback before activation: revert feature route/registry exposure or local commits. After activation: disable jobs, revoke compromised credentials/membership, preserve user-authored records and the last good edition, export privately before any destructive migration. No down migration deletes household data.

## Source and account prerequisites

No live source is approved. Reachable pages do not establish collection, display, retention, image, notification or model rights. All real source policies start disabled or pending. A bounded permitted proof must establish identity, field semantics, coverage, unknown prices, upcoming listings, pagination and an update route before an adapter can activate.

Before live use: provision an approved free Supabase project, apply and verify migrations, bootstrap the initial owner privately, disable signup, configure six-digit ten-minute OTP and eligible free SMTP, restrict return URLs, verify storage behavior and same-origin scripts, establish source permissions, confirm free account allowances and no overages. No accounts, remote schedules, emails, broker contacts or deployments are created by local implementation.

Map tiles are independent of listing facts and household state. Use a permitted configurable provider with attribution; preserve the list if WebGL or tiles fail. Approximate/unknown positions never become exact pins. Do not batch-geocode arbitrary links.

Optional inference, digests and live scheduling remain disabled. Model failure must not affect collection or matching. A future daily workflow needs reviewed free capacity and source access before activation.

## Work record

Base website commit: 5349e2d033e5ab965c70f08450e720af46928722.
Private planning reference: 8dc5455, specification v2.6 / agent guide v1.1.
Integration worktree: C:\Users\bhobb\.codex\worktrees\house-scanner\bobbyinscoe.
Original checkout changes are outside this work.

| Task | Dependencies | State | Owner |
| --- | --- | --- | --- |
| F0 contracts, route, schema and gates | Approved plan | running | Coordinator, gpt-6.1-sol high |
| F0 independent security review | Fixed foundation diff | pending | Fresh gpt-6.1-sol high |
| P1 UI and map | Reviewed contracts | pending | gpt-6.1-sol medium |
| P1 fixture collector | Reviewed contracts; synthetic only | pending | gpt-6.1-sol medium |
| P1 session/ingest endpoints | Reviewed security design | pending | gpt-6.1-sol high |

Workers are leaves and use separate managed worktrees at the accepted foundation commit. Record requested model/effort and actual launcher acknowledgment; the launcher does not independently attest the execution model. No worker owns shared files without reassignment.

