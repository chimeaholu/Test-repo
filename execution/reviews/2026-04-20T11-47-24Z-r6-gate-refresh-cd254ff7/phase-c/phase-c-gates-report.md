# Phase C Playwright, Regression, Negative-Path, And Rollback Report

- Timestamp: `2026-04-20T12:02:00Z`
- Phase: `C`
- Gate: `R6 release-readiness refresh`

## Decision

`FAIL`

## Summary Matrix

| Lane | Status | Evidence |
| --- | --- | --- |
| API negative-path checks | `PASS` | `phase-c/api/n6-negative-path-api.log` |
| API regression (`N1..N5`) | `PASS` | `phase-c/regression/api-regression-n1-n5.log` |
| Rollback drill evidence | `PASS` | `phase-c/rollback/rollback-drill-evidence.log` |
| Full Playwright matrix | `FAIL` | `phase-c/playwright/playwright-full-matrix.log` plus `phase-c/playwright/full-matrix/test-results/**/error-context.md` |
| Latest R5 retry ingestion during run | `PARTIAL / does not unblock` | `execution/reviews/2026-04-20T11-56-40Z-r5-ux-hardening/vitest-focused.log` |

## Latest R5 State During Run

- A new R5 artifact directory appeared during this run: `execution/reviews/2026-04-20T11-56-40Z-r5-ux-hardening`
- It contains:
  - `vitest-focused.log` with `13 passed`
  - an empty `e2e-r5.log`
- It does **not** contain a closeout report, route matrix, or `results.json`
- Because the underlying worktree was unchanged, this Phase C rerun remains the best available R6 evidence against the latest observable R5 state, but the new R5 partial artifacts do not repair the browser blockers

## Browser Matrix Outcome

- Matrix command used production-mode Next startup on isolated ports:
  - `AGRO_E2E_API_PORT=8020 PLAYWRIGHT_WEB_PORT=3020 PLAYWRIGHT_USE_PROD_WEB_SERVER=1 PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-c/playwright/full-matrix corepack pnpm test:e2e`
- The bounded run completed `14` desktop-critical tests before evidence freeze
- Observed outcome: `2 PASS`, `12 FAIL`
- Remaining `26` matrix cases were not completed in the bounded window and therefore remain `FAIL / unproven` for strict gate purposes

## Strict Journey Verdicts

| Journey | Latest observed proof | R6 verdict |
| --- | --- | --- |
| Advisory reviewer state (`CJ-005 EP-006 RJ-003 DI-005`) | desktop `FAIL` | `FAIL` |
| Climate alerts and MRV (`CJ-006 EP-008 RJ-003 DI-006`) | desktop `FAIL` | `FAIL` |
| Auth sign-in happy path | desktop `PASS`; mobile unproven | `FAIL / unproven` |
| Protected-route redirect chain | desktop `FAIL` | `FAIL` |
| Buyer discovery outsider restriction | desktop `FAIL` | `FAIL` |
| Marketplace create and detail readback | desktop `FAIL` | `FAIL` |
| Marketplace edit and optimistic reconciliation | desktop `FAIL` | `FAIL` |
| Finance queue decision flow (`CJ-004/CJ-008`) | desktop `PASS`; mobile unproven | `FAIL / unproven` |
| Traceability ordered evidence timeline (`CJ-007`) | desktop `FAIL` | `FAIL` |
| Admin analytics degraded-state evidence (`PF-001/PF-004`) | desktop `FAIL` | `FAIL` |
| Admin rollout controls and audit posture (`EP-005/DI-003`) | desktop `FAIL` | `FAIL` |
| Negotiation terminal-state proof and outsider block | desktop `FAIL` | `FAIL` |
| R4 admin analytics + cooperative dispatch route proof | desktop `FAIL` | `FAIL` |
| R4 wallet + notifications route proof | desktop `FAIL` | `FAIL` |
| R4 server-authoritative home posture after consent revoke | not completed in bounded matrix | `FAIL / unproven` |
| R5 UX capture pack on desktop/mobile | not completed in bounded matrix | `FAIL / unproven` |
| Recovery: consent revoke blocks protected routes until restored | not completed in bounded matrix | `FAIL / unproven` |
| Recovery: offline seam exposes retry and dismiss controls | not completed in bounded matrix | `FAIL / unproven` |

## Notable Failure Pattern

- Admin web journeys continue to hit `403 Forbidden` responses on `/api/v1/admin/analytics/health`, `/api/v1/admin/observability/alerts`, `/api/v1/admin/rollouts/status`, `/api/v1/admin/release-readiness`, and `/api/v1/admin/audit/events` during browser execution, despite the targeted negative-path API suite being green.
- This means the API negative-path contract is not translating into a browser-authorized admin experience.

## Conclusion

Phase C did not repair the baseline browser posture. The API-only reliability lanes are green, but the integrated browser surface remains red and any uncompleted matrix case is still `FAIL / unproven`. `R6` stays blocked.
