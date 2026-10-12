# House Scanner agent routing

Read AGENTS.md, its required instructions, docs/house-scanner.md and the current work record before implementation. Private product requirements stay in the private planning repository.

Use explicit launcher controls at every launch, including resumed or nested work. On Codex, use fresh context when model overrides require it.

| Role | Model | Effort |
| --- | --- | --- |
| Coordinator, contracts, auth, integration, review | gpt-6.1-sol | high |
| Normal implementation | gpt-6.1-sol | medium |
| Fully specified small leaf | gpt-6-luna | high |
| Narrow documented escalation after two focused failed attempts | gpt-6-astra | high |

Claude continuation mapping: claude-sonnet-5-5 medium for normal work, high for contracts/auth/review; claude-haiku-5-5 medium for specified leaves; claude-opus-5-5 high only for bounded escalations. Verify actual host availability before use. Never launch a separate paid API or CLI solely to mix providers.

Keep at most four active agents including the coordinator. Default workers are leaves. Give each worker a task ID, concrete outcome, base commit/worktree, owned paths, prohibited shared paths, accepted contract version, acceptance examples, permitted checks and stop conditions. Stop dependent edits on contract conflict or absent source rights; report account/secret needs without creating resources.

The coordinator reads each diff, integrates one at a time and records remaining evidence. A worker's report is not verification. Do not add/run behavioral tests unless the user authorizes them. Do not publish, message, spend, delete data or modify unrelated work.

