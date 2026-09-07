# Phase 3 handoff: registry and presentation system

## Status

Acceptance command, run at the moment of writing. All parts exit zero.

```
$ npm run typecheck && npx vitest run
> tsc --noEmit
 Test Files  4 passed (4)
      Tests  72 passed (72)
(exit 0)

$ npx vitest run src/shared/projects
 Test Files  2 passed (2)
      Tests  12 passed (12)
(exit 0)
```

`npm run check` (Biome) and `npm run build` also pass; both were run as
insurance, not because the acceptance block requires them.

## Branching note

`redesign` has phase 0 and phase 1 merged (PRs #11, #12) but not phase 2:
no PR exists yet for `phase/2-shell-and-routes` into `redesign`. This
branch (`phase/3-registry-and-presentation`) is cut from
`phase/2-shell-and-routes`'s tip rather than from `redesign`, since that is
where phase 2's accepted work actually lives. Not mine to open the phase 2
PR; flagging it so the human can merge phase 2 and phase 3 in order.

## What was built

- `src/shared/projects/queries.ts`: `liveProjects`, `byTag`, `byYear`,
  `byStatus`. Each takes an optional `projects` array defaulting to the
  real `PROJECTS`, so they're pure and testable against fixture data
  without touching the registry.
- `src/shared/projects/queries.test.ts`: tier one, against a three-entry
  fixture (two live, one in-progress) covering the empty case for each
  query and one composed call (`byStatus` over `byTag`'s result).
- `src/shared/projects/types.test.ts`: tier two, the discriminated-union
  test the acceptance block names. Two tests assert runtime narrowing
  (`status === 'live'` unlocks `route`/`mode`; `status === 'in-progress'`
  locks `presentation` to `'text'`). Two more assert the union is
  discriminated at the type level, not just habit: `@ts-expect-error` over
  an in-progress project with `presentation: 'plate'`, and over a live
  project missing `mode`/`route`/`accent`/`accentLight`. `@ts-expect-error`
  fails `npm run typecheck` on its own if the marked line has no error, so
  these are load-bearing, not decorative.
- `src/shared/patterns/project-entry.tsx` + module CSS: the three
  presentation modes on one `<li>`. `plate` and `canvas` get a
  bordered/raised surface (`data-presentation` selector); `text` (always
  used for in-progress, optionally for live) stays a bare row. Every entry
  carries a small filled/hollow node (`data-hollow`) plus an "In progress"
  text label, so status isn't colour- or shape-only. `anchorRef` is typed
  and forwarded exactly as the spec's signature; nothing reads it yet.
- `src/shared/patterns/project-index-row.tsx` + module CSS: one `<tr>` per
  project for the archive table, same node convention as `ProjectEntry`.
- `src/shared/patterns/project-frame.tsx` + module CSS: wraps a project
  page's children, always renders a "Back to the collection" link to
  `backTo`, sets `data-mode` and (when non-null) `--project-accent` /
  `--project-accent-light` as CSS custom properties scoped to the frame.
  `title` is an `aria-label` on the wrapping `<article>`, not a rendered
  heading — Duck Feed already owns its own `<h1>`, and a second visible
  heading with a different string would be a real duplicate, not a nested
  one.
- `src/features/projects/components/projects-index.tsx`: the archive.
  Three Mantine `Select` filters (tag, year, kind) built from the
  registry's own values, composed through `byTag`/`byYear`; kind isn't a
  named query export per the spec's file tree, so it's filtered inline.
  Renders `ProjectIndexRow` per result, or a "no projects match" message.
- `src/features/home/components/home-page.tsx`: now maps `PROJECTS`
  through `ProjectEntry` inside an `<ol>`, `anchorRef={null}` on every
  entry (see below).
- `src/features/projects/features/duck-feed/components/duck-feed-page.tsx`
  (new file): wraps `<DuckFeed />` in `<ProjectFrame>` with the Duck Feed
  entry's values written as literals (title, mode: `'application'`,
  accent/accentLight: `null`), not a registry lookup — see the deviation
  below. `duck-feed-route.ts` now points its `component` at this instead
  of `DuckFeed` directly. Nothing inside `duck-feed/hooks`, `duck-feed/
  utils`, or `duck-feed.tsx`/`duck-feed.css` changed; confirmed with
  `git diff --stat` against those paths, which is empty.

## Deviations, flagged before starting and built as stated

Wrapping Duck Feed's route in `ProjectFrame` was raised as a specific,
material call in the phase restatement and approved by "implement" with
no redirect. Two sub-decisions inside that call, made without a second
round-trip:

- **`ProjectFrame` does not force a colour scheme for `application`/
  `immersive` modes**, even though the palette section states those modes
  are dark-fixed. Mantine's `forceColorScheme` writes to
  `document.documentElement` by default regardless of nesting depth, so a
  naive nested `MantineProvider` would flip the whole page (header and
  footer included), not just the frame's subtree. Scoping it correctly
  needs a `getRootElement` override and is real plumbing, not a one-line
  call. `mode` is exposed as `data-mode` on the frame for a later phase to
  hook into. Nothing currently depends on this: Duck Feed's accent is
  `null`, so there is no accent/background legibility problem yet to
  force-dark-scheme against.
- **Duck Feed's registry values are hardcoded in `duck-feed-page.tsx`
  rather than looked up from `PROJECTS`.** A `.find()` lookup would need
  either a runtime throw for a case that can't happen given the registry
  is static (against `engineering.md`'s guidance not to handle
  can't-happen scenarios) or a non-null assertion. Hardcoding four small,
  stable literals was the more boring choice; the file says in a comment
  to keep them in sync by hand.

## What phase 3 does not touch

Texture, atmosphere, the thread, and the editorial typography pass are
explicitly phase 4/5 territory per the do-not list. `ProjectEntry`,
`ProjectIndexRow`, and the archive use existing space/colour/radius/line
tokens only — no new font sizes, no `--f-display`/`--f-read` usage beyond
what Mantine's `theme.ts` already applies globally. `Plate` (the shared
`ui/plate.tsx` primitive) is not built; `ProjectEntry`'s `plate`/`canvas`
surface treatment is inline CSS in `project-entry.module.css` instead,
since the spec assigns `Plate` itself to phase 4. Expect phase 4 to either
extract this into the real primitive or leave it, at the human's call.

## Verification not done

No screenshots. This machine has no browser-automation tool available
(`chromium-cli` isn't installed, no Playwright browsers present, and no
project `run` skill exists yet), and phase 3 is not one of the phases the
brief requires screenshots for (that's phases 4 through 7). Verified
instead: the render-smoke tier (`routes.smoke.test.tsx`, unchanged, still
covers all three routes including `/projects/duck-feed`'s heading and the
skip link), a manual `curl` 200 against `/` and `/projects` with the dev
server running, and `npm run build` succeeding. I did not interact with
the archive's filters in a real browser; their behaviour is covered
by `queries.test.ts` at the logic level only, not through the UI.

## Next phase

Phase 4: identity layer. Checkpoint reached — the site is now feature
complete and coherent with no atmosphere, per the spec's own note after
phase 3. This is where the human decides whether phases 4 and 5 are worth
building before I continue.
