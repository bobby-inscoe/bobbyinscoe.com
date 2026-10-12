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
its game reducer, countdown, and high-score persistence. Its top five scores use
`localStorage` under `duck-feed:high-scores`. There is no backend or remote cache.

Libron v0.31 regular and italic WOFF2 files are bundled unchanged from the official
[release](https://github.com/nicoverbruggen/libron/releases/tag/v0.31) under SIL OFL 1.1. The license is included beside the source fonts and in
`public/licenses/libron.txt` for deployed copies. CSS uses `font-display: swap`
and Georgia as fallback. No font service, stylesheet API, or external font request
is required. The browser fetches font files from the site's own built assets.

## Checks and deployment

Run `npm run check`, `npm run typecheck`, and `npm run build` before delivery.
There is no project test runner yet; browser verification covers the interactive
flows. GitHub Pages deployment runs only for pushes to main or manual dispatch.
The build's index is copied to `404.html` to support direct client-route visits.
