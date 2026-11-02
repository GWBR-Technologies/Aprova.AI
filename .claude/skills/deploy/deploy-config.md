---
status: local-only
checks: []
---

# Local Readiness Configuration

This skill covers local application validation only. Releases are handled by the GitHub Actions workflows in `.github/workflows/` (`promote-production.yml`, `mobile-build.yml`) and by `infra/`, described in `docs/IMPLEMENTACAO-DEVOPS.md`; they require explicit user approval and must never be run or triggered by this skill.

If a release workflow is requested, obtain the target, quality gates, approval requirements, and recovery procedure before adding configuration or running release commands.

Never store credentials, tokens, private URLs, or environment values in this file.
