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

## 2026-09-07 CSS margin stays banned; reset.css and centring are the exceptions
**Decision.** The `instructions/engineering.md` rule against CSS `margin` stands as written, with no exemption for the redesign. `src/shared/theme/reset.css` may set `margin: 0` to clear user-agent defaults; that is the one permitted rule. To centre an element, use `justify-self: center` on a grid child or `justify-content: center` on a flex parent, never `margin: auto`. Margins emitted inside Mantine's own stylesheets are third-party output and are out of scope for this rule.
**Why.** An agent working the spec raised this as an apparent conflict between `instructions/engineering.md` and the design system's layout needs. It is not a conflict: `gap` and `padding` cover every layout case the redesign needs, and the one legitimate exception (clearing user-agent default margins) already has a designated home in the reset file.
**Instead of.** Carving out per-component exemptions, which would recreate the ambiguity this rule exists to remove and give every future agent a judgment call instead of a mechanical check. Allowing `margin: auto` for centring, which duplicates what `justify-self`/`justify-content` already does and reintroduces a second centring convention.
**Costs.** Nothing measurable; the site's layout is grid- and flex-based throughout, so `gap` and `padding` were already sufficient.
**Revisit if.** A layout need surfaces that `gap`, `padding`, `justify-self`, and `justify-content` genuinely cannot express.

## 2026-09-07 Duck Feed moves off `/`
**Decision.** Duck Feed is no longer the site's root route. It moves to `src/features/projects/features/duck-feed/`, exposed at `/projects/duck-feed`, as one entry in the projects collection rather than the entire site.
**Why.** The site is being rebuilt as a collection of projects with its own homepage (`docs/architecture.md`'s "collection" model). Duck Feed was only ever occupying `/` because it was the first and only experiment; that placement was never a decision, just what existed before there was anything to choose between.
**Instead of.** Keeping Duck Feed at `/` and redirecting or special-casing the homepage around it, which would tie the site's entry point to whichever experiment happened to exist first rather than to an actual homepage design.
**Costs.** Existing links and bookmarks to `/` will land on the new homepage instead of the game; nothing currently depends on the old URL in a way that requires a redirect.
**Revisit if.** The site ever needs a single-purpose entry point again rather than a collection homepage.

## 2026-09-07 Self-hosted fonts supersede the runtime Google Fonts import
**Decision.** Bricolage Grotesque, Newsreader, and IBM Plex Mono are self-hosted through `@fontsource` packages, imported at build time. There is no runtime request to Google Fonts.
**Why.** `docs/architecture.md` previously described Google Fonts (Quicksand) as an optional runtime dependency with a fallback-font-stack failure mode. The redesign's typography is load-bearing to the design system rather than decorative, so a network failure silently degrading the type scale is not acceptable, and self-hosting removes the dependency and the failure mode both.
**Instead of.** Continuing to load fonts from Google's CDN with `preconnect` hints, which was the previous approach and the one the spec document itself still demonstrates for its own page. That approach trades a small amount of setup for a runtime dependency and a font-swap flash the site no longer needs to accept.
**Costs.** Font files ship in the application bundle instead of being cached across sites by a shared CDN; three `@fontsource` packages become permanent dependencies.
**Revisit if.** Bundle size from self-hosted fonts becomes a measured problem, or the type system moves away from Bricolage Grotesque's variable-width axis, which is the feature that makes self-hosting worth the cost.

## 2026-09-07 Mantine 9 supersedes the shadcn plan
**Decision.** Shared UI primitives are built on Mantine 9 (`@mantine/core`, `@mantine/hooks`), not shadcn. `docs/architecture.md` previously named shadcn as the planned source for shared primitives; that plan is dropped.
**Why.** The redesign's design system (`prompts/ink-and-fibre-spec.html`) is specified against Mantine's theming API: a `createTheme` call with a `cssVariablesResolver` that maps Mantine's CSS variables onto the site's own `--site-*` tokens, and component `defaultProps` set centrally in the theme. shadcn's copy-into-your-repo primitives have no equivalent single point of token binding; each copied component would need its own pass to read site tokens instead of Tailwind classes, and the spec explicitly forbids installing Tailwind.
**Instead of.** Proceeding with shadcn as `docs/architecture.md` still describes. That was never implemented, so nothing is lost by dropping it, and keeping it would mean either installing Tailwind (which the spec bans outright) or maintaining shadcn's primitives without the utility framework they assume.
**Costs.** Mantine is a runtime dependency rather than copied-in source, so upgrading it is a version bump rather than a diff to review; its own emitted styles (including margins) are accepted as out of scope for the site's no-`margin` rule.
**Revisit if.** Mantine's theming API stops supporting a clean mapping onto CSS custom properties, or a component's design diverges far enough from Mantine's primitive that building it from scratch is cheaper than overriding.

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
