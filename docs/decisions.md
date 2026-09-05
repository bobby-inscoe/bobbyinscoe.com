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
