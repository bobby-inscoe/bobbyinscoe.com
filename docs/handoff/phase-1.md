# Phase 1 handoff: token layer

## Status

Acceptance command, run at the moment of writing (all four parts):

```
$ npm run typecheck
> tsc --noEmit
(exit 0)

$ npx vitest run src/shared/theme
 Test Files  1 passed (1)
      Tests  48 passed (48)
(exit 0)

$ ! grep -rInE '^\s*margin' src --include='*.css' | grep -v 'shared/theme/reset.css'
(exit 0 — nothing found)

$ ! grep -rInE '#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|oklch\(' src --include='*.css' --include='*.ts' --include='*.tsx' | grep -v 'shared/theme/tokens.css'
src/features/duck-feed/components/duck-feed.css:88,92,96,105,119,204,208,286
src/features/duck-feed/utils/avatars.ts:13,14,18,19
(exit 1 — pre-existing, out of scope; see below)
```

The fourth check fails, and it failed before this phase touched anything: those hex literals are Duck Feed's, last modified at `90dc92a` (unrelated to the redesign). Phase 7 is the one that removes them (its own text names `#f4c96b`, `#e8635f`, `#e879f9`), and phase 7's do-not list forbids touching `utils/`, where `avatars.ts` lives. The human reviewed this and accepted phase 1 as done with the exception documented rather than having me narrow the grep or touch Duck Feed early. **The next session that runs this exact command should expect the same failure until phase 7 lands — that isn't a regression.**

`npm run build` also succeeds; fonts bundle as separate route-independent assets, total JS/CSS unaffected by font weight.

## What was built

- `src/shared/theme/tokens.css`: every `--site-*` colour token from both palette tables (light in bare `:root`, dark repeated in the media query and `[data-theme="dark"]`), plus space, radius, duration, easing, breakpoint, and layer tokens. `--site-shadow-overlay` is deliberately absent — see Deviations.
- `src/shared/theme/reset.css`: the only file with a `margin` rule.
- `src/shared/theme/fonts.ts`: side-effect-only `@fontsource` imports for Bricolage Grotesque, Newsreader, and IBM Plex Mono. No exports.
- `src/shared/theme/theme.ts`: `createTheme` (font families, radius keys narrowed to `none`/`control`/`round` via `MantineThemeSizesOverride` module augmentation) and a separate `cssVariablesResolver` export that maps Mantine's semantic colour variables onto `var(--site-*)`. Both are exported; `createTheme`'s return type has no slot for a resolver, so "exports `theme`" in the file tree comment turned out to mean "theme is the primary export," not "the only one."
- `src/shared/theme/tokens.test.ts`: the tier-two design-contract tests — every colour token declared identically in all three blocks, structural token groups have exactly their spec-listed members (catches a stray radius/space/etc. step as a build failure), every ΔL* ≥ 3 within each ramp, and every text/wash token clears its assigned contrast floor. 48 assertions.
- `src/index.css` deleted; `src/index.tsx` now imports `fonts`, `tokens.css`, and `reset.css` directly (its only prior use of `index.css` was this one import).
- Installed at the spec's exact pins: `@mantine/core@9.6.0`, `@mantine/hooks@9.6.0`, `@fontsource-variable/bricolage-grotesque@5.3.0`, `@fontsource-variable/newsreader@5.3.0`, `@fontsource/ibm-plex-mono@5.3.0`.
- Nothing else in `src/` touched. No page, no component, no `MantineProvider` wiring — that's phase 2's `AppShell` rewrite.

## Deviations and notes

- **`--site-shadow-overlay` deferred to phase 4.** The spec names it as "the only shadow token" but gives no literal blur/offset/opacity anywhere, unlike every other token in that table. Raised with the human; the agreed call was to skip it now and define it when the Colophon modal is its first real consumer, rather than invent a value.
- **Font family names are the fontsource ones, not the spec's literal strings.** The spec's own `:root` demo CSS uses `'Bricolage Grotesque'` and `'Newsreader'` (the Google Fonts names). Self-hosting via `@fontsource-variable` declares those faces as `'Bricolage Grotesque Variable'` and `'Newsreader Variable'` instead; using the spec's literal strings would silently fall through to the fallback stack. Verified in the built bundle that the combined-axis `standard.css` files (which carry weight and width/optical-size together, unlike the default `wght`-only import) are what ship.
- **Mantine's spacing, breakpoints, and colour palette are untouched in phase 1.** Only `radius` got a module-augmented three-value scale, because the spec explicitly forbids a fourth radius step and the default scale has one. Spacing/breakpoints/`primaryColor` have no equivalent "do not" rule yet and no component consumes them; leaving Mantine's defaults in place is inert until a later phase picks real components.
- Contrast tests are computed flat (no simulated grain layer) since the spec gives no literal grain-compositing model to replicate; the reasoning and the direction of the resulting slack are documented in `tokens.test.ts`'s file comment.
- Wash-surface contrast (`mark` on `accent-wash`/`state-wash`) has no named floor in the spec's own list; I used 9:1 as a regression-test threshold, comfortably below the spec's own ~10.2–10.5 figures. That's a test-code judgment call, not a design-token value.

## Next phase

Phase 2: shell and route restructure (`AppShell` rewrite with `MantineProvider`, the skip link, the `projects`/`home` feature split, moving Duck Feed under `src/features/projects/features/duck-feed/`). Per `prompts/kickoff.md`'s model table, phase 2 runs on Opus 5 — the route factory generic silently erases the `Link to` union if written as a bare `AnyRoute`.
