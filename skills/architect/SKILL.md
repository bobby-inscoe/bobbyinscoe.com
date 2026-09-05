---
name: architect
description: Design module boundaries, types, and interfaces before implementing significant changes.
---

# Architect

Use this skill for significant changes where implementation could lock in the wrong structure. Skip it for mechanical edits and small, concrete fixes.

1. Ground the problem by reading the affected flow and existing conventions.
2. State the caller's intended usage first.
3. Sketch types, function signatures, module boundaries, and error behavior.
4. Compare at least two structurally distinct designs when the decision is difficult. Use `arena` when independent candidates add signal.
5. Choose the smallest interface that hides the most complexity.
6. Surface deviations during implementation instead of silently bolting on exceptions.
7. Verify the design against the actual code and revise it if implementation friction repeats.

Return the usage sketch, chosen design, rejected alternatives, assumptions, and verification plan.
