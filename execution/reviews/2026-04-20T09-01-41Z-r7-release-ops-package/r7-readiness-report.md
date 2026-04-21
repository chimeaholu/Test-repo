# R7 Release Ops Readiness Report

- Timestamp (UTC): `2026-04-20T09:01:41Z`
- Lane: `R7 release-ops`
- Reviewer: `engineering`
- Scope path: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Verdict: `BLOCKED`
- Deploy action taken in this run: `none`

## Decision

`R7` cannot execute a live promotion in this run context because no green `R6` gate evidence was provided or published in the current worktree execution state. The latest wave lock still stops at `R4`, and the current deploy evidence is staging-only evidence that does not prove the locked Wave 0 production topology.

## Exact Gate Findings

### 1. `R6` is absent in this run context

Verified sources:

- `execution/WAVE-LOCK.md` includes `R0` through `R4`, with active tranche still `R5 UX/copy/accessibility hardening`.
- `execution/heartbeats/` includes `R0` through `R4` heartbeats, but no `R6` heartbeat.
- `execution/reviews/` contains prior readiness and staging evidence, but no `R6` closeout report, no `R6` deployment authorization, and no `R6` PASS artifact tied to this run.

Result:

- `R6 gate status in current run context: NOT PRESENT`
- `R7 promotion authorization: DENIED`

### 2. Locked topology is not yet proven by the latest deploy evidence

Wave 0 topology lock requires the production implementation to route through:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/contracts`
- `packages/config`

Verified against the worktree:

- Those directories exist and are the declared production topology in `docs/architecture/2026-04-18-wave0-topology-lock.md`.
- `legacy/staging-runtime` is explicitly read-only and cannot be the production deploy path.

Verified against deploy configuration:

- Root `Dockerfile` copies only `apps/api`.
- `Procfile` starts only `apps/api` via `uvicorn`.
- `railway.json` defines a single service with `/healthz`.

Implication:

- The latest successful staging deployment demonstrates a single-service/API-centric runtime, not the full locked Wave 0 production topology across `web`, `api`, and `worker`.
- That evidence can support pre-release smoke history, but not final production promotion signoff.

### 3. Existing staging evidence is useful but insufficient for promotion

Last known staging evidence:

- Deployment review: `execution/reviews/2026-04-18-staging-expanded-validation/railway_deploy_review.json`
- Latest known staging deployment id: `0166fb61-9a7e-4973-b062-106309bd0cb5`
- Latest known staging host: `https://web-staging-29cd.up.railway.app`
- API gate summary: `execution/reviews/2026-04-18-staging-expanded-validation/api_gate_summary.json`

Observed status from those artifacts:

- Deployment status: `SUCCESS`
- `/healthz`: `200`
- `/api/e2e/seed`: `200`
- `/api/e2e/state/checks`: `200`
- Critical checks marked true for:
  - `auth-onboarding`
  - `listing-publish`
  - `negotiation-approval`
  - `escrow-release`
  - `advisory-citations`
  - `climate-ack`
  - `finance-hitl`
  - `traceability-dispatch`
  - `admin-analytics`
  - `full-critical`

Why this is still insufficient:

- No `R6` PASS ties those checks to the current promotion candidate.
- No current commit provenance chain links source commit -> built artifact -> staging -> canary -> production.
- No canary evidence exists in this run context.
- No production topology verification exists for the locked `apps/web` + `apps/api` + `apps/worker` deployment shape.

## Commit Provenance Status

Evidence-backed commit references found:

- Prior release-readiness baseline: `9fcdb68b`
- Frontend final-gate publish head: `64bec687726dc43e7c11daf394f8263e83cce3a0`
- Current task worktree suffix suggests a candidate tied to `cd254ff7`, but this container worktree is not attached to live `.git` metadata and cannot independently prove HEAD ancestry or tree cleanliness.

Result:

- Provenance model can be prepared.
- Promotion-grade provenance proof is `BLOCKED` until a repo-attached `git` view or exported commit manifest is provided for the exact candidate commit.

## Unblock Criteria

`R7` may proceed only when all of the following are present in the run context:

1. A published `R6` closeout artifact set marked `PASS`, including at minimum:
   - `execution/reviews/<timestamp>-r6-.../r6-closeout-report.md`
   - `execution/heartbeats/<timestamp>-r6-...-heartbeat.md`
   - `execution/WAVE-LOCK.md` updated with `R6 status: PASS`
2. Exact candidate provenance for the release target:
   - source commit SHA
   - clean-tree assertion or signed manifest
   - artifact identity shared across staging, canary, and production
3. Topology proof that the promotion candidate matches the Wave 0 lock:
   - `apps/web`
   - `apps/api`
   - `apps/worker`
   - `packages/contracts`
   - `packages/config`
   - no reliance on `legacy/staging-runtime` as the deploy path
4. Promotion environment access and identifiers:
   - staging target
   - canary target
   - production target
   - deploy credentials or authorized automation path
5. Fresh smoke evidence on the exact candidate commit in staging, then canary.

## Deliverables Produced In This Run

- `r7-readiness-report.md` - blocked readiness verdict
- `r7-promotion-runbook.md` - exact promotion procedure and rollback plan
- `r7-evidence-templates.md` - evidence capture templates for staging, canary, and production

## Promotion Result

- `R7 status: BLOCKED`
- `Deployment performed: no`
- `Rollback pointer: not applicable, no promotion executed`
