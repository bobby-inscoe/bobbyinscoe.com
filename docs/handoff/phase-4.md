# Phase 4 handoff: identity layer

## Status

Acceptance command, amended (see the ruling below), run at the moment of
writing. All parts exit zero.

```
$ npm run typecheck && npx vitest run
> tsc --noEmit
 Test Files  4 passed (4)
      Tests  72 passed (72)
(exit 0)

$ grep -rn 'TODO(human)' src | wc -l                       # expect 3
3
$ grep -c 'TODO(human)' src/shared/patterns/colophon.tsx    # expect 1
1
```

`npm run check` (Biome) and `npm run build` also pass; run as insurance, not
because the acceptance block requires them.

## Five rulings from the human

1. **Copy lives in the component that renders it.** Two markers inline in
   `home-page.tsx`, one inline in `colophon.tsx`. No copy module, and a
   shared pattern component never takes page copy as a prop. Phase 4's
   acceptance command is amended accordingly; the version above is the one
   to use, not the one in `prompts/ink-and-fibre-spec.html`. Recorded in
   `docs/decisions.md`, "Copy lives in the component that renders it".
2. **Phase 4 owns all of `src/shared/ui/`** except `reveal.tsx` (phase 6)
   and `thread-spine.tsx` (phase 5). `Prose`, `Meta`, `Rule` and `Plate`
   are built. They are thin by instruction: none takes a variant or size
   prop, and adding one is a stop-and-ask, not a judgment call.
3. **`--site-shadow-overlay` is defined, and differs in kind between the
   schemes.** Light is a two-layer drop shadow tinted with `--site-mark`;
   dark is a 1px `--site-line` ring plus an inset fibre highlight plus a
   broad black that only kills the seam against the scrim. It stalled
   through two phases because it was being read as one value with two
   settings, and it is not one effect. Do not collapse it. In dark the ring
   does the separating; if the blur seems to be carrying that work, the ring
   is wrong, not the blur. Recorded in `docs/decisions.md`.
4. **Restyling a Mantine internal part goes through `classNames`**, values
   in the component's own CSS module, at the call site until there are two
   call sites and only then into `theme.components`. Recorded in
   `docs/decisions.md`. `Colophon` is the only current instance, on the
   Modal's `title` and `content` parts.
5. **`docs/handoff` is now tracked.** `/docs/handoff` was in `.gitignore`,
   so phases 1 through 3 existed on disk only and `git add` on them
   succeeded silently without staging anything. Removed in its own commit,
   `chore: track phase handoffs`, before any phase 4 work. Phase 5 can rely
   on finding this file in git. `/prompts` stays ignored.

## What was built

- `tokens.css`: the three families, the eight type roles as `font`
  shorthands with tracking/width companions, `--site-measure`,
  `--site-frame-max`, `--site-frame-inset`. No colour, grain or size value
  changed. The shorthand resets the other `font-*` longhands, so every rule
  that uses one declares `font:` first; that is commented at the token.
- `theme.ts`: reads the families from the tokens rather than restating them,
  maps Mantine's five font sizes onto the scale's two interface sizes, and
  points Mantine's primary colour at the accent. That last one was a real
  leak: Mantine's default blue was reaching the page as the focus ring on
  every control. Modal `defaultProps` set centrally (centred, backdrop
  blur, 240ms fade).
- `src/shared/ui/`: `prose.tsx` (measure and rhythm), `meta.tsx` (the muted
  11px mono role), `rule.tsx` (a hairline, no props at all), `plate.tsx`
  (one raised surface, no variants). Dark adds the 1px inset top highlight;
  light does not need it.
- `app-shell.module.css`: the two ground textures, one `feTurbulence` field
  each with `stitchTiles`, tiled at 140px. Light is anisotropic, fast in x
  and slow in y, so the structure runs vertical: that is the warp, and the
  phase 5 thread runs with it. Dark is isotropic and coarser. Opacity is
  `--site-grain`, untouched. Suppressed in `@media print`.
- The depth-of-field layer: five gradient elements, each blurred by more
  than its own diameter, at 3 to 6 percent, on three drift rates between 12
  and 22 pixels per ten seconds. Static under reduced motion.
- `colophon.tsx`: a Mantine Modal from a footer button, one scroll, no
  tabs. Swatches read `var(--site-*)` through a `data-token` attribute, so
  they cannot drift from the palette. Names the three faces, seven dyes,
  and the stack. Its `content` part carries `--site-shadow-overlay`, the
  token's only consumer.
- Typography pass on the homepage, the archive, the header, the footer,
  `ProjectEntry` and `ProjectIndexRow`. `ProjectEntry`'s inline plate CSS
  from phase 3 is now the real `Plate`.

## Deviations and open items

- `tokens.test.ts` renamed its `COLOR_TOKENS` list to `SCHEME_TOKENS` and
  added `shadow-overlay` to it. The list was never only colours (`grain`
  was always in it); what it actually asserts is that every token whose
  value changes with the scheme is declared in all three blocks, and the
  new shadow token is one of those. Its parser now collapses whitespace in
  values, because a multi-line value carries its block's indentation and
  the two dark blocks are indented differently.
- Nothing else deviates from what phase 4 was asked to build.

## For phase 7, because no automated check will catch it

**Every native form control in `duck-feed.css` renders in the browser's own
default colours and must be brought onto the token layer.** The radio
buttons on the Duck Feed start screen are browser-blue right now. The tier
two rule forbids colour literals outside `tokens.css`, and a UA-default
control colour is not a literal anywhere in the CSS, so it passes every
check while being exactly what the rule exists to prevent. An agent working
from what it can see will restyle the surfaces and leave the controls.

## Verification not done

- **Reduced motion was not observed in a browser.** `--force-prefers-reduced-motion`
  with `--virtual-time-budget` produced byte-identical screenshots, so the
  check was inconclusive rather than passing. What was verified: the built
  stylesheet contains `@media (prefers-reduced-motion:reduce){._mote_wwm6p_64{animation:none}}`
  against the same hashed class the motes render with, and
  `@media print{._ambient_wwm6p_16{display:none}}` likewise. The rules will
  apply; I did not watch them apply.
- Screenshots were taken by forcing `defaultColorScheme` and, for the
  colophon, `useDisclosure(true)`. Both edits were reverted; `git diff` on
  `app-shell.tsx` and `site-footer.tsx` shows no trace. Fresh Chrome
  profiles follow the OS theme, so a clean `--user-data-dir` per capture is
  needed or Mantine's stored scheme leaks between shots.
- The archive filters were not exercised through a real browser, same as
  phase 3.

## Next phase

Phase 5: the thread. `ProjectEntry` already forwards `anchorRef` and renders
the filled/hollow node outside the plate, which is the point the spine
attaches to. The warp runs vertical by construction, so the thread runs with
the cloth rather than across it. Its gate stands: delete the SVG and the
page must remain fully usable and good.
