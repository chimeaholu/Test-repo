# R7 Deploy Attempt Report (Token: 92a85431-8fc0-4139-99d1-d71e71ede9ef)

- Timestamp (UTC): `2026-04-20T22:57:11Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- R6 gate status: `PASS` (`40/40` matrix previously verified)
- Deployment decision: `NO-GO`

## Objective

Execute canary-first promotion and then production deployment per the R7 runbook, publishing full deployment evidence and rollback pointer.

## Execution commands

```bash
RAILWAY_TOKEN='92a85431-8fc0-4139-99d1-d71e71ede9ef' npx -y @railway/cli@latest --version
RAILWAY_TOKEN='92a85431-8fc0-4139-99d1-d71e71ede9ef' npx -y @railway/cli@latest whoami
RAILWAY_TOKEN='92a85431-8fc0-4139-99d1-d71e71ede9ef' npx -y @railway/cli@latest project list --json
RAILWAY_TOKEN='92a85431-8fc0-4139-99d1-d71e71ede9ef' npx -y @railway/cli@latest status --json
```

## Provider responses

- CLI version: `railway 4.40.0`
- `whoami`: `Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.`
- `project list --json`: `Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.`
- `status --json`: `Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.`

## Result

Metadata discovery failed, so canary and production deployment execution could not start.

- canary deploy id: `N/A`
- production deploy id: `N/A`
- canary URL: `N/A`
- production URL: `N/A`
- smoke/click-through assertions: `N/A`
- new deployment screenshots: `N/A`
- rollback pointer: `unchanged` (no new deployment)

## Exact missing identifiers / access needed

To proceed with canary-first then production promotion, one of the following is required:

1. A valid Railway token with workspace access, which allows discovery of:
   - project ID/name
   - service ID/name
   - canary environment ID/name
   - production environment ID/name
2. Or direct provisioning details supplied externally:
   - project ID
   - service ID
   - canary environment ID
   - production environment ID
   - exact deploy command/API for canary
   - exact deploy command/API for production

## Commit provenance note

This task environment is not attached to live `.git` metadata, so release commit SHA cannot be independently resolved via `git rev-parse` here. Candidate provenance remains evidence-bound to the `cd254ff7` lane and R6 PASS artifacts.
