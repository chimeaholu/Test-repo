# R7 Deploy Attempt Report (Token: d2a71145-ab37-472f-b5eb-0afe8a617529)

- Timestamp (UTC): `2026-04-20T23:12:24Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- R6 gate status: `PASS` (`40/40` matrix previously verified)
- Deployment decision: `NO-GO`

## Objective

Execute canary-first promotion and then production deployment per the R7 runbook.

## Execution commands

```bash
RAILWAY_TOKEN='d2a71145-ab37-472f-b5eb-0afe8a617529' npx -y @railway/cli@latest --version
RAILWAY_TOKEN='d2a71145-ab37-472f-b5eb-0afe8a617529' npx -y @railway/cli@latest whoami
RAILWAY_TOKEN='d2a71145-ab37-472f-b5eb-0afe8a617529' npx -y @railway/cli@latest project list --json
RAILWAY_TOKEN='d2a71145-ab37-472f-b5eb-0afe8a617529' npx -y @railway/cli@latest status --json
```

## Provider responses

- CLI version: `railway 4.40.0`
- `whoami`: `Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.`
- `project list --json`: `Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.`
- `status --json`: `Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.`

## Result

Metadata discovery failed again, so canary and production deployment execution could not start.

- canary deploy id: `N/A`
- production deploy id: `N/A`
- canary URL: `N/A`
- production URL: `N/A`
- smoke/click-through assertions: `N/A`
- new deployment screenshots: `N/A`
- rollback pointer: `unchanged` (no new deployment)

## Missing identifiers / access needed

- valid Railway token with workspace access
or
- explicit:
  - project ID/name
  - service ID/name
  - canary environment ID/name
  - production environment ID/name
  - exact deploy API/CLI invocation for both environments
