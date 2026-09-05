---
name: plan-first
description: Classify a non-trivial request, investigate the relevant repository surface, expose ambiguity, and get confirmation before changing code.
---

# Plan first

Use this as the entry point for a non-trivial feature, bug fix, refactor, chore, or unclear request. The goal is alignment before implementation, not a long planning document.

`plan-first` answers: "What is being requested, what code matters, what is ambiguous, and what should we do next?"

`architect` answers: "Given an understood request, what types, interfaces, module boundaries, and implementation shape should we choose?"

Use `plan-first` before `architect` when both are needed. Do not use `architect` for a straightforward change whose implementation shape is already clear.

Do not modify source code during this skill. You may create or update a task list when the host provides one.

## Phase 1: Explore the repository

Before classifying the request or proposing a solution:

1. Inspect the repository structure and the relevant feature area.
2. Search for related components, hooks, utilities, styles, routes, types, and tests.
3. Find existing implementations that solve a similar problem.
4. Read the closest examples fully, including their consumers and validation.
5. Identify the project's established React and TypeScript structure, naming, export, import, styling, and state-management patterns.

Treat the existing codebase as the default design constraint. Prefer extending or correcting an existing pattern over introducing a new one. Do not propose a new abstraction, folder structure, dependency, or architectural style until you have shown that the existing project patterns cannot support the request.

The repository's current conventions are defined in [`AGENTS.md`](../../AGENTS.md), including the intended bulletproof-React-style organization. Apply those conventions to the investigation and plan. If the repository does not yet have a pattern for the requested behavior, call that out explicitly instead of presenting an invented pattern as established practice.

## Phase 2: Classify the request

Read the user's complete request and classify it as one primary type:

- **Feature:** adds or changes user-visible behavior.
- **Bug fix:** corrects behavior that does not match the intended behavior.
- **Refactor:** changes structure without intentionally changing behavior.
- **Chore:** maintenance, configuration, documentation, or tooling work.
- **Investigation:** answers a question without changing the repository.

If the request combines types, identify the primary type and list the secondary work. Do not use the classification to narrow away explicitly requested behavior.

## Phase 3: Establish scope

1. Translate the request into a short definition of done.
2. Search for the relevant files, symbols, routes, components, styles, tests, configuration, and documentation.
3. Read the affected code and trace the real flow end to end.
4. Search callers, consumers, shared state, serialized formats, and adjacent UI or API boundaries.
5. Check the current repository state and existing validation commands.
6. Look for existing helpers, patterns, or dependencies before proposing new ones.

Use the smallest investigation that can establish confidence. Do not explore unrelated areas just to make the plan look thorough.

## Phase 4: Find ambiguity and risk

Separate findings into:

- **Confirmed requirements:** directly stated or demonstrated by existing behavior.
- **Reasonable assumptions:** needed to proceed but not explicitly decided.
- **Open decisions:** choices with more than one reasonable implementation or UX outcome.
- **Risks:** likely regressions, compatibility concerns, missing validation, or scope expansion.

Ask focused questions for open decisions that materially affect behavior, scope, data, architecture, or acceptance criteria. Ask one question at a time. Do not ask about details that can be safely resolved by existing repository conventions.

Use the host's structured question tool whenever it is available. In VS Code, use the Ask Questions tool or equivalent structured question UI so the developer can choose among clear options. In other hosts, use their equivalent question mechanism. Do not bury an important ambiguity in a long status message or silently choose among materially different options.

When asking a question:

- Explain why the decision matters.
- Prefer a recommended option first when one is clearly safer or more consistent.
- Offer concise, mutually exclusive choices when possible.
- Ask only one decision per question.
- Continue investigating independently while waiting only when the work is safe and does not depend on the answer.
- Record the answer as a decision in the approved plan.

If the host supports the `grill-me` skill, use it for unresolved product or design decisions. Otherwise use the host's structured question tool directly using the same one-at-a-time discipline.

## Phase 5: Select the workflow

Choose only the workflows the request needs:

- `how` for explaining or tracing unfamiliar code.
- `architect` for a significant design or module-boundary decision.
- `blast-radius` for non-obvious downstream effects.
- `arena` when independent candidate designs would materially improve a high-risk decision.
- `figure-it-out` for large or multi-phase work.
- `interrogate` after implementation for adversarial review.

Do not invoke every skill by default. Explain why each selected workflow applies.

## Phase 6: Present the approval gate

Before implementation, present:

### Classification

State the primary request type and any secondary types.

### Definition of done

List the observable outcomes that will make the request complete.

### Relevant code

List the files, symbols, and relationships inspected, with links or paths where the host supports them. Include the existing patterns the proposal follows and explain any deliberate deviation.

### Proposed approach

Describe the smallest implementation approach, affected files, and any reusable code.

### Validation

List the existing commands and manual checks that will prove the change works.

### Assumptions and open questions

Separate assumptions from decisions that need the developer's answer.

### Selected workflows

Name the skills to use next and why.

Then use the host's structured question tool to ask whether the plan is approved. Do not implement until the developer approves, revises, or explicitly tells you to proceed without a confirmation gate.

## After approval

Use the approved plan as the implementation contract. If investigation reveals a material change in scope, behavior, architecture, or risk, stop and present the changed plan for approval again.

Do not invent extra features, cleanup, abstractions, or dependencies because they seem useful. If an adjacent improvement is not required for the definition of done, mention it separately instead of silently adding it.

After the developer approves the plan, invoke `spec` to write the approved contract to the repository's ignored `.notes/` directory before implementation begins. Return the spec path and use it as the implementation contract for the current or next agent. Do not commit the generated spec.
