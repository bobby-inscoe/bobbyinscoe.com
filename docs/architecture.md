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
assets by Vite. `App` provides the TanStack Router provider. The application shell owns the site
chrome, and TanStack Router selects the active experiment page.

```
src/
  app.tsx                 router provider
  app/                    shell and top-level route-tree composition
  index.tsx               browser entry point
  index.css               global reset, colors, and base typography
  features/
    duck-feed/             self-contained game feature
      routes/              duck-feed-route.ts and route-tree.ts
  shared/                  UI and utilities used by multiple features
```

The shell and shared UI provide the stable frame; features provide the
interesting behavior and own their routes. Route composition is recursive: each
routed feature exports a route tree built from its own route plus the route trees
of its immediate child features, and `src/app/router.ts` composes only the
top-level ones. Duck Feed is currently the single top-level feature, so it is the
worked example of the leaf case. The rules live in `instructions/engineering.md`.

## Where things go

New experiments belong in `src/features/<feature-name>/`. Each feature may
contain `api`, `assets`, `components`, `context`, `features`, `hooks`, `mock`,
`routes`, `types`, and `utils` directories as needed. Shared shadcn primitives
and cross-feature utilities belong in `src/shared/`; the site shell and route
tree stay at the application level.

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

TanStack Router provides navigation, and shadcn is the planned source of shared
UI primitives.

| Dependency | Used for | On failure |
|---|---|---|
| React | Rendering the client application | The site cannot render; surface the build/deployment failure rather than adding a fallback |
| Vite | Development server and production build | Development/build fails explicitly |
| GitHub Pages | Hosting the static production build | The deployed site is unavailable; local development remains independent |
| Google Fonts | Optional Quicksand typography | Fall back to the browser's available font stack |
| TanStack Router | Page and experiment navigation | Navigation work is incomplete; do not duplicate ad hoc routing |
| shadcn (planned) | Shared shell and UI primitives | A feature may use plain local styling until the primitive exists |

## Boundaries

- The site shell owns page framing and shared UI; experiments own their routes,
  behavior, and feature-specific presentation.
- New experiments must not import one another directly. Move genuinely shared
  code to `src/shared/` instead.
- Keep the static-first deployment model. A feature that needs a service must
  isolate that dependency and define a useful unavailable/offline state.
- Do not make the shell depend on a feature's internal state or implementation.
- Use TanStack Router for routes; do not add one-off pathname parsing beside it.
- A feature composes its immediate children's route trees and nothing deeper. The
  application layer never reaches past a top-level feature's route tree.
- Keep feature styles scoped to the feature. Global CSS is for resets, tokens,
  typography, and shell-wide concerns.
- Browser storage and remote data are caches or persistence mechanisms, not
  implicit sources of truth. Define ownership before adding them.

## Known weak points

- The first feature has been moved under `src/features/duck-feed/` to establish
  the intended feature layout.
- Duck Feed's game state machine (`hooks/use-duck-feed-game.ts`), timestamp-based
  round countdown (`hooks/use-countdown.ts`), and geometry/difficulty/scoring
  logic (`utils/`) are the reference example of keeping a feature's component
  light and its behavior in hooks/utils. It persists its top-5 high scores in
  `localStorage` under the key `duck-feed:high-scores`, owned solely by
  `hooks/use-high-scores.ts`.
- The repository has no test runner configured yet. Use the existing typecheck
  and production build as the verification floor until behavior tests are added.

Keep it to things that change how you would approach a change. A running list of
every imperfection belongs in the issue tracker, not here.

| Area | Problem | Care needed |
|---|---|---|
| Feature placement | The first experiment established the feature convention | Keep feature assets, routes, and behavior inside the owning feature |
| Static hosting | GitHub Pages serves the built SPA and needs the repository's 404 handling | Keep route behavior compatible with the deployment workflow when adding TanStack Router |
