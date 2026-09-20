---
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "__tests__/**/*.{ts,tsx}"
---

# Testing Rules

## General

- Test observable behavior and public contracts, not implementation details.
- Add or update tests whenever behavior changes.
- For a reproducible bug, add a failing regression test before or with the fix.
- Keep tests deterministic, independent, and readable.
- Do not weaken assertions, delete coverage, increase arbitrary timeouts, or skip tests to make a change pass.

## Project Status

No test runner or test script is currently configured. Do not claim Jest, end-to-end, or browser-automation coverage exists, and do not add a test dependency without approval.

When a test framework is explicitly introduced, add focused coverage for observable behavior, validation, failure recovery, and platform-specific behavior affected by the change.

## Local Validation

Run the narrowest available check first. The repository currently defines `npm run lint`; use `npm run web`, `npm run ios`, or `npm run android` only when relevant to the changed platform and a local target is available.

If a command is unavailable, fails because of unrelated existing work, or cannot run locally, report that fact clearly and state what remains unverified.
