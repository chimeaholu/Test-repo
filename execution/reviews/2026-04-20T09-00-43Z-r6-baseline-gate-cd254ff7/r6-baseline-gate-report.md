# R6 Baseline Gate Report

- Timestamp: `2026-04-20T09:39:32Z`
- Baseline root: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Baseline ref: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Scope: `R6` QA/reliability baseline on current code before `R5` lands
- Decision: `FAIL / BLOCKED`
- Deploy/push: `NOT PERFORMED`

## Gate summary

| Gate lane | Status | Basis |
| --- | --- | --- |
| Harness validation | `PASS with caveat` | Toolchain present; mounted worktree does not expose `.git` metadata from inside the container |
| Full-suite preflight | `PASS` | Package graph, Playwright projects, and test inventory resolved |
| Repo typecheck | `FAIL` | `35` mypy/type errors in `apps/api` block repo-wide green status |
| Critical unit/integration slices | `PASS` | API `22 passed`; web `40 passed`; worker `1 passed`; contracts `24 passed`; config `4 passed` |
| API negative-path checks | `PASS` | `apps/api/tests/integration/test_n6_admin_observability_reliability.py`: `11 passed` |
| API regression suite (`N1..N5`) | `PASS` | `27 passed, 11 deselected` |
| Full Playwright e2e | `FAIL` | Clean isolated run reached `14/38` executed before cutoff: `10 FAIL`, `4 PASS`, remainder unproven |
| Browser regression suite (`N1..N5`) | `FAIL / unproven` | Initial parallel run was invalid due port contention; isolated rerun did not complete before report cutoff |
| Parity evidence | `PASS` | Lock/state/admin route/admin analytics route/test assets present and captured |
| Rollback drill evidence | `PASS` | Prior rollback dossier and rollback anchor artifacts are present and readable |

## Blockers

1. Repo-wide type safety is not gate-clean.
   `typecheck/repo-typecheck.log` records `35` errors across `8` files, concentrated in `apps/api/app/services/commands/handlers.py`, `apps/api/app/api/routes/admin.py`, `apps/api/app/modules/advisory/runtime.py`, `apps/api/app/modules/analytics/runtime.py`, `apps/api/app/api/routes/marketplace.py`, `apps/api/app/api/routes/wallet.py`, and `apps/api/tests/contract/test_control_plane_contract_integrity.py`.

2. The browser harness is not repeatable enough for a release gate in its current `next dev` posture.
   The first full-suite and browser-regression invocations contended on the default API port and produced invalid evidence. The clean isolated rerun required `232.9s` just to compile `/signin`, then continued serially with repeated route compiles.

3. Core browser journeys are failing on current code.
   Clean isolated Playwright evidence in `playwright/playwright-full-seq.log` and `playwright/full-seq/test-results/**/error-context.md` shows deterministic failures across auth, advisory/climate, buyer discovery, admin observability, negotiation terminal-state proof, and R4 admin/wallet route proof.

4. Admin observability API negative paths are green, but the admin web route contract is not satisfied.
   API negative-path tests pass (`api/n6-negative-path-api.log`), but browser checks for `/app/admin/analytics` still fail because the expected `Service health` heading is absent while the page renders alternate headings and loading state.

## Strict PASS/FAIL by journey and route

### API/runtime routes

| Route or surface | Journey | Status | Evidence |
| --- | --- | --- | --- |
| `/api/v1/admin/analytics/health` | `PF-001/PF-004` degraded analytics health | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/analytics/snapshot` | admin snapshot readback | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/observability/alerts` | degraded alert feed | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/observability/telemetry` | duplicate telemetry dedupe and country validation | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/observability/telemetry/{observation_id}` | telemetry readback | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/rollouts/freeze` | rollout negative-path rejection | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/rollouts/canary` | rollout state persistence | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/rollouts/promote` | rollout promotion | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/rollouts/rollback` | rollback state change | `PASS` | `api/n6-negative-path-api.log` |
| `/api/v1/admin/rollouts/status` | rollout status collection | `PASS` | `api/n6-negative-path-api.log` |

### Browser routes and user journeys

