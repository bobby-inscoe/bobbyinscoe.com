# Decisions

Append-only. Newest first. Never edit or delete an entry, because the reasoning
behind a decision stays useful even after the decision is reversed. To change a
decision, add a new entry that supersedes the old one.

## What goes here

Only decisions that are expensive to reverse or that someone will question later:

- Choosing a framework, database, protocol, or hosting model
- A data model or API contract that other things now depend on
- Deliberately rejecting the obvious approach
- A constraint that looks like a mistake without the context
- Reversing an earlier decision

Not here: anything a linter enforces, anything obvious from the code, or
day-to-day choices. If nobody would ask "why is it like this?", skip it.

The test is whether an agent or a new developer would otherwise waste time
proposing the alternative you already rejected.

## When to write one

At the moment of deciding, while the alternatives are still fresh. Written a
month later, the rejected options are gone and only the conclusion survives,
which is the least useful part.

Keep each entry to a few minutes of writing. Five honest sentences beat a formal
document nobody writes.

## Format

```markdown
## YYYY-MM-DD Short title
**Decision.** What was decided, in one sentence.
**Why.** The reasoning and the constraint that drove it.
**Instead of.** The alternatives, and why each lost.
**Costs.** What this makes harder or more expensive.
**Revisit if.** The condition that would change this answer.
```

`Revisit if` is what stops a decision from silently becoming dogma. A decision
made for a hundred users should be re-examined at a million, and writing the
trigger down is what makes that happen.

---

<!-- Add new entries directly below this line, newest first. -->

## 2026-10-13 House Scanner retention purge
**Decision.** A service-role-only function, `hs.purge_expired`, physically deletes or scrubs expired source content and stale replay nonces. It removes exactly what read-time redaction already hides, so `hs_snapshot` output does not change. It ships as a new migration, defaults to dry run, and purges at once when a source's review lapses.
**Why.** Read-time redaction limits what members see but leaves stored source content past its permitted retention. Eligibility is the negation of the snapshot predicate and uses the stored policy as the oracle, so a purge can never remove something the read path would still show. Favorites and notes reference listings by foreign key, so an expired listing that someone saved becomes a tombstone (source URL and identity columns kept, `observed_at` set to the epoch) instead of being deleted. Run, batch and publish digests are never purged, so replays still short-circuit before staging. Nonces are kept for one hour against a 300 second request window.
**Instead of.** A `source_purged_at` marker column, which would edit `hs_snapshot` and `hs_ingest`, the two largest reviewed functions. Deleting a whole row on any nested expiry, which loses live facts and same-time fingerprints early. An Edge purge endpoint, which needs a new credential scope and a contract change. Editing the reviewed baseline migration, which would mix unreviewed code into it.
**Costs.** The epoch sentinel is implicit and needs its comment and a named test. The purge is irreversible, so export privately before the first live run. Weekly export copies can hold facts up to 28 days past purge until export rules are decided. The tombstone keeps the source URL.

Review found one defect and the rest are accepted costs. Deleting staged rows of a run still staging let a later publish succeed with the surviving rows and advance the cursor without error, so the purge now closes such a run as failed in the same transaction, which makes publish and stage fail loudly. The purge goes beyond what the snapshot hides: it also deletes history and staged payloads, and it leaves stored conflict field names. Scrubbing rewrites stored values, so a later refresh of a scrubbed listing counts as a meaningful change and adds a revision. The transaction clock is fixed at call start, so a policy re-approved while the purge waits on the household lock can be judged stale; run the job when no ingest is in flight. Each pass evaluates every live row while holding the lock, so use a large `p_limit` (up to 1000) rather than many small calls.
**Revisit if.** The epoch sentinel confuses review (move to a marker column), the nonce window widens, a source contract requires zero retention of the URL, or the hosted concurrency checks show purge and publish contend on the household lock.

## 2026-10-12 House Scanner follows main's textile workshop

The House Scanner integration uses main at cf07986, including the merged textile workshop experiment. This supersedes the earlier foundation's assumptions about ProjectFrame, shared registry metadata and --site-* tokens. House Scanner is a top-level feature with its existing /projects/house-scanner URL; the app composes its route and the workshop exposes a data-only folio entry. It inherits the existing Mantine provider, moss/flax palette and Libron headings. Restoring the redesign shell would replace the selected website styling, so only House Scanner commits were replayed onto main. A local pre-rebase branch preserves the earlier tip for recovery.

## 2026-10-12 Duck Feed high scores store entries, read old numbers in place
**Decision.** `duck-feed:high-scores` now holds `{ name, score }` objects, where `name` is three letters A-Z. The parser also accepts the previous bare-number array and maps each number to the name `---`. There is no migration step and no new storage key; the first write after load rewrites the array in the new shape.
**Why.** The key is a player's only record of past rounds and lives in their browser, so a new key would silently orphan it and a one-shot migration would have to run exactly once to be safe. Reading both shapes at the existing boundary is a few lines and cannot lose data. Names are re-sanitised on read because localStorage is untrusted.
**Instead of.** A versioned envelope (`{ version, entries }`) was rejected as machinery for a two-field shape with one past version. A new key was rejected because it drops existing scores.
**Costs.** Rolling the code back after new-format scores are saved makes the old parser discard them, since it keeps only bare numbers. That loses a local top five, not user data that exists anywhere else. `---` rows are indistinguishable from a player who never entered initials.
**Revisit if.** The shape grows a third field or a second shape appears; at that point a versioned envelope earns its cost.

