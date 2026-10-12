# Handoff: House Scanner

12 October 2026 · branch `codex/house-scanner` · application commit `a1d3a7d8ab50572b099040cc74b607404b1e9965`

This is a dated resume snapshot, to be read with the canonical specifications and repository instructions below. It records where implementation stopped; it does not replace the product requirements or authorize live activation. Keep household preferences, identities, reference properties, real listings and credentials out of this public repository.

## Resume here

Use `C:\Users\bhobb\.codex\worktrees\house-scanner\bobbyinscoe`, not the original checkout. The integration branch was clean at the application commit above. This handoff and its documentation pointer are the only subsequent changes in this turn.

The last implementation step completed local behavior/privacy verification and fixed the failures it exposed. No known failing local test remains. The complete product is unfinished. The next local implementation slice should address retention cleanup and the missing shared-note UI; source/account prerequisites remain separate gates.

When asked to resume:

1. Read the instructions and plans below, then inspect the current branch/status and any changes since this snapshot.
2. Verify `main` ancestry and preserve user work. Fetch current `main` before further integration when authorized; the latest fetch in this session was `cf079861fae0fccd0a8386b737eb30e2292bdcf8`.
3. Read the migration's source-redaction/publication paths and the existing database tests. Write a bounded retention design covering source payloads, nested timestamps, staging, history, nonce and replay metadata, and preservation of user-authored bookmarks, notes and favorites. Do not equate read-time redaction with purge or delete real data while developing it.
4. Implement/test that local slice under the existing authorization and workflow, or work on shared-note UI independently if ownership is separated. Reconcile any retention or contract question before changing consumers.
5. Update the authoritative task/work record in `docs/house-scanner.md`. Use fresh verification after changes; the results below are historical evidence, not a permanent pass.

This sequence is a recommended continuation, not a claim that the private plan has changed. Check the canonical plan for acceptance details before selecting the next slice.

## Read with these documents

Repository root for the following relative links: `C:\Users\bhobb\.codex\worktrees\house-scanner\bobbyinscoe`.

| Document | Use |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Required instruction routing, Git attribution and prose rules. |
| [Workflow](../instructions/workflow.md), [engineering](../instructions/engineering.md), [unslop](../skills/unslop/SKILL.md) | Always load before changes. Current commands, architecture, verification and authorization rules. |
| [House Scanner implementation record](house-scanner.md) | Accepted contracts, authoritative task table, integration history, evidence and remaining work. Read the latest local-check section before treating older pending statements as current. |
| [House Scanner agent routing](house-scanner-agents.md) | Public-safe delegation controls; use with the canonical guide. |
| [Architecture](architecture.md), [decisions](decisions.md), [textile workshop](textile-workshop.md) | Current website structure and decisions, especially the corrected `main` base. |
| [Plan](../skills/plan/plan.md), [diagnose](../skills/diagnose/diagnose.md), [review](../skills/review/review.md), [handoff](../skills/handoff/handoff.md) | Load for the work being performed. |

Canonical private planning repository: `C:\Users\bhobb\Documents\Code\house-scanner`, inspected at commit `8dc5455`.

| Private file | Use |
| --- | --- |
| `MASTER_SPEC.md`, version 2.6 | Product behavior and actual household requirements. Read privately; do not copy its preferences into public fixtures/docs. |
| `IMPLEMENTATION_PLAN.md`, version 2.6 | Sequence, alternatives, acceptance and deployment gates. |
| `AGENT_IMPLEMENTATION.md`, version 1.1 | Required model/effort selection, task packets, isolation and review controls. Read before delegation. |
| `SOURCE_FEASIBILITY.md` | Technical access versus permitted reuse, probes and unresolved source/account feasibility. Read before source work. |
| `LOCATION_RESEARCH.md` | Geography/nature workstream when needed. |
| `INFERENCE_DECISION.md` | Optional enrichment boundary when needed; no model is required by the core. |

These private versions were written before implementation approval and against the earlier redesign checkout. Their documentation-only wording describes that earlier phase. Later user authorization allowed implementation, necessary packages, local commits and local testing. Their `ProjectFrame`, project-registry, nested feature-path, old token and dependency assumptions are superseded by the user's explicit `main` correction and the actual accepted integration. Preserve their product requirements; do not reconstruct the removed redesign architecture. Duck Feed currently lives at `/duck-feed`; House Scanner retains `/projects/house-scanner`.

## User direction and authorization carried forward

The user explicitly corrected the base: pull latest `main`, include the merged `codex/textile-workshop-experiment` work, and do not start from `redesign`. That correction is implemented.

