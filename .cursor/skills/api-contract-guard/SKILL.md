---
name: api-contract-guard
description: Protect frontend-backend integration by enforcing endpoint, payload, mapper, and DTO contract consistency.
---

# API Contract Guard

Use this skill for any backend integration, request/response bug, or endpoint migration.

## Contract-first rules

1. Confirm endpoint path and HTTP method before coding.
2. Map frontend model to backend payload explicitly (do not "guess" fields).
3. Update `types` + `mapper` + `service` together in the same change.
4. Do not keep silent fallback behavior that hides contract failures.
5. On ambiguity, surface clear note for backend alignment.

## Validation checklist

- Request payload field names and casing match backend.
- Optional vs required fields are respected.
- Response mapping handles real API shape variations only when needed.
- Error paths show actionable feedback to user.
- Integration compiles and does not regress existing flows.

## Output format

- Endpoint(s) verified
- Payload/response changes
- Risk points and backend actions (if any)
