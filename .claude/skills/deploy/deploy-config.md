---
status: local-only
checks:
  - npm run lint
---

# Local Readiness Configuration

Only local application validation is configured for this repository. No release workflow, environment, publication command, or rollback procedure has been defined.

If a release workflow is requested, obtain the target, quality gates, approval requirements, and recovery procedure before adding configuration or running release commands.

Never store credentials, tokens, private URLs, or environment values in this file.
