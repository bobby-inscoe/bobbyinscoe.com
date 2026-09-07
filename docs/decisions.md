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

## 2026-09-07 Duck Feed's avatar colours move to tokens without editing `utils/avatars.ts`
**Decision.** Phase 7's own do-not list forbids touching anything in `utils/`, but `utils/avatars.ts` holds four hex constants and the always-in-force rule bans a colour literal anywhere outside `tokens.css`, in CSS or TS, with no phase exception. `avatars.ts` is left completely untouched, including its now-unused exports; every component that imported from it instead imports token-backed constants from a new `components/avatar-colors.ts`. `DUCK_COLOR` has no replacement, because every call site renders `DuckIcon` with `useOriginalArt`, which ignores the `color` prop entirely, so the constant was already dead. The other three map by colour family rather than by literal value: `SNAIL_COLOR` and the three CSS-only game hexes (`#f4c96b` combo/timer-warning/badge, `#e8635f` timer-critical/catch) land on `--site-warning` and `--site-error`; `LEAF_COLOR` on `--site-success` (it is a leaf); `WHEAT_COLOR` and the bonus-phase hex (`#e879f9`, no family match among the five tokens) both land on `--site-accent`. `--site-state` stays unused in the game, since the spec ties it specifically to project lifecycle.
**Why.** Two rules pointed in opposite directions at the same file and only one of them is phase-scoped. The do-not list exists to keep a rewrite from touching tested game logic; it was never meant to carve out an exception to the site-wide colour rule, and the acceptance command's `git diff --stat` on `utils/` mechanically verifies the file stayed untouched either way. Routing the replacement constants through a new file rather than editing in place satisfies both rules at once instead of picking one to violate.
**Instead of.** Leaving the hex constants live and imported as-is, treating them as protected game content rather than site chrome. Rejected because the "no hardcoded colour... in CSS or TS" rule draws no such exception, and the components that import them are not inside `utils/` and were never protected. Also rejected: editing `avatars.ts` in place, which is the literal violation the do-not list and its acceptance command exist to catch.
**Costs.** `avatars.ts` now exports four constants nothing imports, which will read as dead code to a future reader who has not seen this entry. It cannot be deleted without violating the phase's own boundary, so it stays until a later phase lifts the utils/ restriction.
**Revisit if.** A later phase is allowed to edit `utils/avatars.ts` directly, at which point the dead exports should be removed and `avatar-colors.ts` reconsidered.

## 2026-09-07 `src/shared/theme/motion.css` holds only motion that cannot be scoped
**Decision.** A fourth global stylesheet joins `tokens.css` and `reset.css`, imported after them in `src/index.tsx`. Its charter, stated in a comment at the top of the file, is narrow: only rules that a CSS module cannot express. Today that is the `::view-transition-*` pseudo-elements and the keyframes they name. Component motion stays in the component's own module. A rule that could have been written in a module is in the wrong file.
**Why.** The view-transition pseudos live on the document's transition tree rather than the element tree, so a module has no class to rewrite and cannot reach them. They have to be global. The specification's file enumeration does not list this file, but that enumeration was already ruled non-exhaustive when `/projects` needed a second route module, and `theme/` is where a reader looks for a global stylesheet. Ruled by the human when phase 6 raised it. The charter is the point of the entry: without one, a file called `motion.css` becomes the drawer that all animation drifts into, and the module-scoped motion the rest of the site uses stops being the default.
**Instead of.** Appending to `reset.css`, which is already global but has a deliberately narrow charter of its own as the only file permitted to write `margin`; diluting it into a general global sheet costs more than the file saves. Or burying the rules in an existing `.module.css`, where an unscoped rule does pass through untouched, which hides a document-level rule in a file whose entire purpose is scoping.
**Costs.** One more global stylesheet, and one more place to look for a rule. The charter is prose, so nothing enforces it but review.
**Revisit if.** A second kind of unscopable rule appears that is not motion, which would mean the file is named for the wrong thing.

