# Textile workshop experiment

Branch: `codex/textile-workshop-experiment`

Base: `main` at `2437afbd6c092d585caabc942a797c9996c64569`

## Visual direction

A quiet textile workspace suggested through oblique material planes, directional
light, shallow shadows, grain, and sparse drifting fibres. Each project has its
own surface in one continuous room. Their order does not rank their maturity.

The palette uses flax, moss, dark green, and small rust accents. Bundled Libron and a
system sans-serif avoid third-party font requests; Georgia remains the serif fallback. CSS perspective supplies the depth;
there is no WebGL renderer, camera control, scroll capture, or pinned sequence.

The entrance shows all four projects. Ordinary document scrolling brings their
larger surfaces into view. The motion hook batches scroll updates into animation
frames and limits surface-angle changes. It does not run continuously.

One continuous SVG thread starts beneath the overview's Duck Feed preview and
passes behind every larger surface, alternating between the left and right edges.
Uneven slack and occasional loose loops vary its fall.
A ResizeObserver fits the path to the actual layout. On mobile it leaves each
surface before the caption, then returns from the same edge at the next surface.
It has no scroll progress animation and does not intercept input.

Duck Feed keeps two regular feed items in play. Each has its own position and
cooldown; catching either contributes to the shared score and combo. Placement
avoids the other item. Both pause during the existing six-crumb bonus phase and
resume afterward.

Project details appear in a layered folio over the dimmed room. On smaller screens,
its content stacks vertically. Reduced motion disables ambient movement and folio
transitions. The atmosphere control can also pause the room's movement.

The copy is limited to project names, descriptions, and controls. The original
welcome text, slogans, handwritten captions, about section, and footer tagline
were removed after review.

## Content and assets

| Project | Content |
| --- | --- |
| Duck Feed | Playable browser game retained from main, available at `/duck-feed`. |
| Common Basket | Shared grocery list, described as a small proof of concept. |
| Across the Ledger | Conversion of US investment gains and losses into a Skatteverket reporting format. |
| Position Notes | Schwab research MCP server for options data and potential risk/reward. |

The latter three use labeled concept previews and the owner's supplied descriptions.
No public demo links or implementation details were invented. Their applications
and account connections are outside this portfolio's scope.

`src/assets/duck.svg` supplies the same duck to the portfolio and game. It
follows the original 24px image's silhouette, beak, pale wing, and pink cheek.
The original bitmap remains in the game assets as a reference.

## Component library

Mantine Core and Hooks 9.7.2 provide the application's component foundation.
The existing React 19, TypeScript, Vite, and TanStack Router setup remains.
`src/app/theme.ts` owns colours, typography, default radius, button defaults,
automatic text contrast, and reduced-motion settings. `src/app/app.tsx` supplies the
provider; `src/index.css` loads Mantine's layered stylesheet.

Mantine owns the folio's dialog behavior, focus trap, Escape handling, focus
restoration, scroll lock, and transition. The selected project stays available
until its exit transition finishes. The hand-written dialog lifecycle and Tab
handling have been removed.

Duck Feed uses Mantine radio groups, buttons, a keyboard-accessible tooltip,
progress bar, and layout primitives. The workshop
uses Mantine controls and typography while retaining custom scene and artwork CSS.
The folio's standard spacing and metadata layout use component props.

The full core stylesheet is intentional: adding another core component does not
require tracking its internal stylesheet dependencies. Before migration the
production output was about 98 kB compressed JavaScript and 6.3 kB CSS. The first
Mantine build was about 154 kB JavaScript and 41 kB CSS. These are build totals,
not package download sizes.

Useful references:

- [Mantine components](https://mantine.dev/core/package/)
- [Theme configuration](https://mantine.dev/theming/theme-object/)
- [Modal behavior](https://mantine.dev/core/modal/)
- [Vite integration](https://mantine.dev/guides/vite/)

The workshop and game own their route trees. The existing GitHub Pages workflow
copies the app entry to `404.html` for direct client-route visits. Deployment has
not been changed or run.

## Verification

Run the repository checks:

```sh
npm run check
npm run typecheck
npm run build
git diff --check
```

Browser checks cover desktop and mobile layouts, all four project dialogs,
keyboard focus cycling, Escape, focus and scroll restoration, reduced motion,
atmosphere pause, game settings, a complete game round, and returning to settings.
Additional browser checks cover both feed items moving independently, their exclusion
from bonus play, and their return afterward. Thread layouts are checked at 320,
390, and 1440 pixels. Screenshots are inspected after replacing component behavior or styling.

Libron regular and italic were verified as same-origin font requests. With both
font requests blocked, the page remained usable with the Georgia fallback. An
import audit found no cross-feature imports or dependencies from features into
the application layer.

The local verification uses the bundled Playwright runtime and installed Chrome.
No test dependency or automated test runner was added to the project. Physical
touch devices, Safari, and screen readers have not been tested.

`npm audit --omit=dev` reports no vulnerabilities. The full audit reports an
existing development dependency advisory for `source-map-js` 1.2.1, brought in by
Vite through PostCSS (GHSA-68fv-2mgg-jv7q). It is not a Mantine dependency; updating
the build tooling was kept outside this migration.
