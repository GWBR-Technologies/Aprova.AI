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

Tests run with `npm test` (`jest-expo` and `@testing-library/react-native`). Do not claim end-to-end, device, or browser-automation coverage exists, and do not add a test dependency without approval.

Add focused coverage for observable behavior, validation, failure recovery, and platform-specific behavior affected by the change. Query by role and accessible label (`getByRole`), not by test ID. Core modules take their dependencies by injection (HTTP, SQLite, clock), so test them without mocking modules.

## Local Validation

Run the narrowest available check first. The repository defines `npm run lint`, `npm run typecheck`, and `npm test`; run the ones that apply and report each result. Use `npm run web`, `npm run ios`, or `npm run android` only when relevant to the changed platform and a local target is available.

If a command is unavailable, fails because of unrelated existing work, or cannot run locally, report that fact clearly and state what remains unverified.