The latest implementation instruction was: “alright, looks better. run local behavior and privacy checks now and continue”. Local behavioral tests are authorized; the earlier guide's test restriction is no longer a reason to stop and ask again. Prior implementation approval also covered necessary packages, local commits and delegated work. This turn requests a handoff only.

No push, deployment, live account creation, messages, broker contact, paid usage or live collector activation occurred or is authorized by this handoff. A future activation needs concrete review and the applicable user authorization. Do not treat a reachable source page as collection, retention, photo or redistribution permission.

## Branch and user-work protection

- Integration: `codex/house-scanner` at application tip `a1d3a7d`; continue its managed worktree above.
- Accepted `main` base: `cf079861fae0fccd0a8386b737eb30e2292bdcf8`.
- Textile tip: `ab15dbad33e060aaf0c59f1bfc8e7f3b883a9c60`. Both it and fetched `main` were rechecked as ancestors of the integration branch in this handoff turn.
- Recovery branch: `codex/house-scanner-before-main-rebase` preserves the initial implementation before replaying only House Scanner commits onto `main`. It is a recovery reference, not the starting branch.
- Original checkout: `E:\Code Projects\bobbyinscoe`, still on `redesign` at `5349e2d`. It has a pre-existing edit to `src/features/home/components/home-page.tsx` and untracked `.claude/`. Do not reset, stash, overwrite, commit or carry these into the feature.
- Original homepage SHA-256, rechecked this turn: `962BACE0EAB3498A07B3D0D090E5E5C5715F877616BF782B10A26E45CEC012BB`.
- UI, collector, backend, database-check and session-check worker worktrees are archived through managed tooling after integration. The integration worktree stays active. No worker has unfinished edits to collect.

Recent integration commits:

| Commit | Purpose |
| --- | --- |
| `ef9f3a1` | Adapt feature to `main`'s textile workshop and preserve its styling. |
| `dd0821d` | Configure authorized local behavior/privacy verification. |
| `7d5ea4b` | UI/collector/signature tests; photo expiry, map worker and CLI count fixes. |
| `1ba8154` | Actual PostgreSQL tests and evidence-variable collision fix, from worker `e56597e`. |
| `8f5cf48` | Session/API privacy tests and stale-operation guards, from worker `11c5713`. |
| `a1d3a7d` | Defensive sign-out-error recovery and integrated verification record. |

## Done and locally verified

- Main's Mantine provider, moss/flax palette, Libron headings, workshop and Duck Feed remain intact. House Scanner is a top-level feature with a workshop folio entry and its retained URL.
- Public route defaults to private access being unconfigured. The explicit synthetic demo uses fictional people/homes and in-memory edits; leaving it resets state.
- Suggestions, confirmed exclusions versus unknown/conflicting facts, attributed favorites, Everyone/Mine/person filters, manual URL bookmarks, duplicate detection and revisioned owner criteria work in local checks. Manual add does not fetch the submitted page.
- Opt-in map uses the filtered list, leaves unknown/approximate positions list-only and groups overlapping precise points. Details selection works on desktop/narrow layouts; failed tiles preserve list controls. Local production worker loading was checked too.
- Browser API validates untrusted responses and household references. Tokens use feature-owned storage keys, remembered access chooses local/session storage, unrelated keys remain intact, and private snapshots are not persisted. Logout/auth failures clear private state; generation guards reject stale reads and mutation completions.
- Actual migration executes in PostgreSQL WASM with synthetic roles/households: private grants, current membership/revocation, actor-owned saves/notes, owner profile revisions, credential scope/expiry, nonce replay, exact run/batch replay, atomic publication rollback, failed-source preservation, empty-result rejection, price histories and rights-expiry bookmark preservation.
- Signed handler uses real WebCrypto verification in tests, with external database RPC mocked. It rejects raw-body/path/nonce tampering, bad timestamps, replay responses, caller identity fields, invalid source scope and oversized bodies with generic errors.
- Fixture collector prepares bounded requests in memory, preserves unknown prices and episode boundaries, refuses real-source/live execution, and logs counts rather than listing payloads.

Last integrated implementation verification on 12 October 2026:

| Check | Result and boundary |
| --- | --- |
| `npm test` | 155 tests, nine files, passed: 30 PostgreSQL, 68 session/API, 17 signed handler, plus matching/source/photo/collector. |
| `npm run test:browser` | Twelve desktop/narrow flows passed in installed Edge, fresh contexts and external requests blocked. |
| Production preview overlap tests | Two passed using a locally fulfilled blank style. |
| `npm run check` | Passed, 93 files. |
| App, verification and collector typechecks | Passed. |
| Frontend build and fixture CLI | Passed; CLI reported three observations and three requests. |
| Offline Deno handler check | Passed. |
| Independent fixed-diff review | No confirmed privacy blocker. Reviewer independently reran 67 session/API and 48 photo/SQL/handler checks before the final defensive recovery case. |

