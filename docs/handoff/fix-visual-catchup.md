# Handoff: fix/visual-catchup

Not a phase. A repair branch cut from `redesign` at `1f03068`, after the first
browser pass anyone had run since the rebuild started. Phase 5 branches from
`redesign` after this merges.

## Status

Run at the moment of writing, on the branch tip.

```
$ npm run typecheck
> tsc --noEmit
(exit 0)

$ npm run check
> biome check .
Checked 83 files in 30ms. No fixes applied.
(exit 0)

$ npx vitest run
 Test Files  4 passed (4)
      Tests  151 passed (151)
(exit 0)

$ npm run build
✓ built in 446ms
(exit 0)
```

Test count went 72 to 151. The new ones are the colour-literal scan (one case
per source file) and the 404's four render-smoke cases.

## The one thing phase 5 must know: the ambient layer moved

`--site-layer-ambient` changed from `-1` to `100`. The ambient element now
paints **over** content, not behind it.

This was a spec error, ruled on by the human, not an implementation defect. The
palette was verified by a script that composites the grain over every colour
before measuring, so the published contrast figures describe an overlay, while
the spec's layer table described an underlay. Measured on the homepage before
the move: the grain lifted the dark ground from `#10171c` to `rgb(21,27,32)`
while leaving the opaque plate at its token value, cutting the ground-to-raised
step from delta-L\* 3.09 to **1.00**, well under the floor of 3.

Layer order as it now stands, lowest first:

| z-index | what |
|---|---|
| auto / 0 | all page content, including plates |
| 10 | `--site-layer-raised`, unused |
| 100 | the skip link, then the ambient layer (grain and motes) |
| 200 | Mantine's own modal |
| 300 | Mantine's own popover, which is the Select dropdown |

100 is the only step on the scale above every content layer and below Mantine's
overlays, so portalled things stay clear of the grain. The ambient element is
later in the DOM than the skip link, so the grain passes over that too, which is
correct: the grain belongs to the whole printed image.

`pointer-events: none` on `.ambient` is now load-bearing rather than tidy. It
inherits to the texture and the motes. Anything phase 5 adds to that layer must
keep it.

**The thread is not an ambient-layer element.** It anchors to entry nodes in the
document and must sit under the grain like everything else it belongs to. Do not
put `ThreadSpine` inside `.ambient`.

### The three measurements the ruling asked for

Sampled from rendered pixels on `/`, 37,170 ground pixels and 22,302 plate
pixels, at 1440.

| | dark | light |
|---|---|---|
| ground to plate delta-L\*, tokens alone | 3.09 | 3.81 |
| ground to plate delta-L\*, grain composited | **2.98** | **3.74** |
| muted 11px tier on the plate, grain composited | 5.62:1 | 5.41:1 |

Muted metadata clears 4.5 on both grounds with room. No haze over text: checked
at 4x magnification, the 11px letterforms are clean in both schemes.

Light barely moved, 3.81 to 3.74, and clears 3.

Dark lands at 2.98, **0.016 under the floor**, and that is open. It is not a
tuning error and no value can be nudged to fix it, because it is arithmetic: an
overlay at alpha *a* scales a ramp step by roughly (1 - *a*), so at grain 0.055
any token step below about 3.22 cannot clear 3 once composited. The dark ramp's
ground-to-raised step is 3.09, its tightest. Composited, every other adjacent
pair in that ramp still clears 3; only this one and `surface` to `surface-hover`
(2.99) fall under, and the second pair never appears on a page today.

The token ramp still clears 3 and the tier-two test still checks the tokens, so
nothing is failing. What is unresolved is whether the floor is meant to apply to
the declared ramp or the composited render, because under an overlay both cannot
hold at once. Grain opacity and palette values were not touched and are not
ours. Raised with the human; awaiting a ruling.

## What else changed, one commit each

