---
name: interrogate
description: Adversarially review a change for correctness, security, maintainability, and blind spots.
---

# Interrogate

Use this skill when asked to stress-test a change, find blind spots, or perform an independent review. Do not automatically modify the code.

## Review

1. Identify the exact diff and the intended outcome.
2. State the intent in one clear paragraph.
3. Trace changed symbols, callers, consumers, data formats, and failure paths.
4. Look beyond grep: inspect timing, lifecycle, configuration, external libraries, and downstream consumers where relevant.
5. Separate confirmed risks from possibilities. Cite real files and lines.
6. Prove important findings with the smallest real test, script, reproduction, or build check.
7. If the host supports independent reviewers, run several with the same scope and rubric. Otherwise perform the review in separate passes and say so.

## Output

### Intent

State what the change is meant to accomplish.

### Findings

For each finding, include severity, file and line, failure mode, confidence, and the cheapest proof or fix.

### Cleared

List risks that were checked and why they do not apply.

### Verification

Report commands or reproductions that ran. Mark unproven claims as unproven.