This handoff turn changes documentation only. It rechecked branch/worktree state, ancestry, original-file hash, tool availability and local preview HTTP status; it does not relabel prior product tests as fresh runs from this turn.

## Implemented, still unverified outside local substitutes

PGlite has one connection. Its SQL/role/rollback results do not prove competing nonce, publication or profile-edit transactions. Hosted Supabase Auth, PostgREST, gateway configuration and free-tier behavior have not been exercised. Auth/RPC are mocked in session tests, so real OTP/SMTP, actual SDK cross-tab synchronization and remembered-session recovery remain gates.

No real source, image provider, geocoder or map tile transport was contacted during these checks. The successful map test serves a blank local style, proving worker/marker/selection behavior rather than basemap quality or provider coverage. No live backend is provisioned or migration deployed.

## Remaining implementation and activation work

1. Retention cleanup: read-time redaction exists; storage purge does not. Cover source records and nested evidence/photo/coordinate/previous-price provenance, history, staged payloads, expired runs and nonces. Preserve user-authored bookmarks/notes/favorites and sufficient bounded replay protection. Test idempotence, rollback and rights changes locally before any live use.
2. Shared notes: `listingNotes` and `saveNote` plus `hs_notes` and `hs_save_note` already exist and have actor/revision tests. The workspace has no note display/editor. The manual form stores an initial backend note; demo notes use fictional buyer evidence. Connect through hooks/API, preserve author attribution, stale-edit recovery and identity/remount cancellation. Do not claim notes are already integrated or let a component call the network directly.
3. Private administration: initial live owner/profile bootstrap, household access management and source-policy/credential management need a private flow or reviewed operator procedure. Existing owner criteria editing only updates an existing profile. Never seed real preferences from the demo.
4. Source feasibility and collector: no real source is approved. Resolve reuse/update/photo rights and coverage, then build one permitted adapter and signed sender. Current tooling has only the synthetic executor and no delivery client. Full radius/geography coverage, unknown/upcoming inventory and pagination need evidence; municipality partitions alone do not prove it.
5. Remaining product work: licensed nature/transit evidence, itemized costs where available, richer map/photo presentation and zoom clustering, and optional new-match-only daily Email/Telegram digests. Digests, daily workflow and optional inference are not implemented/active. Follow canonical sequencing and keep collection independent of models.
6. Hosted acceptance/activation: permitted free Supabase/SMTP setup, invitation-only signup policy, OTP expiry/template and return URLs, two-household direct-API tests, competing transactions, real browser session/storage behavior, limits/outages/recovery, and a concrete free deployment/secret/job plan. Activate only after required authorization; then follow the canonical observation period.

Manual edit/removal and internationalized manual hostnames are deferred. Server URL validation intentionally accepts a conservative ASCII DNS/IP subset. Snapshot ceilings are 500 listings, ten member records including historical attribution, twenty profiles and 5,000 saves; exceeding them needs pagination/limit design. A successful empty-source publication is deliberately rejected until coverage proof exists.

## Decisions and dead ends to preserve

- The original wrong-branch integration was corrected with `rebase --onto origin/main` of House Scanner commits only. Do not merge redesign back in to recover ProjectFrame or old tokens.
- Static builds/review missed actual SQL and session timing failures. Keep the runtime regressions; do not substitute compiling for behavioral verification.
- PostgreSQL staging failed because declared PL/pgSQL variable `e` collided with SQL alias `e`. Renaming the loop variable to `evidence_item` fixed it without changing validation rules.
- Late mutations/refreshes could restore snapshots during logout. The hook now separates refresh generation from session generation and uses a sign-out latch. Removing these guards needs equivalent race evidence.
- Photo expiry used to depend on another render. It now schedules a bounded expiry check; preserve expiry behavior and no-referrer image loading.
- MapLibre 6's default worker URL followed Vite's rewritten module and returned 504. The feature explicitly imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and sets it. Excluding the dependency from optimization was not selected because it would leave production asset resolution implicit.
- The CLI once counted listing identities as observations. Its public output now counts the staged observations; unknown and equal-time contradictory histories have regression tests.
- The final sign-out-error regression covers a defensive SDK error without an auth event. The installed SDK normally emits SIGNED_OUT on ordinary network failure; do not overstate the test as a proven normal-network defect.
- Docker, psql and the Supabase CLI are unavailable here. PGlite is a local substitute, not equivalent hosted/concurrency evidence.
- Normal sandbox shell startup failed with `helper_unknown_error`; successful shell work used `require_escalated` through the available approval mechanism. Reassess the new session's permissions instead of assuming bypass is available. CUA and Node REPL kernels also failed to start; Playwright through the shell worked. Do not waste time repeatedly retrying the same kernel crash.
- Early tests had a wrong textbox selector for a combobox and an overly broad planning-profile fixture rejected by strict Zod. Those were test errors, not reasons to relax component semantics or input schemas.

