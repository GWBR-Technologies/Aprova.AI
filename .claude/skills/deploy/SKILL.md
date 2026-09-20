---
name: local-readiness
description: Verify the local readiness of the Expo application without publishing or creating remote resources.
disable-model-invocation: true
---

# Local Readiness Workflow

Read `deploy-config.md` before doing anything else.

## Current Scope

This repository has only local development commands configured. This skill verifies local quality and application startup readiness; it does not release, publish, or create remote resources.

## Readiness Checks

Run only checks that exist in `package.json` and are relevant to the change:

1. `npm run lint`
2. `npm run web`, `npm run ios`, or `npm run android` when the affected platform and a local target are available

There are no configured type-check, test, end-to-end, or production-build scripts. Do not invent those scripts.

## Output Contract

Report:

- each command and its result;
- skipped commands and why;
- local blockers;
- whether the changed application path is locally ready to validate.

State clearly that release configuration has not been defined when that is relevant to the request.