## 2026-09-07 Reduced motion is audited across the whole repository, vendor switches included
**Decision.** Phase 6's audit covers every stylesheet in `src/`, including `duck-feed.css`, which phase 7 owns. That file gained one `@media (prefers-reduced-motion: reduce)` block and nothing else: no restyle, no module conversion, no change to any existing animation outside the block. Mantine's `respectReducedMotion` is set to `true` in `theme.ts`. A tier-two test now fails the build for any stylesheet in `src/` that declares an animation or transition without a reduced-motion guard.
**Why.** `duck-feed.css` carried nine motion sites and no guard at all, including a five-second infinite rotation on every feed item and an infinite flash on the critical timer. That is an accessibility defect rather than a style one, an audit that skips the largest gap in the repository is not an audit, and phase 7 is at least two sessions out, so deferring meant it stayed broken across phases that add more motion. Mantine's flag is a different case from the ruling that Mantine's emitted margins are out of scope: that ruling is about not patching vendor output, and this is the vendor's own supported switch, which Mantine reads in `Collapse` and writes to the root as `data-respect-reduced-motion` for its stylesheets. Left at its default of `false`, the Colophon modal's fade and every archive `Select` ignored the setting.
**Instead of.** Recording duck-feed as a phase 7 defect and leaving it broken, which is the correct default for out-of-scope breakage and the wrong one when the breakage is inside this phase's own deliverable. Also rejected inside the block: shortening the infinite animations rather than stopping them, since a five-second shake played faster is still a shake.
**Costs.** Phase 6's diff reaches into a file phase 7 rewrites, so the two will collide. Phase 7 inherits the guard as a requirement rather than as code, and a rewrite that drops it is a regression; the test is what makes that a build failure rather than a memory. Two of the nine sites had to be pinned rather than merely stopped, because their `fill` carried a static end state: cancelling them without pinning would have resized a crumb and displaced a catch popup.
**Revisit if.** Phase 7's rewrite lands, at which point the guard moves into the new modules and this entry describes history rather than the code.

## 2026-09-07 `Reveal` wraps sections, not collection entries
**Decision.** `Reveal` renders one `div` and takes an optional 0-based `index` that staggers its entrance, capped at six positions. It is applied at section granularity: masthead, rule, collection, rule on the homepage; title, rule, filters, table on the archive. Individual `ProjectEntry` items do not stagger. No `motion` package was added.
**Why.** Two constraints, neither negotiable by this phase. `ProjectEntry` renders its own `li` and its props are fixed by the specification's component contract, so a reveal cannot be passed to it. And `ol` permits only `li` as a child, so wrapping each entry in a `Reveal` div is invalid HTML. Section granularity needs neither, still exercises the stagger, and reaches the six-item cap naturally. On the package: the phase permits `motion` only if a specific shared-element transition cannot be done with View Transitions, and the one shared element the site actually needs, holding the header, footer and ambient layer still while the content changes, is achieved by naming `main` and letting everything else stay in the root snapshot. Nothing required a library.
**Instead of.** An `as` prop on `Reveal` taking `'div' | 'li'`, which does not help: the `li` is `ProjectEntry`'s, not the wrapper's. Or putting the stagger in `project-entry.module.css` with `nth-child` delays, which works but is not `Reveal` and splits one mechanism across two files.
**Costs.** The collection's entries arrive as a block rather than in sequence, which is the more evocative reading of the motion vocabulary's six-item cap and is not what ships. `Reveal` carries `min-width: 0` so that wrapping content cannot resize it; without it the wrapper became the grid item and propagated the archive table's 640px floor, which the browser pass caught as a horizontal scroll at 380.
**Revisit if.** `ProjectEntry`'s contract opens for another reason, or the collection grows long enough that a block entrance reads as a jump.

## 2026-09-07 Spec erratum: the reduced-motion transition is `--site-duration-instant`, not 120ms
**Decision.** Where the specification's motion vocabulary says "under `prefers-reduced-motion: reduce`, every transition becomes a 120ms opacity change", the duration to use is `--site-duration-instant`, 80ms. The 120 is an error in the spec. Do not restore it, and do not add a token for it.
**Why.** The duration scale is five values: 80, 160, 240, 400, 1200. 120 is not on it. A five-value scale that acquires a sixth for a single component is not a scale, so the scale wins and the stray number loses. Phase 4 had already reached for `--site-duration-instant` in exactly this position, on the skip link's reduced-motion rule, so restoring the literal would leave one job resolving to two different values in two files, which is worse than either value on its own. Perceptually it costs nothing: 80ms and 120ms are both effectively immediate, and immediate is the entire requirement under reduced motion. Ruled by the human when phase 5 raised the literal as a call it was about to make.
**Instead of.** Writing `120ms` where the spec says it, which is faithful to the text and puts an off-scale duration in the codebase that no token names and nothing else uses. Or adding a `--site-duration-reduced` token, which spends a token on a rounding difference and invites the next component to add its own.
**Costs.** The spec and the repository now disagree on that one line, as they already do on phase 4's acceptance command. Anyone reading the motion vocabulary has to know this entry exists.
**Revisit if.** The duration scale is revised for reasons of its own, or a measured difference is found between 80ms and 120ms in this position, which would be surprising.

