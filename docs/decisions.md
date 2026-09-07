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

## 2026-09-07 Restyling a Mantine internal part goes through classNames
**Decision.** To restyle an element inside a Mantine component, pass `classNames` at the call site with the values in that component's own CSS module. It stays at the call site until there are two call sites, and only then moves into `theme.components.<Component>`. Two live examples: `Colophon` sets the Modal's `title` part (Mantine sizes it from `--mantine-font-size-md`, so an `h2` rendered smaller than its own `h3` sections) and its `content` part (which carries `--site-shadow-overlay`).
**Why.** `instructions/engineering.md` and the specification both say to set component `defaultProps` in the theme rather than passing style props at call sites. That rule has no reach here: `defaultProps` addresses a component's public props, and there is no prop for a component's internal element. Mantine's per-part Styles API is the sanctioned mechanism for that, not an escape hatch, and a class name is not a style prop in the sense the rule bans; the values still live in a CSS module reading site tokens.
**Instead of.** Promoting every part override into `theme.components` immediately, which puts a rule in the theme with one subject and no second, and separates a component's styling from the module that holds the rest of it. Or a `styles` prop with inline objects, which does put literal style values at the call site and is what the rule actually forbids. Or `:global()` selectors against Mantine's emitted class names, which are not a stable API.
**Costs.** Part-level overrides are spread across component modules rather than collected in one file, so finding every Mantine override means grepping for `classNames` rather than reading `theme.ts`.
**Revisit if.** The same part override is wanted in two places, which is the stated trigger to move it into the theme.

## 2026-09-07 `--site-shadow-overlay` differs in kind between the schemes
**Decision.** The one shadow token is declared in all three blocks of `tokens.css` and is not the same effect in each. Light is a two-layer drop shadow tinted with `--site-mark` (`rgb(16 23 28 / …)`). Dark is a 1px ring in `--site-line`, an inset top highlight in the dark scheme's `--site-mark` (`rgb(214 211 200 / 0.06)`), and a broad black only to kill the seam against the scrim. Modals and popovers only, never a card, an entry, or a plate.
**Why.** The token stalled through two phases because it was being treated as one value with two settings, and it is not. The palette already says as much: dark expresses depth as a luminance step plus a hairline plus a 1px inset highlight because a shadow on a near-black ground is invisible or muddy, while light gets a real shadow. Any single shadow written for both schemes was going to look wrong in one of them. In dark the ring is what separates; if the blur ever appears to be carrying that work, the ring is wrong rather than the blur.
**Instead of.** One shadow value with per-scheme opacity, which is the obvious move and produces either an invisible shadow in dark or a heavy one in light. Or leaving it undefined and using Mantine's own modal shadow, which was the right call while no value existed but leaves the site's one elevation effect owned by a dependency.
**Costs.** A future consumer of the token inherits a ring and an inset highlight in dark, not just a shadow, so anything that already draws its own border will double the edge.
**Revisit if.** A second overlay consumer appears whose shape the ring does not suit, or the dark ground moves far enough from near-black that a plain shadow reads on it.


## 2026-09-07 Copy lives in the component that renders it
**Decision.** A shared pattern component never takes page copy as a prop. The colophon's purpose paragraph is a `TODO(human)` marker inline in `src/shared/patterns/colophon.tsx`; the homepage's opening and closing copy are two markers inline in `src/features/home/components/home-page.tsx`. There is no copy module. Phase 4's acceptance command changes accordingly, from `grep -rn 'TODO(human)' src/features/home | wc -l # expect 3` to `grep -rn 'TODO(human)' src | wc -l # expect 3` plus `grep -c 'TODO(human)' src/shared/patterns/colophon.tsx # expect 1`.
**Why.** The specification puts all three markers under `src/features/home/components/`, but `Colophon` lives in `shared/patterns/`, and nothing in `shared/` may import a feature. The alternative resolutions all cost more than the grep is worth. The claim the command exists to make is that three markers exist and none are filled in, and that claim survives the move. `Colophon` already carries prose: it names the three faces, each colour by its dye, and the stack. One more paragraph is consistent with what the component already is.
**Instead of.** Threading the paragraph from a copy module in `home/components/` through `AppShell` into `SiteFooter` into `Colophon`. That respects the dependency direction but adds two prop signatures that exist only to satisfy a grep, and puts page copy into the signature of a shared pattern component, which is a worse boundary violation than the one it avoids. Or leaving the marker in `colophon.tsx` and letting the original command return 2, which makes the acceptance command silently wrong rather than deliberately amended.
**Costs.** Phase 4's acceptance command no longer matches the text in `prompts/ink-and-fibre-spec.html`, so the spec and the repository disagree on that one line until someone reconciles them. Any later phase reading the spec's phase 4 block must use the amended command recorded here.
**Revisit if.** `Colophon` grows a second consumer that needs different copy, or the site gains a content layer that owns copy independently of components.


## 2026-09-07 The token layer follows Mantine's colour-scheme attribute
**Decision.** `src/shared/theme/tokens.css` switches schemes on `[data-mantine-color-scheme]`, not on a site-owned `[data-theme]`. The two selectors changed are `:root:not([data-mantine-color-scheme="light"])` inside the `prefers-color-scheme: dark` media block, and `:root[data-mantine-color-scheme="dark"]`. No token value, grain opacity, or type size changed; this was a selector rename.
**Why.** Phase 2 mounts `MantineProvider` and Mantine's colour-scheme script, which write `data-mantine-color-scheme` to `<html>`. The token layer written in phase 1 read `data-theme`. Two attributes for one piece of state diverge: a scheme set through Mantine would move Mantine's variables and leave every `--site-*` token behind. Mantine is the one that owns the persistence and writes the value before paint, so its attribute is the one to keep. Verified from `use-provider-color-scheme.ts` and the inline script that both resolve `auto` through `matchMedia` before writing, so the attribute is only ever `light` or `dark` and never the literal `auto`.
**Instead of.** Keeping `data-theme` and mirroring Mantine's value onto it with an effect, which is a second source of truth plus a frame of skew on first paint. Or dropping Mantine's script and writing our own persistence, which discards the part of Mantine that runs before paint and is the reason it exists.
**Costs.** The site's tokens now name a vendor attribute, so replacing Mantine means a selector change in `tokens.css`. That is two lines and a test regex.
**Revisit if.** Mantine is removed, or its attribute name changes across a major version.

## 2026-09-07 `/projects` is a layout route with a separate index route
**Decision.** `src/features/projects/routes/projects-route.ts` creates a layout route at `projects` with no component of its own, and `src/features/projects/routes/projects-index-route.ts` creates the index at `/` beneath it. The archive page hangs off the index route; the feature's `route-tree.ts` composes both plus the Duck Feed tree.
**Why.** In TanStack Router path nesting is component nesting. Putting the archive component on the `projects` route itself would render every project page, Duck Feed included, inside the archive's own markup, because a child route renders through its parent's `Outlet`. A parent route with no `component` renders its `Outlet` directly, which is what a URL prefix that is not itself a page should do.
**Instead of.** One route file with the archive as its component, which is what the specification's file enumeration literally lists. That enumeration was not exhaustive, and the single-file form is broken rather than merely less tidy.
**Costs.** One more route file than the feature would otherwise have, and `/projects` now has two route modules that have to stay in agreement about which one owns the page.
**Revisit if.** TanStack adds a way to render a route's own component only on an exact match, or `/projects` stops having children.

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
