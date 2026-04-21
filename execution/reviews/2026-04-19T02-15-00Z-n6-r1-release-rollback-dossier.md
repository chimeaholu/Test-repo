# N6-R1 Release And Rollback Operations Dossier

- Timestamp: `2026-04-19T02:15:00Z`
- Candidate tranche: `N6`
- Current decision: `NO-GO`
- Candidate baseline ref: `integration/agrodomain-n5-baseline-sparse`
- Candidate baseline commit: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Candidate baseline root: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Safe rollback anchor: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/reviews/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun-cd254ff7/n5-q1-final-closeout-report.md`

## Executive Readout

This dossier is tied to the packaged N5-close sparse baseline that Wave 6 was required to use. On that baseline, `N6-G1` through `N6-G5` are not satisfiable today. There is no safe basis for an N6 release-readiness claim, and the only credible rollback target remains the predecessor N5 closeout baseline.

## Evidence Inventory

### Control documents

- `/mnt/vault/MWH/Projects/Agrodomain/execution/specs/2026-04-19-n6-wave6-admin-observability-rollout-reliability-tranche.md`
- `/mnt/vault/MWH/Projects/Agrodomain/execution/WAVE-LOCK.md`
- `/mnt/vault/MWH/Projects/Agrodomain/execution/reviews/2026-04-19T01-24-00Z-wave6-state-snapshot.md`
- `/mnt/vault/MWH/Projects/Agrodomain/execution/reviews/2026-04-19T01-24-00Z-n6-launch-manifest.md`

### Predecessor close basis

- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/reviews/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun-cd254ff7/n5-q1-final-closeout-report.md`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/heartbeats/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun.md`

### Packaged baseline proof points used for this review

- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/catalog.ts`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/client.ts`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/application.py`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/system.py`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/audit.py`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/telemetry.py`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/web/app/app/admin/analytics/page.tsx`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/worker/app/main.py`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/config/src/index.ts`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/tests`
- `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/tests/e2e`

## Gate Decision Matrix

| Gate | Required proof | Current status | Decision basis |
| --- | --- | --- | --- |
| `N6-G1` | N6 contracts + generated artifacts | `FAIL` | No N6 contracts visible in `packages/contracts/src/catalog.ts` |
| `N6-G2` | Admin observability integrity | `FAIL` | No admin runtime endpoints; admin UI is placeholder-only |
| `N6-G3` | Rollout-control security/accountability | `FAIL` | No rollout-control contract, endpoint, or audit projection exists |
| `N6-G4` | Reliability hardening + regression pack | `FAIL` | No N6-focused QA artifact pack exists on baseline |
| `N6-G5` | Release/rollback readiness | `FAIL` | No implementation evidence to support a go-live recommendation |

## Blocker Table

| ID | Classification | Blocker | Evidence |
| --- | --- | --- | --- |
| `RB-01` | `release-blocking` | N6 contracts for admin analytics, rollout control, telemetry, SLO, and release status are absent. | `/packages/contracts/src/catalog.ts`, `/packages/contracts/src/client.ts` |
| `RB-02` | `release-blocking` | API has no admin observability, rollout-control, or release-readiness routes. | `/apps/api/app/core/application.py`, `/apps/api/app/api/routes/system.py` |
| `RB-03` | `release-blocking` | Admin analytics UI is still a placeholder and cannot satisfy live-data or degraded-state requirements. | `/apps/web/app/app/admin/analytics/page.tsx` |
| `RB-04` | `release-blocking` | No N6-Q1 reliability evidence pack exists for focused checks or `N1..N5` regression proof on N6 surfaces. | `/apps/api/tests`, `/tests/e2e`, `execution/reviews` |
| `RB-05` | `release-blocking` | Telemetry implementation is log-only and cannot support durable SLO evaluation, alert decisions, or rollback triggers. | `/apps/api/app/core/telemetry.py` |
| `PR-01` | `pre-release-remediate` | Admin-safe audit projections for rollout actions are not yet defined; current audit route is actor-scoped only. | `/apps/api/app/api/routes/audit.py` |
| `PR-02` | `pre-release-remediate` | Worker/config seams needed for rollout policy and async alerting are scaffolds. | `/apps/worker/app/main.py`, `/packages/config/src/index.ts` |
| `PF-01` | `post-release-follow-up` | Add a rollback drill artifact and acknowledgement history once N6 is actually releasable. | Future ops evidence requirement |

## Go/No-Go Framing

### Current tranche decision

`NO-GO`.

### What must be true before the decision can move to conditional go

- `RB-01` through `RB-05` are closed with artifacted proof in `execution/reviews`
- a visible N6-Q1 gate pack exists and maps to the packet’s proof IDs
- the admin UI shows live and degraded telemetry states without placeholder content
- release-readiness and rollout-control state can be read from packaged runtime endpoints

## Operator Verification Sequence For A Future N6 Candidate

This sequence is defined now so the next packaged N6 candidate can be evaluated consistently:

1. Verify baseline identity.
   Expected:
   - commit/ref documented in lock, state snapshot, and launch manifest
   - artifact paths rooted under the candidate packaged baseline, not the dirty vault worktree
2. Verify `N6-G1`.
   Expected:
   - N6 contract files exist in `packages/contracts/src`
   - generated manifest and schema artifacts refreshed
3. Verify `N6-G2`.
   Expected:
   - operator-readable admin analytics, telemetry, and degraded-state evidence from API and UI
4. Verify `N6-G3`.
   Expected:
   - rollout control evidence shows actor, scope, country, reason, and audit event linkage
5. Verify `N6-G4`.
   Expected:
   - focused API log
   - focused Playwright log
   - regression log spanning `N1..N5`
   - artifact index with pass/fail matrix
6. Verify `N6-G5`.
   Expected:
   - blocker table empty of release-blocking items
   - plan and architecture memos updated against the final candidate

## Rollback Trigger Map

These triggers are the minimum operator stop conditions for any future N6 candidate:

| Trigger ID | Trigger | Operator action |
| --- | --- | --- |
| `RT-01` | Missing or drifted N6 contracts relative to runtime/UI payloads | Stop release claim; revert to predecessor N5 baseline package |
| `RT-02` | Rollout action can occur without actor, country, scope, reason, or audit linkage | Immediate rollback to predecessor baseline |
| `RT-03` | Stale or missing telemetry is presented as healthy in admin UI | Immediate rollback to predecessor baseline |
| `RT-04` | Duplicate telemetry ingestion inflates SLO or alert state | Immediate rollback to predecessor baseline |
| `RT-05` | Regression proof for any closed `N1..N5` journey is missing or failed | Stop release claim; remediate before re-attempt |
| `RT-06` | Release-readiness endpoint or ops dossier points to missing evidence artifacts | Stop release claim; evidence-chain fix required |

## Rollback Target

If a future N6 candidate trips any trigger above, the rollback target is:

- baseline ref: `integration/agrodomain-n5-baseline-sparse`
- baseline commit: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- closeout report: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/reviews/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun-cd254ff7/n5-q1-final-closeout-report.md`

This dossier does not authorize deployment or mutation. It defines the evidence standard and stop conditions only.
