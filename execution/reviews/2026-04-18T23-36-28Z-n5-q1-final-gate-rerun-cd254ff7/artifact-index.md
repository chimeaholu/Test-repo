# Artifact Index — N5-Q1 Final Gate Rerun

Root: `execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7`

## Decision docs

- `n5-q1-final-gate-report.md`
- `n5-code-review-findings.md`
- `n5-architecture-boundary-review.md`

## Contracts evidence

- `contracts/contracts-test.log`
- `contracts/contracts-generate.log`
- `contracts/n5-contract-inventory.log`

## API evidence

- `api/test_finance_insurance_runtime.log`
- `api/test_traceability_runtime_integration.log`
- `api/n5-route-inventory.log`

## Playwright evidence

- Focused N5, first pass (default ports, failed): `playwright/playwright-n5-focused.log`
- Focused N5, isolated rerun (pass): `playwright/playwright-n5-focused-isolated.log`
- N5 isolated reporter outputs:
  - `playwright/n5-focused-isolated/results.json`
  - `playwright/n5-focused-isolated/html-report/index.html`
  - `playwright/n5-focused-isolated/test-results/.last-run.json`

## Regression evidence

- N1..N4 regression first pass (with screenshot crash artifacts): `regression/playwright-regression-n1-n4.log`
- N1..N4 regression isolated rerun (functional result): `regression/playwright-regression-n1-n4-isolated.log`
- Isolated regression reporter outputs (default path due screenshot suppression):
  - `execution/reviews/playwright-v001-n1/results.json`
  - `execution/reviews/playwright-v001-n1/html-report/index.html`
  - `execution/reviews/playwright-v001-n1/test-results/.last-run.json`