## Code seams and commands

Feature root: `src/features/house-scanner/` in the integration worktree. Shared contract is version 1.

| Location | What to inspect |
| --- | --- |
| `types/contracts.ts` | Zod boundary schemas, profile revisions, provenance, nullable facts, request limits. |
| `api/household-client.ts`, `hooks/use-household-session.ts` | API/storage/auth boundaries, note APIs and guarded mutations. |
| `components/house-scanner-access.tsx`, `household-workspace.tsx`, `listing-card.tsx` | Access render props, household/user keying, notes gap, photo expiry. |
| `hooks/use-demo-household.ts`, `mock/synthetic-household.ts` | Isolated fictional demo; no live defaults. |
| `utils/match-listing.ts`, `source-policy.ts` | Confirmed exclusions, uncertainty and independent source-retention clocks. |
| `map/household-map.tsx` | Explicit worker asset, overlaps and fallback behavior. |
| `tools/house-scanner/` | Fixture-only collector, query envelope, disabled/pending real policies, CLI. |
| `supabase/migrations/202610120001_house_scanner.sql` | Private schema, grants, checked RPCs, atomic ingest and read-time redaction. |
| `supabase/functions/house-scanner-ingest/index.ts` | Bounded HMAC ingestion; canonical signed path `/functions/v1/house-scanner-ingest`. |
| `supabase/tests/house-scanner.test.ts` | Actual migration/role/transaction assertions. |
| Feature/collector/handler `.test.*` and feature `.browser.ts` files | Existing regression and behavior checks. |
| `vitest.config.ts`, `playwright.config.ts`, `tsconfig.verification.json` | Node/jsdom tests, Edge browser checks and expanded verification typecheck. |

Run from the integration root:

```powershell
npm test
npm run test:browser
npm run check
npm run typecheck
npm run test:typecheck
npm run house-scanner:typecheck
npm run build
npm run house-scanner:fixture
& 'C:\Users\bhobb\.deno\bin\deno.exe' check --no-remote --no-lock --node-modules-dir=manual --config supabase/functions/deno.json supabase/functions/house-scanner-ingest/index.ts
git diff --check
```

Node/npm and Deno were available at handoff. The local development preview returned HTTP 200 at `http://localhost:5183/projects/house-scanner`; start it again if needed with `npm run dev -- --port 5183 --strictPort`. Enter the synthetic demo explicitly. Playwright uses installed Edge and can start/reuse that local server. For production worker checks, run `npm run preview -- --port 4183 --strictPort` after building, then in another shell:

```powershell
$env:HOUSE_SCANNER_BROWSER_URL = 'http://localhost:4183'
npm run test:browser -- --grep 'locally served'
Remove-Item Env:HOUSE_SCANNER_BROWSER_URL
```

Browser screenshots/traces are ignored under `.browser-test-results/`; collector builds are ignored under `.house-scanner-build/`. They are disposable evidence, not source. Private frontend access stays off unless explicitly configured with `VITE_HOUSE_SCANNER_ENABLED`, `VITE_HOUSE_SCANNER_SUPABASE_URL` and a publishable `VITE_HOUSE_SCANNER_SUPABASE_PUBLISHABLE_KEY`. Server service/HMAC keys belong only in private server configuration. Do not print or commit their values.

Existing warnings: the lazy MapLibre chunk is about 1,051 kB minified/285 kB gzip, plus its separate worker asset. The development source-map-js advisory GHSA-68fv-2mgg-jv7q was already in the main baseline. Neither warning was suppressed or broadly auto-fixed.

## Delegation on continuation

Follow the canonical implementation guide's actual launcher controls. Use fresh contexts where model overrides require them, explicit model/effort, at most four total agents including the coordinator, leaf workers, isolated managed worktrees and non-overlapping owned paths. Coordinator owns contracts, package/config files, route wiring and integration. Current public routing assigns Sol high to auth/schema/integration/review, Sol medium to routine implementation, Luna high to fully specified low-risk leaves, and Astra high only to a narrow documented escalation after two focused failed attempts. Recheck the host catalog and use the guide's Claude mapping when applicable; never silently inherit a larger model or launch paid API orchestration.

All prior workers are complete and integrated. Their task IDs, requested model/effort and commits are in `docs/house-scanner.md`; launcher acknowledgment was not independent proof of execution metadata. Inspect diffs and rerun checks yourself. Local success does not close the hosted, concurrency, retention, source-rights or deployment gates.
