---
name: document
description: Add focused documentation to complex or non-obvious code by explaining why it exists, not restating what the code does.
---

# Document

Use this skill for a specific file or small set of files already in context. The goal is to reduce the time needed to understand non-obvious decisions. Do not add comments merely because a file is long.

## Explore

1. Read the target file completely.
2. Inspect its callers, consumers, parent and child components, related hooks, types, styles, and configuration when they affect the reasoning.
3. Identify the behavior or constraint that a future reader could not infer reliably from the code.
4. Find existing documentation and comment conventions in the surrounding feature.

## Document

Add only concise comments or documentation that explain:

- Why the code exists.
- Why this approach was chosen over an obvious alternative.
- Which external, browser, lifecycle, compatibility, or domain constraint shapes the implementation.
- Which invariant must remain true.

Do not document obvious control flow, restate names, narrate assignments, or add speculative explanations. Do not change behavior, add error handling, refactor, or introduce unrelated cleanup.

## Output

Before editing, state the specific understanding gap and the proposed documentation. If the rationale is already clear from the code and surrounding context, make no changes and say so. After editing, report the file, the documented rationale, and the validation performed.
