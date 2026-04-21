# Manual Browser Verification

- Timestamp: `2026-04-20T15:27:48Z`
- Mode: isolated local verification to avoid stale R6 harness database/port conflicts

## Local runtime used

- API
  - command: `AGRO_API_DATABASE_URL=sqlite:////tmp/agrodomain-phase2-manual.db AGRO_E2E_DATABASE_PATH=/tmp/agrodomain-phase2-manual.db AGRO_E2E_API_HOST=127.0.0.1 AGRO_E2E_API_PORT=8040 python3 ../../scripts/run_e2e_api.py`
- Web
  - command: `NEXT_PUBLIC_AGRO_API_BASE_URL=http://127.0.0.1:8040 NEXT_DIST_DIR=.next-playwright/3040 corepack pnpm exec next dev --hostname 127.0.0.1 --port 3040`

## Observations

1. Admin route
   - signed in as `admin`
   - completed consent flow
   - landed on `/app/admin`
   - verified visible heading: `Service health`
   - verified rollout controls present: `Freeze rollout`, `Canary release`, `Promote`, `Rollback`

2. Advisor route
   - cleared local session
   - signed in as `advisor`
   - completed consent flow
   - navigated directly to `/app/advisor/requests`
   - verified route remained accessible
   - verified visible heading: `Grounded guidance with reviewer state`
   - verified guidance proof copy present under the advisory workspace

## Interpretation

- archived advisory/climate copy failures from the R6 packet are stale in the current tree
- current protected-route semantics required by contract are functioning for the validated direct-access paths
