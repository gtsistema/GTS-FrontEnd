---
name: angular-feature-builder
description: Build Angular features end-to-end with project patterns, clean architecture, and safe validation.
---

# Angular Feature Builder

Use this skill when implementing a new feature or evolving an existing Angular flow.

## Execution rules

1. Follow current project patterns before introducing new structure.
2. Keep components lean; move API/data shaping to services/mappers.
3. Keep functions short and split complex flows into private helpers.
4. Reuse existing design-kit/tokens/classes before creating new styles.
5. Keep payload/response types explicit and aligned with existing types.

## Implementation checklist

- Identify affected route/component/service/mapper files.
- Implement smallest safe change to satisfy requirement.
- Avoid duplicated logic; extract reusable helper when repeated.
- Preserve backward compatibility in existing screens.
- Run build/lint validation after substantial edits.

## Output format

- Summarize what changed, why, and impacted files.
- List validation done (build/lint/test/manual checks).
- Call out any backend dependency or follow-up needed.
