# Decisions

Append-only. Newest first. Never edit or delete an entry, because the reasoning
behind a decision stays useful even after the decision is reversed. To change a
decision, add a new entry that supersedes the old one.

## What goes here

Only decisions that are expensive to reverse or that someone will question later:

- Choosing a framework, database, protocol, or hosting model
- A data model or API contract that other things now depend on
- Deliberately rejecting the obvious approach
- A constraint that looks like a mistake without the context
- Reversing an earlier decision

Not here: anything a linter enforces, anything obvious from the code, or
day-to-day choices. If nobody would ask "why is it like this?", skip it.

The test is whether an agent or a new developer would otherwise waste time
proposing the alternative you already rejected.

## When to write one

At the moment of deciding, while the alternatives are still fresh. Written a
month later, the rejected options are gone and only the conclusion survives,
which is the least useful part.

Keep each entry to a few minutes of writing. Five honest sentences beat a formal
document nobody writes.

## Format

```markdown
## YYYY-MM-DD Short title
**Decision.** What was decided, in one sentence.
**Why.** The reasoning and the constraint that drove it.
**Instead of.** The alternatives, and why each lost.
**Costs.** What this makes harder or more expensive.
**Revisit if.** The condition that would change this answer.
```

`Revisit if` is what stops a decision from silently becoming dogma. A decision
made for a hundred users should be re-examined at a million, and writing the
trigger down is what makes that happen.

---

<!-- Add new entries directly below this line, newest first. -->
<!-- The entry below is a formatting sample, not a decision. Replace it with your first real one. -->

## 0000-00-00 Sample, replace with your first decision
**Decision.** Store timestamps as UTC everywhere, converting only for display.
**Why.** Mixed timezones in storage caused duplicated records across a DST
boundary, and the bug took a day to find.
**Instead of.** Local time with an offset column, which keeps the ambiguity we
were trying to remove.
**Costs.** Every display path needs an explicit conversion. Easy to forget.
**Revisit if.** We need to preserve the wall-clock time an event was scheduled
in, which UTC alone cannot express.
