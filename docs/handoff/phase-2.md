# Phase 2 handoff: shell and route restructure

## Status

Acceptance command, run at the moment of writing. All three parts exit zero.

```
$ npm run typecheck && npm run check && npx vitest run
> tsc --noEmit
> biome check .
Checked 61 files in 25ms. No fixes applied.
 Test Files  2 passed (2)
      Tests  60 passed (60)
(exit 0)

$ test -d src/features/projects/features/duck-feed || { echo 'FAIL: duck-feed not moved'; exit 1; }
dir exists: ok
$ ! grep -rn "path: '/'" src/features/projects/features/duck-feed
(exit 0 - nothing found)

$ find src -path '*/routes/*' -type f | sort
src/features/home/routes/home-route.ts
src/features/home/routes/route-tree.ts
src/features/projects/features/duck-feed/routes/duck-feed-route.ts
src/features/projects/features/duck-feed/routes/route-tree.ts
src/features/projects/routes/projects-index-route.ts
src/features/projects/routes/projects-route.ts
src/features/projects/routes/route-tree.ts
$ find src -path '*/routes/*' -type f ! -name '*.ts' | grep -q . && { echo 'FAIL'; exit 1; } || echo 'routes ok'
routes ok
(exit 0)
```

This is not the acceptance block printed in the spec. The spec's block has two
errata, corrected by the human and recorded below. Run the block above.

## Acceptance-command errata, ruled on by the human

Do not copy the spec's broken patterns into phase 3's acceptance block.

1. `! grep -rlE '<[A-Z]' src --include='*/routes/*.ts'` is vacuous and unfixable.
   GNU grep matches `--include` against the basename, so the glob selects zero
   files and the `!` passes unconditionally. Fixing the glob does not help:
   `<[A-Z]` matches `<TParent`, the exact generic form this phase requires.
   Replaced with a file-extension assertion, because tsc rejects JSX in a `.ts`
   file outright and `npm run typecheck` already enforces the rule completely.
2. `! grep -rn "path: '/'" <dir>` had the same vacuous-pass shape: if the
   directory does not exist, grep exits non-zero and `!` passes. A `test -d`
   guard now runs first.

This does not generalise. Two commands were wrong. Where another one fails, the
default remains that the code is wrong, not the check.

## What was built

- `src/app/app-shell.tsx`: `MantineProvider` (wired to phase 1's `theme` and
  `cssVariablesResolver`, `defaultColorScheme="auto"`), `ColorSchemeScript`, skip
  link, ambient layer element, `SiteHeader`, exactly one
  `<main id="main-content">` holding the `Outlet`, `SiteFooter`. Layout lives in
  `app-shell.module.css`.
- `src/shared/patterns/site-header.tsx` and `site-footer.tsx`, with modules.
  Structural only; the identity layer is phase 4, and the footer's colophon link
  is phase 4's.
- `src/shared/projects/types.ts` and `registry.ts`. See the section below.
- `src/features/home/`: `HomePage` maps `PROJECTS` inline to a bare list. No
  design, no component extraction.
- `src/features/projects/`: layout route, index route, route tree. The index page
  is a bare `Projects` heading for phase 3's archive to replace.
- Duck Feed moved whole to `src/features/projects/features/duck-feed/`. The only
  non-import change inside it is `path: '/'` to `path: 'duck-feed'`, verified with
  `git diff` on that directory filtered to non-import lines, which returns that
  one hunk and nothing else.
- `src/app/router.ts` composes the home and projects trees only. `routeTree` is
  now exported so the smoke tests can mount the real tree on a memory history.
- `src/app/routes.smoke.test.tsx`: tier three. See below.
- `vitest.setup.ts` stubs `matchMedia` and `ResizeObserver`, which jsdom does not
  implement and which Mantine's provider and Duck Feed's board both reach on
  first render. Wired through `vitest.config.ts`, added to tsconfig's include.
- `docs/decisions.md`: two new entries, newest first.

## What phase 3 owes types.ts and registry.ts

Both files already exist, created here under an explicit ruling so the homepage
read real data rather than a hardcoded list a later phase would have to notice and
delete. The failure mode to avoid is adapting to what you find instead of writing
what the spec says.

- `types.ts` is spec-verbatim. Diff it against the specification's
  `src/shared/projects/types.ts` code block and treat it as done only if it
  matches character for character. It was pasted, not retyped.
- `registry.ts` holds one entry deliberately: Duck Feed as a `LiveProject`. Which
  in-progress entries exist is a human decision. Do not invent projects.
- `queries.ts` was not written. It is still phase 3's, along with every
  presentation component and the tests against both files.
- Three field values on the Duck Feed entry were judgment calls rather than spec
  values, and phase 3 or 4 may revise them freely: `presentation: 'plate'`,
  `mode: 'application'`, and the `blurb` text. `accent` and `accentLight` are both
  `null`, which the type permits and which avoids inventing a palette value.

