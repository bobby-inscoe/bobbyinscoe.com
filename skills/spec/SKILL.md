---
name: spec
description: Write an approved implementation plan as a portable temporary contract for another agent or later conversation.
---

# Spec

Use this skill after the request has been investigated and the developer has approved the plan. A spec is an implementation contract, not a new source of truth for requirements and not a project document.

## Storage

Write the artifact in the repository-root `.notes/` directory. This directory is ignored by Git and is intended for local, temporary planning artifacts. Never write generated specs under `docs/`, `skills/`, or a generated output directory, and never commit them.

Use a descriptive filename ending in `-spec.md`, such as `.notes/duck-feed-spec.md`, and return that exact path to the developer. Keep specs directly under `.notes/`; do not create a separate specs subdirectory.

## Contents

Include:

- **Artifact metadata:** artifact type (`spec`), generated date, repository, branch, and status (`approved`, `in progress`, or `stale`).
- Request and classification.
- Definition of done and acceptance criteria.
- Relevant files, symbols, and existing patterns inspected.
- Approved approach and affected files.
- Explicit non-goals and scope boundaries.
- Assumptions and resolved decisions.
- Validation commands and manual checks.
- Risks, rollback notes, and unresolved questions.
- A short next-agent instruction explaining where to start, what to read first, and what not to change.

Write concrete instructions another agent can follow without rereading the entire planning conversation. Preserve links, paths, commands, and decisions. Do not invent requirements that were not approved.

## Output

Return the artifact path, a one-paragraph summary, and any unresolved items. If the spec is stale because the repository changed, do not silently update it. Mark it stale and ask whether to regenerate it.
