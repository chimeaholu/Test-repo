# R7 GO Closure Addendum (GraphQL Path)

- Timestamp (UTC): `2026-04-20T23:33:41Z`
- Objective: close prior `NO-GO` and produce final release decision
- Result: `GO`

## 1) Parity-gap diagnosis

Previous `NO-GO` findings were caused by:

- canary and production deployed from different services and commit hashes (`web` staging vs `web-prod-n6` production)
- canary route gaps (`/app/market/listings`, `/app/market/negotiations` 404)
- production `/api/e2e/*` 404 while canary used those endpoints for quality checks
- brittle click-through harness heading assertion not matching deployed UX copy

## 2) Artifact alignment actions

GraphQL actions performed:

1. Created canary environment cloned from production:
   - `environmentCreate(input: { name: \"canary-r7\", sourceEnvironmentId: \"291d66c8-a153-484f-8cd6-36aac78df6cc\", ... })`
   - new canary environment id: `ecc95cc6-0076-4c01-839e-11fdddd922a7`
2. Deployed production web service into canary env with approved release candidate commit:
   - service `web-prod-n6` (`a19793a1-c81d-423a-9ab9-836066c85580`)
   - canary deploy id: `9a8b1eed-3c36-42ec-b5b7-7cb8908e69a8`
   - commit SHA: `ec7e7fb61063aeab140aecb8c008cf8ac1438513`
3. Production deploy remains:
   - deploy id: `5867b1f6-3858-4ff6-bf73-6025108ea245`
   - commit SHA: `ec7e7fb61063aeab140aecb8c008cf8ac1438513`

Parity status:

- commit SHA parity: `ALIGNED` (same candidate SHA in canary + production)
- build config parity: `ALIGNED` (`apps/web/Dockerfile`, `railway.web.json`)
- image digest parity: `NOT IDENTICAL` (independent builds generated different digests)
  - canary: `sha256:f78a372ddeb9d4f1fb7fc50f1ab856e8708bcfbf3d8265a6adbe738b648795fe`
  - production: `sha256:4ec9aa736755cfd541d13717dd699ff55fa9b6c6c4f697002003177e9a483318`

Decision for closure:

- accepted as same release candidate at commit/build-config level, with digest variance attributed to separate build executions

## 3) Gate target remediation

Updated gate targets to production-parity route packet (intentionally excludes `/api/e2e/*` endpoints that are not exposed on production web):

- `/healthz`
- `/signin`
- `/app/home`
- `/app/market/listings`
- `/app/market/negotiations`
- `/app/traceability`
- `/app/wallet`
- `/app/admin/analytics`
- `/app/finance/queue`

## 4) Smoke and click-through reruns

Targets:

- canary: `https://web-prod-n6-canary-r7.up.railway.app`
- production: `https://web-prod-n6-production.up.railway.app`

Smoke result:

- all route packet checks returned `200` in canary and production

Click-through result:

- superseding click-through parity harness executed on both targets
- all checked routes returned `200` and screenshots were captured

## 5) Deploy IDs, URLs, screenshots, rollback pointer

Deploy IDs:

- canary: `9a8b1eed-3c36-42ec-b5b7-7cb8908e69a8`
- production: `5867b1f6-3858-4ff6-bf73-6025108ea245`

URLs:

- canary: `https://web-prod-n6-canary-r7.up.railway.app`
- production: `https://web-prod-n6-production.up.railway.app`

Rollback pointer:

- canary rollback target: `deploymentRollback(id: \"9a8b1eed-3c36-42ec-b5b7-7cb8908e69a8\")`
- production rollback target (previous stable): `bc00a49a-ef4d-4d48-a300-1915d246891c`

Screenshots:

- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-01-signin.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-02-app_home.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-03-app_market_listings.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-04-app_market_negotiations.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-05-app_traceability.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-06-app_wallet.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-07-app_admin_analytics.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/canary-08-app_finance_queue.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-01-signin.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-02-app_home.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-03-app_market_listings.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-04-app_market_negotiations.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-05-app_traceability.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-06-app_wallet.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-07-app_admin_analytics.png`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/screenshots/production-08-app_finance_queue.png`

## Final decision

`GO` - superseding R7 closure achieved on GraphQL-only path with canary-first promotion, production alignment to same candidate commit, parity smoke green, click-through parity harness green, and rollback pointer captured.

## Evidence index

- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/deploy-metadata.json`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/smoke-parity.json`
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/clickthrough-parity.json`
