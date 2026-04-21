# R7 GraphQL Promotion State

- Timestamp: `2026-04-20T23:24:36Z`
- Project: `agrodomain-staging` (`812c9677-9d2a-4496-9a82-4bd2dbb90607`)

## Promotion results

- canary deploy id: `535a7a4a-90cb-4d6f-917b-7a2bc0a738ce` (`SUCCESS`)
- production deploy id: `5867b1f6-3858-4ff6-bf73-6025108ea245` (`SUCCESS`)

## Rollback pointer

- canary previous deploy id: `4dc39bc0-768e-4541-b73f-3d53d00a8b7c`
- production previous deploy id: `bc00a49a-ef4d-4d48-a300-1915d246891c`

## Quality verdict

- release signoff: `NO-GO`
- primary failure reasons:
  - canary full-critical check payload `passed=false`
  - click-through harness assertion timeout in both environments
