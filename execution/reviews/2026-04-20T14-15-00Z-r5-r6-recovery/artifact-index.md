# R5-R6 Recovery Artifact Index

- Timestamp: `2026-04-20T14:15:00Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Scope: `Phase 1 blocker triage`

## Artifacts

- `phase-1-triage-report.md`
  - explicit file-level root-cause triage for API type debt, settings regression, and browser/admin failures
- `../phase-b/typecheck/repo-typecheck.log`
  - controlling evidence for the 35 API type errors
- `../phase-b/api/api-tests.log`
  - controlling evidence for `test_settings_loading_uses_typed_settings`
- `../phase-c/playwright/playwright-full-matrix.log`
  - controlling evidence for browser/admin failures, including repeated admin `403` responses and later server collapse
