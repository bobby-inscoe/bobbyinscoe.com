---
name: handoff
description: Create a portable temporary briefing so another agent or conversation can safely continue work already in progress.
---

# Handoff

Use this skill when an agent is stopping, changing models, changing hosts, or transferring unfinished work. A handoff describes the current state. It is not a future implementation plan, although it may link to a `spec` artifact.

## Storage

Write the briefing in the repository-root `.notes/` directory. This directory is ignored by Git and is intended for local, temporary planning artifacts. Never commit the generated handoff.

Use a descriptive filename ending in `-handoff.md`, such as `.notes/duck-feed-handoff.md`, and return the exact path. Keep handoffs directly under `.notes/`; do not create a separate handoffs subdirectory.

## Investigate

Inspect the actual repository and worktree before writing:

- Current branch and worktree status.
- Recent commits and the relevant diff.
- Files changed and files intentionally untouched.
- Validation commands run and their results.
- Current blockers, failed attempts, and unresolved decisions.
- Temporary artifacts, spec paths, and important external references.

Do not rely on memory or the previous agent's summary when the repository can verify the fact.

## Contents

Write:

0. **Artifact metadata:** artifact type (`handoff`), generated date, repository, branch, and status (`active`, `blocked`, or `complete`).
1. **Objective:** what the work is meant to accomplish.
2. **Current state:** what is complete and what is not.
3. **Repository state:** branch, diff, and relevant files.
4. **Decisions:** approved choices and rejected alternatives.
5. **Next steps:** ordered, concrete actions.
6. **Validation:** commands run, outcomes, and remaining checks.
7. **Risks and open questions:** only unresolved items.
8. **Continuation instruction:** the first file or command the next agent should inspect.

Distinguish verified facts from assumptions. Preserve failed approaches when they prevent the next agent from repeating them. Do not add new scope or rewrite the plan while creating the handoff.

## Output

Return the artifact path and a concise status summary. The next agent should be able to read the handoff and continue without needing the original conversation.
