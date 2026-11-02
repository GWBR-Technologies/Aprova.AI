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

The backend uses Vitest: run `npm test` inside `backend/`. Integration tests in `backend/test/integration/` run only when `TEST_DATABASE_URL` and `TEST_REDIS_URL` point to disposable instances, and are skipped otherwise; report them as unverified when skipped. The app at the repository root has no test runner: do not claim Jest, end-to-end, or browser-automation coverage exists, and do not add a test dependency without approval.

When a test framework is explicitly introduced, add focused coverage for observable behavior, validation, failure recovery, and platform-specific behavior affected by the change.

## Local Validation

Run the narrowest available check first. In `backend/`, use `npm run typecheck`, `npm run lint`, and `npm test`. The app at the root defines no lint, type-check, or test script; type checking there can be run manually with `npx tsc --noEmit` and must be reported as a manual check. Use `npm run web`, `npm run ios`, or `npm run android` only when relevant to the changed platform and a local target is available.

If a command is unavailable, fails because of unrelated existing work, or cannot run locally, report that fact clearly and state what remains unverified.
