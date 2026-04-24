---
name: pre-merge-checklist
description: Final quality gate before merge: compile, lint, integration sanity, and risk summary.
---

# Pre-Merge Checklist

Use this skill before finalizing a change set.

## Quality gate

1. Confirm change scope matches requested requirement.
2. Run build and check lint/diagnostics for touched files.
3. Verify key user paths affected by the change.
4. Validate API integrations and permission/route impacts.
5. Ensure no temporary code, stubs, or dead imports were introduced.

## Merge readiness checklist

- [ ] Build passes
- [ ] Lint/diagnostics clean for changed files
- [ ] No obvious regression in adjacent flows
- [ ] Contract changes documented (if any)
- [ ] Follow-up actions listed clearly

## Output format

- Merge readiness status
- What was validated
- Known risks and recommended next steps
