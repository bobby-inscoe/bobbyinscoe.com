# Architecture

The portfolio is a client-side React application built with TypeScript and Vite.
Mantine supplies standard UI components; TanStack Router owns navigation.
GitHub Pages serves the static build.

## Source layout

The layout follows [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):

- `src/app/`: app entry, providers, theme, shell, and route composition.
- `src/assets/`: shared duck artwork and bundled Libron webfonts.
- `src/features/workshop/`: portfolio scene, folios, project content, and motion.
- `src/features/duck-feed/`: game components, hooks, rules, assets, and routes.
- `src/index.tsx` and `src/index.css`: browser bootstrap and global styling.

Create shared `components`, `hooks`, `lib`, `types`, or `utils` folders only when
there is code that needs them. Feature-specific code stays inside its feature.
Imports use the `@/` alias and name files directly, without barrel exports.
Features do not import other features or the application layer. The application
composes the features; shared code must not depend on either layer.

The repository keeps its existing routing convention: each routed feature exports
a `routes/route-tree.ts`, and the app composes the top-level trees. This deliberate
variation from Bulletproof React's example preserves feature ownership and generic
route types. See `docs/decisions.md` for the reasoning.

## State and assets

Workshop selection and motion state stay in the workshop feature. Duck Feed owns
its game reducer, countdown, and high-score persistence. Its top five scores
(three-letter initials plus a score) use `localStorage` under
`duck-feed:high-scores`. Workshop and Duck Feed use no backend or remote cache.

Libron v0.31 regular and italic WOFF2 files are bundled unchanged from the official
[release](https://github.com/nicoverbruggen/libron/releases/tag/v0.31) under SIL OFL 1.1. The license is kept in
`public/licenses/libron.txt` and is copied into the deployed site. CSS uses `font-display: swap`
and Georgia as fallback. No font service, stylesheet API, or external font request
is required. The browser fetches font files from the site's own built assets.

## Checks and deployment

Run `npm run check`, `npm run typecheck`, `npm run test:typecheck`, `npm test`,
`npm run test:browser` and `npm run build` before delivery. Vitest runs unit,
hook and PostgreSQL (PGlite) tests; Playwright runs the House Scanner flows in
installed Edge at desktop and phone sizes. GitHub Pages deployment runs only for
pushes to main or manual dispatch. The build's index is copied to `404.html` to
support direct client-route visits.

## House Scanner

House Scanner lives in `src/features/house-scanner` and owns a lazy route tree at
`/projects/house-scanner`. The app composes that tree beside workshop and Duck
Feed, and the workshop's folio is its public entry point. Its page and scoped
styles inherit the single Mantine provider, moss and flax palette and Libron
headings.

Inside the feature:

- `components/household-workspace.tsx` is the shell: tab state, status line, the
  shared list and map state, and the notes controller. Each tab body is a panel
  (`listings-panel.tsx`, `add-link-panel.tsx`, `sources-panel.tsx`,
  `settings-panel.tsx`). Cards split into `listing-card.tsx` (collapsed),
  `listing-details.tsx` and `listing-photo.tsx`. `household-map.tsx` is loaded
  lazily so MapLibre stays in its own chunk.
- `utils/` holds the rules, each in one place: `match-listing.ts` (matching and
  the section wording), `listing-position.ts` (which homes get a pin),
  `listing-filters.ts` (personal filters), `listing-view.ts` (what a tab shows
  and the map points), `format.ts`, `manual-url.ts`, `listing-staleness.ts`,
  `scan-summary.ts` and `source-policy.ts`. List and map read the same filtered
  array, so a new view filter reaches both.
- `hooks/` owns session, demo and notes state; `api/household-client.ts` is the
  only module that talks to Supabase; `types/contracts.ts` is the contract shared
  with the database and the collector.

The demo uses fictional in-memory data. Snapshots are never persisted in browser
storage or public assets. The schema, retention purge, operator functions and
signed ingest function live under `supabase/`, with their PostgreSQL tests in
`supabase/tests`.

The collector is a separate Node build under `tools/house-scanner`, never
imported by the app. `live-reader.ts` holds the guards every source shares,
`robots.ts` and `page-read.ts` the shared parsing pieces, `live-run.ts` the
request building, and each source adds a parser plus an entry in
`source-adapters.ts` and `source-registry.ts`. `docs/house-scanner.md` is the
work record and operator runbook.
