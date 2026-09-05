---
name: arena
description: Compare independent candidates for a non-trivial design or artifact, then synthesize and verify the strongest result.
---

# Arena

Use this skill only when one attempt could lock in the wrong shape. Do not use it for routine edits.

## Phase 1: Frame

1. State the artifact being produced.
2. Define three to six concrete, gradeable success criteria.
3. Choose the number of candidates based on the decision risk. Two candidates are usually enough.
4. Give every candidate the same task, context, rubric, and an isolated output location.

## Phase 2: Fan out

Run candidates in parallel when the host supports independent sub-agents. Otherwise run them sequentially and preserve separate outputs. Each candidate must provide the artifact and a short rationale describing alternatives considered and rejected.

## Phase 3: Judge

Read every candidate fully. Score each against the rubric. Prefer the candidate with the clearest boundary, smallest surface area, and easiest future maintenance. Do not choose by familiarity or verbosity.

## Phase 4: Synthesize

Use one candidate as the base. Graft only ideas that improve it, and rewrite them into one coherent design. Record the base, grafts, rejected ideas, and any candidate that failed to produce an output.

## Phase 5: Verify

Check the synthesized artifact against every success criterion and run the smallest real validation available. A plausible writeup is not verification. If the host cannot run the required check, mark the result unverified.

## Output

Return the rubric, candidate summaries, chosen base, grafts, rejections, and verification result.
