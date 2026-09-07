# Phase 0 handoff: settle the record

## Status

Acceptance command, run at the moment of writing:

```
$ npx vitest run && node -e "process.exit(require('./package.json').engines.node==='>=22.12.0'?0:1)"

 RUN  v5.0.0 E:/Code Projects/bobbyinscoe

No test files found, exiting with code 0

include: **/*.{test,spec}.?(c|m)[jt]s?(x)
exclude:  **/node_modules/**, **/.git/**
```

Exit code 0. `npm run typecheck` also passes clean.

## What was built

- Four entries added to `docs/decisions.md` (newest first): the margin ruling, Duck Feed moving off `/`, self-hosted fonts superseding Google Fonts, Mantine 9 superseding shadcn.
- `docs/architecture.md`: shadcn references replaced with Mantine, Google Fonts row removed, Duck Feed's position at `/` reframed as a placeholder rather than a decision.
- Vitest 5.0.0, `@testing-library/react` 16.3.3, and `jsdom` 30.0.1 installed as devDependencies at the spec's pinned versions (`--save-exact`).
- `vitest.config.ts` added at the repo root: jsdom environment, `passWithNoTests: true` since no test files exist until phase 1. Added to `tsconfig.json`'s `include` alongside `vite.config.ts`.
- `package.json`: `engines.node` bumped to `>=22.12.0`; added a `test` script (`vitest run`).
- Nothing in `src/` touched.

## Deviations and notes

- The branching plan (integration branch `redesign`, phase branches PR'd into it) hit a git ref-naming conflict: a branch can't be named `redesign` and also prefix branches named `redesign/phase-N-...`, because git refs are paths. Resolved per the human's choice: phase branches are `phase/<n>-<slug>` instead, still PR'd into `redesign`. This phase's branch is `phase/0-settle-the-record`.
- Pushing `redesign` triggered the pre-push Biome hook, which reformatted two pre-existing files (`prompts/ink-and-fibre-spec.html`'s `!important` warnings — left as warnings, not errors; `src/features/duck-feed/components/duck-feed.css` line endings) and folded the fix into the branch tip commit before the push succeeded. This predates and is unrelated to any phase 0 work; content is unchanged, only the commit hash differs from `origin/main`'s. Expected per the human's note in the kickoff instructions.
- `prompts/` remains untracked in git, as it was before this session started. Out of scope for phase 0; flagging in case it should be committed separately.
- No colour/grain/type-size values were touched. No dependency beyond the three pinned test packages was added.

## Next phase

Phase 1: token layer (`src/shared/theme/tokens.css`, `reset.css`, `fonts.ts`, `theme.ts`, deletion of `src/index.css`, and the tier-two design-contract tests). Per the model-assignment table in `prompts/kickoff.md`, phase 1 runs on Sonnet 5.
