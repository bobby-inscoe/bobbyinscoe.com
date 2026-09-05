# Repository skills

These are portable Markdown playbooks for coding agents. They are intentionally independent of Cursor, Claude Code, Codex, VS Code, and any one model provider.

Host integrations may expose these as slash commands or skills. If a host does not support skill discovery, open the relevant `SKILL.md` and follow it manually.

## Available skills

- `plan-first`: classify a request, investigate the relevant code, resolve ambiguity, and obtain plan approval before implementation.
- `spec`: write an approved implementation contract to a temporary, uncommitted artifact.
- `handoff`: write a current-state briefing for another agent or conversation.
- `arena`: compare independent candidates for a non-trivial artifact.
- `architect`: design module boundaries before implementation.
- `blast-radius`: find and prove downstream risks.
- `document`: explain why complex or non-obvious code exists.
- `figure-it-out`: design an auditable workflow for large or ambiguous work.
- `interrogate`: adversarially review a change.
- `refactor`: simplify existing code without changing behavior.
- `unslop`: always-on editing of agent prose and documentation into direct, human language.
