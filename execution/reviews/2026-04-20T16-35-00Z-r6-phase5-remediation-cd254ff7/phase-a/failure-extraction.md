# Phase 5 Subphase A: Failing Test Extraction and Root Causes

- Timestamp: `2026-04-20T17:29:42Z`
- Source baseline: `execution/reviews/2026-04-20T16-05-00Z-r6-phase4-remediation-cd254ff7/phase-4/full-matrix/results.json`
- Baseline failures extracted: `17`

## Exact Failing Tests from Phase 4 Baseline

1. `tests/e2e/advisory-climate-gate.spec.ts:109` (`desktop-critical`) - `CJ-006...climate route...`
2. `tests/e2e/marketplace.spec.ts:6` (`mobile-critical`) - listing create/read
3. `tests/e2e/marketplace.spec.ts:33` (`mobile-critical`) - listing edit/reconcile
4. `tests/e2e/n5-finance-traceability.spec.ts:222` (`desktop-critical`) - finance HITL queue
5. `tests/e2e/n6-admin-observability.spec.ts:6` (`desktop-critical`) - admin analytics degraded-state evidence
6. `tests/e2e/negotiation.spec.ts:252` (`desktop-critical`) - terminal-state + outsider scope
7. `tests/e2e/negotiation.spec.ts:252` (`mobile-critical`) - terminal-state + outsider scope
8. `tests/e2e/r4-route-completion.spec.ts:171` (`desktop-critical`) - admin/cooperative route proof
9. `tests/e2e/r4-route-completion.spec.ts:196` (`desktop-critical`) - wallet/notifications proof
10. `tests/e2e/r4-route-completion.spec.ts:171` (`mobile-critical`) - admin/cooperative route proof
11. `tests/e2e/r4-route-completion.spec.ts:196` (`mobile-critical`) - wallet/notifications proof
12. `tests/e2e/r4-route-completion.spec.ts:300` (`mobile-critical`) - consent revoke redirect
13. `tests/e2e/r5-ux-hardening.spec.ts:337` (`desktop-critical`) - seeded marketplace/wallet/notifications/traceability
14. `tests/e2e/r5-ux-hardening.spec.ts:461` (`desktop-critical`) - operations/advisory/climate/finance/admin
15. `tests/e2e/r5-ux-hardening.spec.ts:337` (`mobile-critical`) - seeded marketplace/wallet/notifications/traceability
16. `tests/e2e/recovery.spec.ts:56` (`desktop-critical`) - offline seam retry/dismiss
17. `tests/e2e/recovery.spec.ts:56` (`mobile-critical`) - offline seam retry/dismiss

## Top Recurring Root Causes (with file/line pointers)

1. **Protected-route redirect recovery bug in navigation harness** (`tests/e2e/helpers.ts:225-303`).
   - `gotoPath()` could exit retry loop after repeated `/signin` redirects without throwing, leaving tests on auth routes.
   - `restoreWorkspaceFromSession()` returned `void`, so unrecoverable session-role states were not propagated.

2. **Assertion drift against updated negotiation copy** (`tests/e2e/negotiation.spec.ts:227,243` and `tests/e2e/r5-ux-hardening.spec.ts:433`).
   - Tests expected older negotiation headings/checkpoint labels that no longer match runtime UI.

3. **Recovery status semantic drift after retry** (`tests/e2e/recovery.spec.ts:69`).
   - Test required `acked`; runtime can legitimately render `failed_retryable` after retry attempt increment.