| Route or surface | Journey | Status | Evidence |
| --- | --- | --- | --- |
| `/signin` | auth sign-in flow | `FAIL` | `playwright/full-seq/test-results/auth-consent-Auth-and-cons-638c7-y-fields-and-grants-consent-desktop-critical/error-context.md` |
| `/onboarding/consent` | consent completion and protected-route redirect chain | `FAIL` | `playwright/playwright-full-seq.log` |
| `/app/advisory` | `CJ-005 EP-006 RJ-003 DI-005` citations/confidence/reviewer state | `FAIL` | `playwright/full-seq/test-results/advisory-climate-gate-N4-a-fcd24-nfidence-and-reviewer-state-desktop-critical/error-context.md` |
| `/app/climate/alerts` | `CJ-006 EP-008 RJ-003 DI-006` alert acknowledgement and MRV evidence | `FAIL` | `playwright/full-seq/test-results/advisory-climate-gate-N4-a-2743d-wledgement-and-MRV-evidence-desktop-critical/error-context.md` |
| `/app/market/listings` | marketplace create/read | `PASS` | `playwright/playwright-full-seq.log` |
| `/app/market/listings/[listingId]` | marketplace edit/readback | `PASS` | `playwright/playwright-full-seq.log` |
| `/app/market/listings` + scoped detail read | buyer discovery and outsider restriction | `FAIL` | `playwright/full-seq/test-results/buyer-discovery-Buyer-disc-f7e10-ther-actor-s-listing-detail-desktop-critical/error-context.md` |
| `/app/finance/queue` | `CJ-004/CJ-008` finance HITL queue | `PASS` | `playwright/playwright-full-seq.log` |
| `/app/traceability/[consignmentId]` | `CJ-007` traceability timeline | `PASS` | `playwright/playwright-full-seq.log` |
| `/app/admin/analytics` | `PF-001/PF-004` service health and degraded-state evidence | `FAIL` | `playwright/full-seq/test-results/n6-admin-observability-N6--c45d3-and-degraded-state-evidence-desktop-critical/error-context.md` |
| `/app/admin` | `EP-005/DI-003` rollout controls, scope chips, audit posture | `FAIL` | `playwright/full-seq/test-results/n6-admin-observability-N6--1ccc0-ope-chips-and-audit-posture-desktop-critical/error-context.md` |
| `/app/market/negotiations` | terminal confirmation state and outsider block | `FAIL` | `playwright/full-seq/test-results/negotiation-Negotiation-in-fff71-er-thread-access-is-blocked-desktop-critical/error-context.md` |
| `/app/cooperative/dispatch` | R4 live cooperative dispatch route | `FAIL / unproven` | `playwright/full-seq/test-results/r4-route-completion-R4-rou-2ec5d-utes-are-live-and-navigable-desktop-critical/error-context.md` |
| `/app/wallet` and notifications surfaces | R4 wallet + notifications live escrow state | `FAIL / unproven` | `playwright/full-seq/test-results/r4-route-completion-R4-rou-8939e--after-accepted-negotiation-desktop-critical/error-context.md` |

## Evidence highlights

- Repo typecheck: `typecheck/repo-typecheck.log`
- Critical API slices: `api/critical-api-slices.log`
- N6 admin negative-path API proof: `api/n6-negative-path-api.log`
- Web unit/integration proof: `web/web-critical-tests.log`
- Worker proof: `worker/worker-tests.log`
- API regression proof: `regression/api-regression-n1-n5.log`
- Full browser run (invalid due contention): `playwright/playwright-full.log`
- Full browser run (clean isolated): `playwright/playwright-full-seq.log`
- Parity evidence: `parity/parity-evidence.log`
- Rollback drill evidence: `rollback/rollback-drill-evidence.log`

## QA conclusion

This baseline is a strict `FAIL`. The runtime/API control-plane surfaces are materially better than the earlier N6 baseline and the negative-path API file is green, but repo typecheck is still red and the browser matrix is not release-clean. The safe posture is to preserve this evidence pack, land `R5`, and immediately rerun the final gate from this same baseline packet without deploy/push.
