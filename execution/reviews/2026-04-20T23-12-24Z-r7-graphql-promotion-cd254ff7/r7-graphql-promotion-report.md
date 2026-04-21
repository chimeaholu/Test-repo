# R7 GraphQL Promotion Report

- Timestamp (UTC): `2026-04-20T23:24:36Z`
- Promotion mode: `Railway GraphQL API only`
- Project: `agrodomain-staging` (`812c9677-9d2a-4496-9a82-4bd2dbb90607`)
- Decision: `NO-GO` for release signoff (deploy succeeded, post-deploy quality gates red)

## Deployment execution

### Canary

- service: `web` (`a90a7dc8-3e69-4f3e-a028-5704cbad2ef7`)
- environment: `staging` (`04fe2393-74b8-4dcf-8bfe-d26d7af63cf9`)
- deploy id: `535a7a4a-90cb-4d6f-917b-7a2bc0a738ce`
- status: `SUCCESS`
- URL: `https://web-staging-29cd.up.railway.app`

Provenance:

- branch: `staging`
- commit SHA: `c5d8f8eaa0948241fd4a9650ef82793eff0ff1f7`
- commit message: `Add friendly root route redirect to signin`
- image digest: `sha256:662aa517d12056c04d27af78a7a5837a066d9efab086092b7f7db83dd77af64e`

### Production

- service: `web-prod-n6` (`a19793a1-c81d-423a-9ab9-836066c85580`)
- environment: `production` (`291d66c8-a153-484f-8cd6-36aac78df6cc`)
- deploy id: `5867b1f6-3858-4ff6-bf73-6025108ea245`
- status: `SUCCESS`
- URL: `https://web-prod-n6-production.up.railway.app`

Provenance:

- branch: `deploy/n6-prod-subtree-5edce2`
- commit SHA: `ec7e7fb61063aeab140aecb8c008cf8ac1438513`
- commit message: `fix(prod-web-build): restore proven docker build path for contracts+next`
- image digest: `sha256:4ec9aa736755cfd541d13717dd699ff55fa9b6c6c4f697002003177e9a483318`

## Rollback pointer

- canary previous deploy id: `4dc39bc0-768e-4541-b73f-3d53d00a8b7c` (`SUCCESS`)
- production previous deploy id: `bc00a49a-ef4d-4d48-a300-1915d246891c` (`SUCCESS`)
- rollback method (GraphQL): `deploymentRollback(id: "<deploy-id>")`

## Smoke results

### Canary smoke

- `/healthz`: `200`
- `/signin`: `200`
- `/api/e2e/seed`: `200`
- `/api/e2e/state/checks`: `200`
- `/api/e2e/state/checks/full-critical`: `200`, payload `passed=false`
- route checks include:
  - `/app/onboarding/consent`: `307 signin required`
  - `/app/home`: `307 signin required`
  - `/app/market/listings`: `404`
  - `/app/market/negotiations`: `404`
  - `/app/traceability`: `307 signin required`
  - `/app/wallet`: `307 signin required`
  - `/app/admin/analytics`: `307 signin required`
  - `/app/finance/queue`: `307 signin required`

### Production smoke

- `/healthz`: `200`
- `/signin`: `200`
- `/app/home`: `200`
- `/app/market/listings`: `200`
- `/app/market/negotiations`: `200`
- `/app/traceability`: `200`
- `/app/wallet`: `200`
- `/app/admin/analytics`: `200`
- `/app/finance/queue`: `200`
- `/api/e2e/seed`: `404`
- `/api/e2e/state/checks`: `404`
- `/api/e2e/state/checks/full-critical`: `404`

## Click-through results

Automated click-through harness (`scripts/r5-route-proof.mjs`) failed in both canary and production due heading assertion timeout on:

- expected heading: `Run marketplace, operations, finance, and field decisions from one trusted workspace.`

Result:

- click-through gate status: `FAIL`

## Screenshots

Screenshot bundle:

- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-01-signin.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-02-app_onboarding_consent.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-03-app_home.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-04-app_market_listings.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-05-app_traceability.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/canary-06-app_admin_analytics.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-01-signin.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-02-app_onboarding_consent.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-03-app_home.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-04-app_market_listings.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-05-app_traceability.png`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/screenshots/production-06-app_admin_analytics.png`

## Final decision

- Promotion execution: `completed` (canary + production deploys succeeded)
- Release signoff: `NO-GO`

Reason:

- canary full-critical smoke payload is explicitly failing (`passed=false`)
- click-through harness is failing in both environments
- production lacks e2e verification endpoints used by canary checks (`404`), preventing parity evidence closure

## Primary evidence files

- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/promotion-results.json`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/smoke-results.json`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/evidence-summary.json`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/state-before.json`
- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/state-after.json`