## The smoke file is cumulative

`src/app/routes.smoke.test.tsx` covers the three routes that exist now: `/`,
`/projects`, `/projects/duck-feed`. Each gets four cases: its own level-one
heading renders, exactly one `main` landmark, a skip link whose `href` matches
that landmark's `id`, and no `console.error`. Every phase that adds a route adds
it to the `ROUTES` table in that file. Do not start a second smoke file.

## Colour scheme: one attribute, and it is Mantine's

Recorded in `docs/decisions.md`. `tokens.css` now switches on
`[data-mantine-color-scheme]` rather than `[data-theme]`. A selector rename; no
token value, grain opacity or type size touched. Verified in Chrome against the
running dev server, reading `document.documentElement` and the computed
`--site-ground`:

| OS scheme | stored preference | attribute written | resolved ground |
|---|---|---|---|
| light | none | `light` | `#d6d3c8` fibre |
| dark | none | `dark` | `#10171c` ink |
| light | `dark` | `dark` | `#10171c` ink |
| dark | `light` | `light` | `#d6d3c8` fibre |

The attribute is never the literal `auto`: both the pre-paint script and
`use-provider-color-scheme.ts` resolve `auto` through `matchMedia` before writing.
The stored preference beats the OS in both directions, which is the
`:root:not([data-mantine-color-scheme="light"])` guard doing its job. No console
errors in any state.

## Deviations and notes

- Branch is `phase/2-shell-and-routes`, not `redesign/phase-2-...`. Git cannot
  hold a branch named `redesign` and a branch under `redesign/` at the same time,
  so the brief's scheme is unimplementable while `redesign` is the integration
  branch. This matches the convention phases 0 and 1 already used.
- `prompts/` and `docs/handoff/` are gitignored by human instruction: local only,
  one machine, no remote copy. This file is therefore untracked. Read it from
  disk, not from git.
- `core.autocrlf` was `true` and Biome demands LF. Phase 2 is the first phase
  whose acceptance runs `npm run check`, so this surfaced now, on files no phase
  had touched. Set to `false` for this repo and normalised the working tree's
  tracked text files to LF, which is what git already stores, so `git diff` shows
  no content change from it. A tracked `.gitattributes` carrying
  `* text=auto eol=lf` would make this durable across machines; not added, since
  it is outside phase 2.
- `@mantine/core/styles.css` is imported in `src/index.tsx`. Mantine 9 ships its
  component CSS as an explicit import, and the provider alone renders components
  unstyled with no obvious cause. 277KB uncompressed, for zero Mantine components
  so far. Phase 8's bundle budget should look at it.
- CSS modules sit alongside their components. The spec's file tree does not
  enumerate stylesheets; modules were chosen because phase 7 names them as the
  target for Duck Feed's conversion, so they are the project's direction already.
- `vitest run` prints "Not implemented: Window's scrollTo()" from jsdom several
  times. It comes from TanStack's scroll restoration reaching a jsdom method that
  does not exist. It is not a `console.error`, and the smoke tests assert on that
  separately. Not suppressed.

## Two things the spec did not anticipate

- `Link to` is unchecked for registry-driven routes. The union itself is intact
  and correct: `<Link to="/definitely-not-a-route" />` fails typecheck with
  `Type '"/definitely-not-a-route"' is not assignable to type '"." | ".." | "/" |
  "/projects" | "/projects/duck-feed"'`, so the `<TParent extends AnyRoute>`
  factories are doing their job. But a value typed `string` passes unchecked, and
  `registry.ts` types `route` as `string` because the spec's type block does. So
  `<Link to={project.route}>` on the homepage compiles without validating the
  path. Nothing to fix, since the type is spec-verbatim, but phase 3 should know
  that a typo in a registry route is a runtime dead link, not a build failure.
- `types.ts` carries two hex literals, `#10171C` and `#D6D3C8`, inside the doc
  comments the spec's block includes. They document the contrast requirement and
  no code reads them, but they are new hits for phase 1's colour-literal grep,
  which excludes only `tokens.css`. Kept, because verbatim was the ruling and
  stripping them would break the diff phase 3 is told to run.

## Known broken, not mine to fix

Duck Feed's `.Button` renders with no background and no border. Its CSS reads
`var(--secondary)`, `var(--secondary-dark)` and `var(--primary)`, which were
defined in `src/index.css` and died with it in phase 1. Visible on
`/projects/duck-feed` as a "Start Game" label with no button chrome. Phase 7 owns
this: it removes the generic `.Button` class in favour of Mantine's Button with
theme defaults. Phase 2's do-not list forbids touching Duck Feed's CSS, so it was
left alone.

## Next phase

Phase 3: registry and presentation system. Read "What phase 3 owes types.ts and
registry.ts" before starting, and the acceptance errata before writing phase 3's
own acceptance block.
