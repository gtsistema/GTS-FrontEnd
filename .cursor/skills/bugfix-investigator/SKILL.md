---
name: bugfix-investigator
description: Diagnose and fix bugs with root-cause focus, minimal-risk changes, and regression prevention.
---

# Bugfix Investigator

Use this skill when behavior is broken, inconsistent, or regressing.

## Investigation flow

1. Reproduce and define expected vs actual behavior.
2. List likely causes, then narrow to most probable root cause.
3. Inspect related component/service/mapper/guard state flow.
4. Apply minimal safe fix to root cause (not only symptom).
5. Re-test main scenario + nearby regressions.

## Guardrails

- Avoid broad refactors during bugfix unless strictly required.
- Preserve existing contracts and UI behavior.
- Avoid introducing new frameworks/patterns for simple fixes.
- Keep logs/debug artifacts out of final commit unless requested.

## Output format

- Root cause found
- Fix implemented
- Regression checks executed
- Remaining risks/assumptions
