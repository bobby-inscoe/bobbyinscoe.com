---
name: blast-radius
description: Find what a change could break beyond its diff and prove the key safety fact before shipping.
---

# Blast radius

Use this skill before shipping changes with non-obvious callers, formats, lifecycle behavior, or downstream effects.

1. Read the complete diff and surrounding flow.
2. Find the one fact the change is safe because of.
3. Follow what grep misses: runtime order, external library behavior, serialized data, feature flags, and downstream consumers.
4. Give each real risk a failure mode, location, likelihood, impact, and proof.
5. Prove the key fact with a real test, script, reproduction, or running application. If that is not possible, mark it unproven.
6. Use `arena` only for genuinely wide or high-risk changes.

Return what changed, the safety fact and proof level, confirmed risks, cleared risks, and the cheapest pre-merge check.
