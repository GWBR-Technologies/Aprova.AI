---
paths:
  - "src/**/*.{ts,tsx}"
---

# Data and Device Boundary Rules

## Current Scope

The repository has no implemented data service, device protocol, authentication flow, or server route.

Do not introduce a network service, device integration, telemetry, account flow, or persistence layer without an explicit request and a defined local contract. Keep sensor and measurement details separate from rendering code once those contracts exist.

## Input and Measurement Data

- Validate user-entered values and values received at an application boundary before they affect UI state or calculations.
- Model units, timestamps, ranges, source, and validity explicitly when a measurement feature is introduced.
- Do not infer clinical meaning, safety thresholds, calibration behavior, or sensor capabilities from the app name.
- Keep displayed values distinct from editable drafts and loading or error states.

## Failures and Tests

- Provide an understandable recovery action for unavailable data, invalid measurements, denied permissions, or interrupted work.
- Do not expose implementation details, identifiers, tokens, or raw failure payloads to users.
- Test successful, invalid, absent, and failure cases for a newly introduced boundary.
