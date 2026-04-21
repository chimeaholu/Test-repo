# N5 Adversarial Code Review Findings

Review scope: N5-Q1 tranche only (`B-020..B-024` surfaces and associated test harnesses).

## Findings (ordered by severity)

1. `HIGH` Test harness can produce false gate failures via server reuse
   - File: `tests/e2e/n5-finance-traceability.spec.ts` + `playwright.config.ts`
   - Evidence: initial run `playwright/playwright-n5-focused.log` failed with command response shape from a reused server; isolated-port rerun `playwright/playwright-n5-focused-isolated.log` passed `4/4`.
   - Risk: gate decisions can flip based on ambient process state rather than tranche code behavior.

2. `MEDIUM` Regression suite currently brittle to UI text/label drift in non-N5 paths
   - Files: `tests/e2e/buyer-discovery.spec.ts`, `tests/e2e/negotiation.spec.ts`, `tests/e2e/helpers.ts`
   - Evidence: `regression/playwright-regression-n1-n4-isolated.log` failed on strict heading/label selectors:
     - missing heading `"Review supply quickly, inspect proof, and move offers without losing context."`
     - missing field label `"Listing title"`
   - Risk: repeated false negatives or masked real regressions when copy/labels evolve.

3. `MEDIUM` Proof screenshot capture path can crash mobile Chromium in this container
   - File: `tests/e2e/advisory-climate-gate.spec.ts:18-24`
   - Evidence: prior regression log `regression/playwright-regression-n1-n4.log` shows `page.screenshot: Target crashed` (SEGV).
   - Risk: non-functional infrastructure crash blocks regression evidence even when user-facing behavior is correct.

## Positive confirmations

- API runtime enforces N5 negative-path invariants:
  - finance replay single-effect and insurance payout dedupe (`api/test_finance_insurance_runtime.log`)
  - traceability continuity rejection on missing predecessor (`api/test_traceability_runtime_integration.log`)
- N5 web journeys pass on desktop+mobile under isolated run (`playwright/playwright-n5-focused-isolated.log`).
