# R7 Promotion Runbook

- Timestamp (UTC): `2026-04-20T09:01:41Z`
- Scope: `staging -> canary -> production`
- Current execution status: `blocked pending R6`

## 1. Exact Topology Verification

Promotion is valid only if the candidate matches the locked topology below and the deploy surface reflects it:

```text
Agrodomain/
  apps/
    web/
    api/
    worker/
  packages/
    contracts/
    config/
```

### Verification checklist

- `apps/web` exists and is the user-facing web surface.
- `apps/api` exists and owns persistence, policy, audit, idempotency, and protected APIs.
- `apps/worker` exists and owns retries, notifications, ingestion, and long-running jobs.
- `packages/contracts` exists and is the transport source of truth.
- `packages/config` exists and is the typed runtime config source of truth.
- `legacy/staging-runtime` is not the deployed runtime.
- Deployment descriptors do not collapse the locked topology into an untracked alternate runtime without explicit architecture approval.

### Current observed mismatch

The current deploy configuration copies and starts only `apps/api`:

- `Dockerfile` copies `apps/api/app`
- `Procfile` runs `uvicorn app.main:app`
- `railway.json` defines a single deployable service

This is acceptable only as pre-release evidence unless `R6` explicitly approves this as the production topology for the candidate.

## 2. Commit Provenance Model

Every promotion must carry the same immutable identity through all environments.

### Required provenance fields

- `candidate_commit_sha`
- `candidate_tree_state`
- `artifact_id` or image digest
- `staging_deploy_id`
- `canary_deploy_id`
- `production_deploy_id`
- `promotion_operator`
- `promotion_timestamp_utc`
- `rollback_pointer`

### Required assertions

- The candidate commit is exactly the commit approved by `R6`.
- The artifact promoted to canary is the same artifact proven in staging.
- The artifact promoted to production is the same artifact proven in canary.
- No environment rebuild occurs from a different SHA between hops unless a new gate is opened.

### Minimum acceptable evidence

- `git rev-parse HEAD` or signed exported commit manifest
- artifact digest or provider deployment artifact id
- deploy provider ids per environment
- environment URLs per environment
- smoke results tied to those ids

## 3. Promotion Sequence

### Stage A. Staging qualification

Preconditions:

- `R6 = PASS`
- candidate SHA pinned
- staging target authorized

Required captures:

- deploy id
- public URL
- healthcheck response
- smoke results
- screenshots

Blocking smoke checklist:

- `/healthz` returns `200`
- signin route loads
- onboarding consent persists
- farmer home renders
- market listings route renders
- negotiation route renders
- traceability route renders
- wallet route renders
- admin analytics route renders
- finance queue route renders

Critical click-through actions:

- sign in as farmer
- accept onboarding consent
- publish a draft listing
- approve a negotiation
- release escrow
- attach advisory citations
- acknowledge a climate alert
- approve a finance case
- append traceability dispatch evidence

### Stage B. Canary promotion

Preconditions:

- same artifact promoted from staging
- staging checklist fully green

Required captures:

- canary deploy id
- canary URL
- smoke results on the same checklist
- screenshots from canary
- explicit comparison against staging artifact identity

Exit condition:

- no regressions on critical routes or actions
- no topology drift
- no new env-specific failures

### Stage C. Production promotion

Preconditions:

- canary green
- production target authorized
- rollback pointer prepared and tested

Required captures:

- production deploy id
- production URL
- production smoke results
- production screenshots
- rollback pointer referencing the exact prior good artifact

## 4. Smoke and Click-Through Checklist

Use this exact checklist for staging, canary, and production.

### Route smoke

- `/healthz`
- `/signin`
- `/app/onboarding/consent`
- `/app/home`
- `/app/market/listings`
- `/app/market/negotiations`
- `/app/traceability`
- `/app/wallet`
- `/app/admin/analytics`
- `/app/finance/queue`

### Assertions

- HTTP success or authenticated render
- no unhandled server errors
- role-aware navigation is correct
- expected page heading is present
- expected primary CTA is present
- no route redirects into dead ends

### Action assertions

- consent action persists after refresh
- listing publish updates status and leaves audit evidence
- negotiation approval persists
- escrow funding and release state transitions render correctly
- advisory citation state is visible
- climate acknowledgement is visible
- finance approval is visible
- traceability dispatch evidence is visible

## 5. Rollback Plan

Rollback must be prepared before production promotion.

### Rollback pointer format

- `prior_good_commit_sha`
- `prior_good_artifact_id`
- `prior_good_deploy_id`
- `prior_good_url`
- `rollback_operator`
- `rollback_timestamp_utc`

### Rollback triggers

- failed healthcheck
- failed critical smoke
- topology mismatch
- auth regression
- protected workflow regression
- audit or idempotency regression

### Rollback steps

1. Halt forward promotion.
2. Record failing deploy id and first failing assertion.
3. Re-point traffic or redeploy the prior known-good artifact.
4. Re-run the route smoke checklist on the rollback target.
5. Publish rollback evidence with timestamps and screenshots.

## 6. Current Known Evidence

### Latest known staging record

- deploy id: `0166fb61-9a7e-4973-b062-106309bd0cb5`
- host: `https://web-staging-29cd.up.railway.app`
- source file: `execution/reviews/2026-04-18-staging-expanded-validation/railway_deploy_review.json`

### Latest known staging smoke summary

- source file: `execution/reviews/2026-04-18-staging-expanded-validation/api_gate_summary.json`
- health: `200`
- seed: `200`
- checks: `200`
- critical checks: `true`

## 7. Current Stop Condition

Do not deploy from this runbook until `R6` is published as `PASS` in this run context and tied to an exact candidate commit.
