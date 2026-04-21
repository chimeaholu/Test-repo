# R7 Promotion Execution Report

- Timestamp (UTC): `2026-04-20T17:31:13Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Candidate: `cd254ff7` lane
- R6 gate posture in this run: `PASS` (full production-mode Playwright matrix)
- Promotion decision: `BLOCKED (external deploy auth)`

## R6 PASS verification used for release authorization

Validated artifacts:

- `execution/reviews/2026-04-20T16-35-00Z-r6-phase5-remediation-cd254ff7/phase-d/full-matrix/results.json`
- `execution/reviews/2026-04-20T16-35-00Z-r6-phase5-remediation-cd254ff7/phase-d/playwright-full-matrix.log`
- `execution/reviews/2026-04-20T16-35-00Z-r6-phase5-remediation-cd254ff7/phase-d/full-matrix/screenshots/`

Verified matrix status:

- total tests: `40`
- passed: `40`
- unexpected: `0`
- flaky: `0`

## Canary-first execution attempt

Attempted deployment provider access check:

```bash
npx -y @railway/cli@latest --version
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest whoami
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest status --json
```

Observed result:

- `railway 4.40.0`
- auth response: `Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.`

Runtime token present:

- `RAILWAY_TOKEN=dd5d8486-07df-4cb9-86ea-ae42d94b980b`

Conclusion:

- canary deployment could not be executed
- production promotion is not permitted because canary cannot be established

## Deployment IDs / URLs / smoke / screenshots

Because provider auth failed before deploy operations, no new live promotion identifiers exist for this run:

- canary deploy id: `N/A (auth blocked)`
- canary URL: `N/A (auth blocked)`
- production deploy id: `N/A (auth blocked)`
- production URL: `N/A (auth blocked)`
- canary smoke assertions: `N/A (auth blocked)`
- production smoke assertions: `N/A (auth blocked)`
- new canary/production screenshots: `N/A (auth blocked)`

Last known prior staging evidence (carry-forward only, not a new promotion):

- deploy id: `0166fb61-9a7e-4973-b062-106309bd0cb5`
- URL: `https://web-staging-29cd.up.railway.app`
- evidence: `execution/reviews/2026-04-18-staging-expanded-validation/railway_deploy_review.json`

## Rollback evidence posture

No live promotion occurred in this run, so rollback was not invoked.

- rollback pointer: `unchanged / no new deploy`
- rollback execution id: `N/A`
- rollback smoke: `N/A`

## Final deployment decision

`NO-GO` for canary and production in this run due solely to external deployment authorization failure, despite a green R6 matrix.

## Exact unblock criteria

1. Provide deploy credentials with confirmed access to the target Railway project/workspace.
2. Confirm the canary and production environment coordinates (project, service, environment names).
3. Re-run canary-first promotion and capture:
   - deploy ids
   - URLs
   - smoke assertions
   - screenshot pack
   - rollback pointer