| Commit | Was |
|---|---|
| `544834c` ambient layer above content | see above |
| `e79f346` `--site-shadow-raised` | light had no elevation shadow anywhere; only the overlay token existed, and that one is modals and popovers only |
| `730dc3b` Mantine component layer onto tokens | the archive's Selects rendered stock in both schemes |
| `544e7ed` one focus model | one designed focus rule existed, on the colophon button |
| `ab2c7de` archive table scrolls | `width: 100%` with no floor meant `.scroller` never engaged |
| `a29cfed` brand colours and a wider literal check | `index.html` and `manifest.json` carried pre-rebuild colours |
| `3c248ec` the 404 | unowned by any phase, rendered a bare paragraph |
| `d5d5a26` placeholder entries | see the warning below |

Two of these have consequences past their own diff.

**`--site-shadow-raised` sets a rule, not an exception.** Depth tokens in this
system are a different effect per scheme, because a shadow on near-black is
muddy and a luminance step on paper is invisible. Light is a modest two-layer
drop shadow; dark is the 1px inset top highlight the depth table names. `Plate`
reads the token and no longer branches on scheme itself. Apply it to raised
surfaces, never to an entry row. Verified: across every route and scheme, the
only shadows on the page are this one on plates and the overlay on the modal.

**The focus model is one rule in `reset.css`**, a 2px accent outline at 2px
offset. `outline-offset` rather than a ring token, so the gap shows whatever
surface is behind the element. Accent rather than state, because state means
project lifecycle here, which also means the ring inherits a project's accent on
its own page, intentionally. The rule names Mantine's stable input class as a
second selector because Mantine writes `outline: none` at higher specificity;
that is the same rule, not a second model. Phase 5 wires focus as one of the
thread's three illumination inputs and can now rely on it.

## Warning: the registry contains placeholders

`d5d5a26` added three in-progress entries called Placeholder One, Two and Three.
They exist so phase 5 has more than one node to run a thread between, and so the
hollow node, the null-route branch and the archive filters are exercised against
real data.

**They are not Bobby's projects and must not ship.** Which in-progress entries
really exist is still his call and has not been made. They are alone in their
commit, so removing them is a revert. Do not let this branch reach `main`
without replacing or removing them.

They do make two spec rules observable in a browser for the first time: a
null-route entry renders its title as plain text rather than a link, and an
in-progress entry renders as a bare text row with a hollow node rather than a
plate. Confirmed for all three.

## Clarification, so it is not re-litigated

The spec's "an in-progress entry with a null route renders as a paragraph rather
than a link" means only the second half. Text in the heading and a `span` in the
table row is correct. The code was already right; no change was made.

## Known and deliberately not fixed

- **The rest of Duck Feed is phase 7.** Its CSS still references `--secondary`,
  `--primary` and friends, which died with `src/index.css` in phase 1, so
  `.Button` renders with no chrome and the radios are browser-blue. Off-scale
  type at 30px, 27.2px, 13.6px and 12.8px, and radii of 8px, 10px and 12px.
  Only one line was touched in that file: the dead `.Button:focus-visible`
  rule, which referenced an undefined variable and therefore invalidated the
  whole declaration, actively removing the focus ring from the game's primary
  button. Everything else stands.
- **Archive density.** The five columns spread across the frame because there is
  one live row. A column layout tuned against that would be wrong against five.
  The mechanism was fixed; the judgment waits for content.
- **`ProjectFrame`'s back link renders 15px/400.** It declares no `font`, so it
  inherits Mantine's body weight rather than the `ui` role's 500. Noticed during
  the second pass, outside the ruling's scope, not fixed. Phase 3 owns it.
- **`ProjectFrame` does not force a colour scheme** for application and immersive
  modes. Carried over from phase 3's handoff, unchanged.

## What no static check can catch

The Mantine defect passed every grep and every test while rendering pure white
on a kinari ground, because the literals live in a dependency's stylesheet. The
colour-literal check is now a real test and covers `index.html` and `public/` as
well as `src/`, which closes the three defects that scope missed, but it will
never see inside `node_modules`. That class is the browser pass's job, and the
browser pass is the reason any of this was found.
