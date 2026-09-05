# Engineering standards

Always loaded. Authoritative once filled in. This file is the one you edit per
project. Replace every `FILL IN` before relying on this system. Delete rules that
do not apply rather than leaving them aspirational, because a rule nobody enforces
teaches agents that rules are optional.

**While `FILL IN` markers remain, this file is not authoritative, it is a
questionnaire.** An agent that finds them should ask the developer for the values
its current task needs instead of inventing them. The generic rules below still
apply. The blanks are the parts only the developer can answer.

## Stack

- Language and version: `FILL IN`
- Runtime and version: `FILL IN`
- Package manager: `FILL IN`
- Test runner: `FILL IN`
- Formatter and linter: `FILL IN`

Version constraints that agents keep getting wrong belong here. If a library is
installed but must not be used, or a major version changed the API an agent was
trained on, say so explicitly:

- `FILL IN, for example: react-router v5 is installed. Use useHistory and Switch, not v6 patterns.`

## Commands

Agents run these instead of guessing. Keep them accurate. A wrong command here
costs more than a missing one.

```bash
# install
FILL IN
# run locally
FILL IN
# test (whole suite)
FILL IN
# test (single file)
FILL IN
# lint and format
FILL IN
# typecheck
FILL IN
# build
FILL IN
```

Prefer the narrowest command that covers the change. Run the full suite before
declaring a task complete, not after every edit.

## Architecture

Organize by feature, not by file type. A feature owns its own components, data
access, types, and tests, so that deleting a feature is deleting a directory.

```
src/
  features/
    <feature>/        everything for one feature, self-contained
  shared/             used by two or more features
  lib/                third-party wrappers and adapters
```

Dependencies point one way. Features may use `shared` and `lib`. Nothing in
`shared` may import a feature. When two features need the same thing, move it to
`shared` in its own change, before the change that needs it.

Feature-to-feature imports are the thing to watch. One is a shortcut, five is a
tangle that cannot be unpicked. If feature A needs feature B, either the shared
part moves to `shared` or A and B are one feature.

Project-specific boundaries go here:

- `FILL IN, for example: components never call the network directly, they call hooks, hooks call the API layer.`

## Naming

- Files and directories: `FILL IN, for example: kebab-case`
- Types and components: `FILL IN, for example: PascalCase`
- Functions and variables: `FILL IN, for example: camelCase`
- Constants: `FILL IN`
- Tests: `FILL IN, for example: <name>.test.<ext> beside the file it tests`

Say it in one line and be consistent. Consistency matters more than which
convention you picked, and agents match surrounding code well when the
surrounding code agrees with itself.

No barrel files that re-export a directory. They hide dependencies, slow tooling,
and turn one import into a graph.

## Code

Write the boring version. Optimize for the person reading this in a year with no
memory of why it exists, because that person is usually you and sometimes an
agent with no context at all.

- Name things for what they mean, not what they hold. `pendingInvites` beats `data2`.
- Handle the error case near where it happens, or let it propagate deliberately.
  Never swallow an error to keep output clean.
- Make invalid states unrepresentable when the type system allows it. That
  removes whole categories of test.
- Validate data at the boundary where it enters the system. Inside the boundary,
  trust your own types.
- No dead code, no commented-out code, no speculative abstraction for a second
  case that does not exist yet.
- Comment why, never what. If a comment restates the code, delete it. If the code
  needs a comment to be understood, first try to make the code clearer.

## Types

- `FILL IN: is the strict mode of your language enabled? Say so here.`
- Never use an escape hatch (`any`, `unknown` casts, `@ts-ignore`, reflection) to
  silence an error you have not understood. If one is genuinely required, it needs
  a comment explaining why, on the line above.
- Derive types from a single source of truth rather than duplicating a shape in
  two places that can drift apart.

## Tests

Test what breaks. Do not chase a coverage number, because coverage measures lines
executed, not behavior checked.

- Test behavior through the public surface, not internal implementation. A test
  that breaks on every refactor is a liability.
- Every bug fix gets a test that fails before the fix and passes after. Verify
  both directions. A regression test you never watched fail proves nothing.
- Test the edges: empty, one, many, null, boundary values, and the failure path.
  The happy path is the least likely thing to break.
- Mock only what you do not own, like network and clock. Mocking your own code
  means the test asserts your assumptions rather than reality.
- A test with no assertion is not a test.

What must be tested in this project:

- `FILL IN, for example: anything touching money, auth, or persisted data.`

## Dependencies

Adding one is a permanent decision, so treat it like one. Before adding, check
whether the standard library or an existing dependency already does it. Prefer a
few lines you own to a package you do not.

Adding a dependency needs approval. Say what it does, what it weighs, and what
you would do without it.

## Security

- Never commit secrets. Configuration comes from the environment.
- Never log credentials, tokens, or personal data.
- Parameterize every query. No string-built SQL.
- Validate and encode anything that came from a user before it reaches a
  database, a shell, or a page.
- Authorization is checked on the server, on every request. A hidden button is
  not a permission check.
