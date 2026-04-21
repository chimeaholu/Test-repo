# N5 Architecture Boundary Review

Scope check: constrained to `B-020..B-024` and `N5-Q1` evidence duties. No Wave6/admin-hardening or `B-025..B-030` implementation expansion detected in this lane.

## Boundary findings

1. `PASS` Regulated decision boundary is preserved in runtime handlers
   - `apps/api/app/services/commands/handlers.py:787-895` enforces partner-owned finance approval semantics (`internal_can_approve` rejected, non-partner decision source rejected).
   - N5 API tests validate replay and dedupe behavior (`api/test_finance_insurance_runtime.log`).

2. `PASS` Traceability chain remains append-only with explicit continuity failure
   - `handlers.py:1096-1206` rejects missing predecessor via `traceability_continuity_failure`.
   - Integration proof in `api/test_traceability_runtime_integration.log` validates `409` on broken chain and ordered timeline reads.

3. `CONCERN` Gate reproducibility boundary is weak when default Playwright ports are reused
   - Initial focused run (`playwright/playwright-n5-focused.log`) consumed stale server behavior.
   - Isolated rerun (`playwright/playwright-n5-focused-isolated.log`) passed.
   - Architectural implication: QA gate outcome depends on ambient process state, not solely on pinned baseline+lane artifacts.

4. `FAIL` Regression boundary requirement (`N1..N4 no-regression`) not met
   - `regression/playwright-regression-n1-n4-isolated.log`: buyer discovery and negotiation fail on both desktop and mobile.
   - This blocks tranche close despite N5-local journey success.

## Close recommendation

- Keep N5 tranche status `OPEN` until `N1..N4` regression selectors/flows are remediated and rerun green on isolated ports.