## 2026-09-05 Recursive feature route-tree composition
**Decision.** Supersedes the entry below. Every routed feature exports a `routes/route-tree.ts` composed from its own route plus the route trees of its *immediate* child features only; `src/app/router.ts` composes just the top-level features. Route factories take the parent as a generic `<TParent extends AnyRoute>`.
**Why.** The feature layout is recursive, so route composition must be too, or a subfeature and a top-level feature look identical on disk and behave differently. Recursion keeps "deleting a feature is deleting a directory" true, keeps a subfeature's exposure switch next to the subfeature, and makes any subtree independently mountable for tests. The generic parent is not cosmetic: with a bare `AnyRoute` parameter, `<Link to="/definitely-not-a-route" />` typechecks clean — verified both directions before adopting this.
**Instead of.** Consolidating all of a feature's descendant routes in the root feature's route tree, which reads the whole URL surface of a feature in one file. It lost because it makes the root file's knowledge O(descendants) rather than O(children), deep-imports through two encapsulation boundaries, and reintroduces internally the coupling the feature rules forbid externally. Its discoverability advantage is recoverable in the chosen design via devtools and a routesById snapshot; the reverse is not recoverable.
**Costs.** One extra `route-tree.ts` per routed feature even when it has a single route, and no single file states the application's full URL surface. Nested generics compound, so deep trees carry a TypeScript inference cost.
**Revisit if.** The project adopts TanStack file-based routing or route codegen; `npm run typecheck` slows materially and profiling blames route-tree inference; feature nesting routinely passes four levels; or subfeature URLs routinely need hoisting because they do not nest under their parent, which would mean the feature tree and the URL tree have diverged.

## 2026-09-05 TanStack Router route ownership
**Decision.** Use TanStack Router's code-based route tree, with route modules owned by features and composed by a thin application-level route tree.
**Why.** Feature ownership keeps navigation next to the page it exposes without scattering route composition or creating a global feature-agnostic routes directory.
**Instead of.** Centralized file-based routing would make route discovery simpler but would separate routes from their features; a centralized code-based tree would preserve type safety but make the application layer own feature details.
**Costs.** The application route tree must import and compose each feature route module, and new features need an explicit composition step.
**Revisit if.** The number of routes makes manual composition materially harder to maintain or the project adopts TanStack's file-based routing tooling.

## 2026-10-12: House Scanner privacy foundation

House Scanner adds an invitation-only shortlist beside the static portfolio. The public route and demo contain only fictional data. Live household facts and shared edits belong in a Supabase database with current-membership RLS and actor-owned writes. Static JSON cannot protect private data or safely merge concurrent saves; local-only hosting makes household access depend on a personal computer.

The feature owns its UI, network and matching code. Shared registry metadata stays data-only. Collector tooling is separate from the Vite graph. Signed ingest credentials bind one household and approved source scope; stage observations before atomic publication, preserving favorites and notes. No real source is cleared and no live endpoint is activated by this local change.

Rollback removes route/registry exposure and disables jobs first. Preserve the last good edition and user-authored records; revoke compromised keys or membership independently of the frontend. Export privately before destructive database changes. Behavioral privacy/replay evidence is pending user authorization and a local backend runtime.

## 2026-10-12 House Scanner local runtime verification

The user authorized local behavior and privacy tests. Use Vitest, Testing Library/jsdom, PostgreSQL WASM via PGlite, and Playwright with installed Edge. This runs the actual migration and app behavior without provisioning accounts or contacting sources. Static inspection alone missed a PL/pgSQL alias collision and session timing defects. A local Docker Supabase stack would better represent Auth/PostgREST and concurrent connections, but Docker, PostgreSQL and the Supabase CLI are absent on this host. Keep those hosted/concurrency checks as activation gates rather than treating the local substitute as equivalent.

The SQL fix renames one loop variable instead of qualifying every evidence alias. Session generations invalidate pending actions, with a separate sign-out latch preventing refresh while logout is pending. Photo display schedules its own expiry check. Import MapLibre's worker through Vite's URL asset support: excluding the library from dependency optimization would address development serving but would not explicitly establish the production worker asset. Each demonstrated failure has a regression check; the production preview verifies the selected worker approach.

These commits can be reverted locally. They change no deployed data or schema shape. Revisit the runtime setup when a permitted local or hosted Supabase environment becomes available; verify concurrent transactions, Auth/PostgREST, real OTP/SMTP, multi-tab SDK behavior and retention cleanup before live use.
