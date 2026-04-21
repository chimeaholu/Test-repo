# Artifact Index

## Reports

- `forensic-addendum.md`
- `divergence-report.md`
- `correction-report.md`

## Before-state evidence

- `output_to_user/live-production-home-before.png`
- `output_to_user/live-canary-signin-before.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/`

## Frontend-upgrade reference evidence

- `/mnt/vault/MWH/Projects/Agrodomain/execution/reviews/2026-04-19-frontend-upgrade-evidence/`
- `/mnt/vault/MWH/Projects/Agrodomain/docs/frontend/`

## Verification artifacts

- `execution/reviews/2026-04-21-climate-rerun/`
- `execution/reviews/2026-04-21-proof-pack/` (regenerating after harness fix)

## Deployment metadata

- previous canary deploy: `535a7a4a-90cb-4d6f-917b-7a2bc0a738ce`
- previous production deploy: `5867b1f6-3858-4ff6-bf73-6025108ea245`
- rollback pointer: `bc00a49a-ef4d-4d48-a300-1915d246891c`

## Blocking note

No new deploy IDs exist in this correction pack because Railway GraphQL API calls from this runtime are blocked by Cloudflare `403 / 1010`.
