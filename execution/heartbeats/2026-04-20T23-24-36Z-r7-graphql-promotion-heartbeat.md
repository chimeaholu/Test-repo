# R7 GraphQL Promotion Heartbeat

- Timestamp (UTC): `2026-04-20T23:24:36Z`
- Lane: `R7 release-ops`
- Mode: `Railway GraphQL API`
- Deployment outcome: `canary SUCCESS`, `production SUCCESS`
- Release decision: `NO-GO`

## Deploy IDs

- canary: `535a7a4a-90cb-4d6f-917b-7a2bc0a738ce`
- production: `5867b1f6-3858-4ff6-bf73-6025108ea245`

## URLs

- canary: `https://web-staging-29cd.up.railway.app`
- production: `https://web-prod-n6-production.up.railway.app`

## Blockers to GO

- canary `/api/e2e/state/checks/full-critical` reports `passed=false`
- click-through harness failed in both canary and production

## Evidence

- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/r7-graphql-promotion-report.md`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/evidence-summary.json`