## 2026-09-07 The thread's axis is the entry's own status-node column
**Decision.** `ThreadSpine` runs down the column `ProjectEntry`'s 9px status node already occupies, pinned to that axis at every anchor and bowing between them, rather than down a separate gutter beside the entries. The layer reaches `--site-space-lg` to the left of the entries to hold the band's left half. The halo `ThreadSpine` draws at each anchor sits behind the entry's dot and never states status: `--site-line` only, and the live and in-progress halos differ by an opacity step small enough that the halos alone cannot be sorted.
**Why.** `ThreadAnchor` carries `y` and `filled` and no `x`, so the x is the thread's own to choose, and pinning it to the node column makes the anchors load-bearing: the curve is the drift rather than a wobble running alongside a line. It also needs no layout change and no gutter that only exists above some width, since `--site-frame-inset` floors at `--site-space-lg` at every viewport. On the halo: the gate requires the page to survive the SVG being deleted, so the dot in the DOM has to remain the status indicator; a halo that also encoded status would be a second information channel that can disagree with the first, and state colour on a decorative element is how "the thread carries no information" quietly stops being true. The falsifiable form of the rule, and the one used to verify it: hide the entry dots and the halos must not tell you which entries are in progress.
**Instead of.** A thread in its own gutter left of the entries, with its own nodes beside the dots. That needs horizontal room that only exists past roughly 1330px, or an indent on the list that would look like a mistake once the thread was deleted, and it puts two marks per entry at the same height for no gain. Also rejected: letting the thread's node replace the entry's dot, which the phase-5 gate forbids outright.
**Costs.** `thread-spine.tsx` carries `NODE_CENTRE_PX = 4.5`, which is half the node width declared in `project-entry.module.css`. Changing that node's size moves the thread off the dots with nothing failing. The constant is named and commented, and the browser pass is what would catch it.
**Revisit if.** `ProjectEntry`'s status node changes size or leaves column one, or the collection's layout gains a real gutter of its own.

## 2026-09-07 The delta-L* floor is measured on declared tokens, not on rendered pixels
**Decision.** The rule "delta-L* >= 3 between adjacent steps within a ramp" refers to the values declared in `tokens.css`. It is not a claim about pixels after the ambient overlay composites over them. The tier-two test stays as it is, reading declared tokens. No token value and no grain opacity changed. Rendered dark ground-to-raised measures 2.98 and that is accepted.
**Why.** Moving the ambient layer above content (see the layer comment in `tokens.css`) means the grain now composites over every surface rather than only the exposed ground. Measured over 37,170 ground and 22,302 plate pixels on the homepage at 1440, the overlay retains a ratio of **0.964** of each declared step, so it costs about **3.6%**. The dark ramp's tightest pair, ground to raised, is 3.094 declared and therefore 2.98 rendered: short by 0.016. Two readings of the rule cannot both hold under an overlay, and this is the one that can be satisfied. At the dark end of sRGB one 8-bit unit is 0.491 L*, so the smallest adjustment the medium can express is about thirty times the size of the miss. A rule that cannot be satisfied to within a factor of thirty by any representable change is stated at the wrong precision, not violated. The floor is also already a safety margin: the just-noticeable difference for large adjacent fields is roughly 1 to 2 delta-L*, so a rendered 2.98 is comfortably past the threshold the rule exists to protect, and that headroom is exactly what absorbs a downstream effect like the overlay. A floor chosen with headroom that then forbids the headroom being used is self-defeating.
**Instead of.** Two repairs were computed rather than argued about, both rejected. **Raising `--site-raised` by one unit** takes ground-to-raised from 2.98 to 3.46 rendered and drops raised-to-surface from 3.22 to 2.75, converting a rounding artefact into a genuine failure one pair along. **Raising the whole ramp above ground by one unit** does clear every pair (3.46, 3.21, 3.09, 3.50 rendered), but costs four token changes, a full re-verification of every contrast figure measured against those surfaces, and leaves surface-to-hover at 3.09, which is inside the quantization noise anyway. Also rejected: changing the grain opacity, which is not ours and which every published contrast figure depends on; and moving the ambient layer back under content, which is what caused the real defect (the step collapsed to 1.00 there, since an underlay tints only the ground it can still see).
**Costs.** The declared ramp and the rendered ramp now differ by a known 3.6%, and no automated check measures the rendered side. Anything that later increases the overlay's strength, a second ambient layer or a heavier texture, eats into the same margin silently. The browser pass is the only thing that would catch it.
**Revisit if.** The ambient layer gains a second element that composites over content, the grain opacity changes for any reason, or a new adjacent pair is introduced with a declared step below about 3.2, which is the point where the rendered value crosses 3.

### A note on modelling the overlay
Do not predict the composited step from the layer's opacity alone. Compositing white at alpha 0.055 over the two surfaces predicts a rendered step of 2.80, against the 2.98 actually measured, because the texture's mean alpha is below the layer's opacity and its mean value is nowhere near white: solving the two measured points gives an effective source near 98 and an effective alpha near 0.057. The literal-alpha model overstates the loss. Use the measured 0.964 ratio, or re-measure.

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
