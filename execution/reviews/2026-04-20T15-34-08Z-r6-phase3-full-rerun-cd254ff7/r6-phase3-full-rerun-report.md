# R6 Phase 3 Full Rerun Report

- Timestamp: `2026-04-20T15:51:12Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Prior state anchor: `execution/reviews/2026-04-20T15-27-48Z-r6-phase2-remediation-cd254ff7`
- Artifact root: `execution/reviews/2026-04-20T15-34-08Z-r6-phase3-full-rerun-cd254ff7`
- Final R6 decision: `FAIL`
- Deployment action: `NOT AUTHORIZED`
- Task `7906cd00` resume: `NOT EXECUTED`

## Gate Matrix

| Gate | Verdict | Evidence | Notes |
| --- | --- | --- | --- |
| Repo typecheck | `PASS` | `phase-b/typecheck/repo-typecheck.log` | workspace typecheck clean; API mypy reports `0` errors in `93` files |
| API package tests | `PASS` | `phase-b/api/api-tests.log` | `65 passed`, `61 warnings` |
| Web package tests | `PASS` | `phase-b/web/web-tests.log` | `17` files, `44` tests green |
| Worker tests | `PASS` | `phase-b/worker/worker-tests.log` | `1 passed` |
| Contracts tests | `PASS` | `phase-b/contracts/contracts-tests.log` | `24 passed` |
| Config tests | `PASS` | `phase-b/config/config-tests.log` | `4 passed` |
| N6 negative-path API | `PASS` | `phase-c/api/n6-negative-path-api.log` | `11 passed` |
| API regression N1-N5 | `PASS` | `phase-c/regression/api-regression-n1-n5.log` | `27 passed` |
| Rollback evidence checks | `PASS` | `phase-c/rollback/rollback-drill-evidence.log` | rollback anchors present; rollback API proof `2 passed` |
| Full Playwright matrix | `FAIL` | `phase-c/playwright/playwright-full-matrix.log`, `phase-c/playwright/full-matrix/results.json` | `17 passed`, `23 failed` across desktop/mobile production-mode journeys |

## Playwright Aggregate

- `desktop-critical`: `6 PASS`, `14 FAIL`
- `mobile-critical`: `11 PASS`, `9 FAIL`
- Strict gate rule applied: any journey with a device-level failure is `FAIL` for R6

## Journey Decision Matrix

| Journey | File | Desktop | Mobile | Final |
| --- | --- | --- | --- | --- |
| `CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state` | `advisory-climate-gate.spec.ts` | `PASS` | `PASS` | `PASS` |
| `CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence` | `advisory-climate-gate.spec.ts` | `PASS` | `PASS` | `PASS` |
| `sign-in validates identity fields and grants consent` | `auth-consent.spec.ts` | `PASS` | `PASS` | `PASS` |
| `protected routes redirect to sign-in first and consent second` | `auth-consent.spec.ts` | `PASS` | `PASS` | `PASS` |
| `buyer reaches the discovery shell and cannot read another actor's listing detail` | `buyer-discovery.spec.ts` | `PASS` | `PASS` | `PASS` |
| `farmer creates a listing and reads it back from detail` | `marketplace.spec.ts` | `FAIL` | `PASS` | `FAIL` |
| `farmer edits a listing and sees optimistic reconciliation evidence` | `marketplace.spec.ts` | `FAIL` | `PASS` | `FAIL` |
| `CJ-004/CJ-008 finance HITL queue and decision actions are live` | `n5-finance-traceability.spec.ts` | `FAIL` | `PASS` | `FAIL` |
| `CJ-007 traceability timeline renders ordered events and explicit evidence state` | `n5-finance-traceability.spec.ts` | `PASS` | `PASS` | `PASS` |
| `PF-001 PF-004 admin analytics route exposes live health and degraded-state evidence` | `n6-admin-observability.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `EP-005 DI-003 admin workspace shows rollout controls with scope chips and audit posture` | `n6-admin-observability.spec.ts` | `FAIL` | `PASS` | `FAIL` |
| `pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked` | `negotiation.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `admin analytics and cooperative dispatch routes are live and navigable` | `r4-route-completion.spec.ts` | `FAIL` | `PASS` | `FAIL` |
| `wallet and notifications routes surface live escrow state after accepted negotiation` | `r4-route-completion.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `server-authoritative home posture redirects after consent revoke` | `r4-route-completion.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `captures public, onboarding, and role-home routes` | `r5-ux-hardening.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `captures seeded marketplace, wallet, notifications, and traceability flows` | `r5-ux-hardening.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `captures operations, advisory, climate, finance, and admin routes` | `r5-ux-hardening.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `consent revoke blocks protected routes until restored` | `recovery.spec.ts` | `FAIL` | `FAIL` | `FAIL` |
| `offline seam exposes connectivity, retry, and dismiss controls` | `recovery.spec.ts` | `FAIL` | `FAIL` | `FAIL` |

## Failure Concentration

1. `marketplace` desktop creation/edit flows are still red.
2. `n5-finance-traceability` desktop finance HITL flow is still red.
3. `n6-admin-observability` remains red on degraded-state evidence on both devices, with rollout/audit posture still red on desktop.
4. `negotiation`, `wallet/notifications`, `consent revoke`, and `offline retry` are red on both devices.
5. `r5-ux-hardening` remains fully red on both devices across all three proof packs.
6. `r4` admin/cooperative route proof is asymmetric: mobile passes, desktop fails.

## Interpretation

- Phase 2 remediation removed the prior typecheck and admin-`403` blocker class from the controlling gate set.
- That remediation did not produce a releasable browser surface.
- R6 remains `FAIL` because the strict release rule requires a clean end-to-end browser matrix, and the final matrix still has `23` unexpected failures.

## Required Next Action

1. Treat the current blocking surface as browser-product defects, not harness debt.
2. Triage desktop-first failures in `marketplace`, `admin observability`, `r4/r5`, and `recovery`.
3. Re-run the full Playwright matrix only after those defects are remediated.
4. Do not resume `7906cd00` until a fresh R6 packet is fully green.
