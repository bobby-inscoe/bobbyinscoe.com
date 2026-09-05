# Architecture

The map of this repository. Read before adding anything, so new code lands where
the next person expects it.

Keep this short and true. A long architecture document goes stale and then
actively misleads, which is worse than having none. Describe what exists, never
what is planned.

---

## What this system does

This is Bobby Inscoe's personal website: a small, playful collection of pages,
experiments, and interactive things for visitors to explore. The site is a
scratchpad rather than a product, so the content and implementation can stay
lightweight and experimental while the navigation and page shell remain
predictable.

The current site contains the Duck Feed game. More experiments should be easy to
add without forcing them into a rigid internal template.

## Shape

The application is a client-rendered React site built and served as static
assets by Vite. `App` is the current page shell and renders the Duck Feed
feature directly. As navigation is added, the shell will own the site chrome
and TanStack Router will select the active experiment page.

```
src/
  app.tsx                 site shell and route/page composition
  index.tsx               browser entry point
  index.css               global reset, colors, and base typography
  components/
    DuckFeed/             current game and its co-located styles/assets
  features/               new self-contained experiments as the site grows
  shared/                 UI and utilities used by multiple features
```

The shell and shared UI provide the stable frame; features provide the
interesting behavior. A feature may be internally unconventional, but it must
expose a page-level component that the shell can render.

## Where things go

New experiments belong in `src/features/<feature-name>/`, with their components,
state, styles, assets, and tests kept together. Shared shadcn primitives and
cross-feature utilities belong in `src/shared/`; the site shell and navigation
stay at the application level.

`src/components/DuckFeed/` is the current location of the first experiment. Treat
it as legacy placement: make focused fixes there, but put new experiments in
`src/features/` rather than growing the top-level components directory.

There is currently no generated application code, database, migration directory,
or server-side code. Static assets that belong only to an experiment stay with
that experiment; site-wide assets belong in `public/`.

## Data

The current application is client-only. Interactive state is owned by the
feature that uses it, usually as React component state. A feature may use
browser storage when persistence improves the experience, but persisted state
must have an explicit owner and a documented shape; do not introduce a global
store by default.

There is no remote data source or cache today. If an experiment later uses an
API, its response/cache state belongs to that feature's data layer (with
TanStack Query as the likely shared convention), while user-facing UI state
remains local unless there is a clear cross-page need.

## External dependencies

The production site is static and deployed to GitHub Pages. The only current
runtime network dependency is the Google Fonts stylesheet imported by the global
CSS; the site should remain usable with the font unavailable.

TanStack Router is the planned navigation dependency, and shadcn is the planned
source of shared UI primitives. They are architectural conventions for the
growing site, not requirements for the current Duck Feed implementation.

| Dependency | Used for | On failure |
|---|---|---|
| React | Rendering the client application | The site cannot render; surface the build/deployment failure rather than adding a fallback |
| Vite | Development server and production build | Development/build fails explicitly |
| GitHub Pages | Hosting the static production build | The deployed site is unavailable; local development remains independent |
| Google Fonts | Optional Quicksand typography | Fall back to the browser's available font stack |
| TanStack Router (planned) | Page and experiment navigation | Navigation work is incomplete; do not duplicate ad hoc routing |
| shadcn (planned) | Shared shell and UI primitives | A feature may use plain local styling until the primitive exists |

## Boundaries

- The site shell owns navigation, page framing, and shared UI; experiments own
  their behavior and feature-specific presentation.
- New experiments must not import one another directly. Move genuinely shared
  code to `src/shared/` instead.
- Keep the static-first deployment model. A feature that needs a service must
  isolate that dependency and define a useful unavailable/offline state.
- Do not make the shell depend on a feature's internal state or implementation.
- Use TanStack Router for routes once navigation is introduced; do not add
  one-off pathname parsing beside it.
- Keep feature styles scoped to the feature. Global CSS is for resets, tokens,
  typography, and shell-wide concerns.
- Browser storage and remote data are caches or persistence mechanisms, not
  implicit sources of truth. Define ownership before adding them.

## Known weak points

- The first feature currently lives under `src/components/DuckFeed/` instead of
  the intended `src/features/` layout. Avoid copying that placement for new work.
- Duck Feed is an early prototype with timer and score state held directly in the
  component. Changes to its timing or scoring need extra care around interval
  cleanup and stale React state.
- The repository has no test runner configured yet. Use the existing typecheck
  and production build as the verification floor until behavior tests are added.

Keep it to things that change how you would approach a change. A running list of
every imperfection belongs in the issue tracker, not here.

| Area | Problem | Care needed |
|---|---|---|
| Duck Feed state | Timer, movement, and scores are prototype-level component state | Preserve the game loop behavior and verify timer resets do not leave overlapping intervals |
| Feature placement | The first experiment predates the intended `src/features/` convention | Keep focused compatibility work in its current directory; place new experiments under `src/features/` |
| Static hosting | GitHub Pages serves the built SPA and needs the repository's 404 handling | Keep route behavior compatible with the deployment workflow when adding TanStack Router |
