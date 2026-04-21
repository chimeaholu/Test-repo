# Regression Summary

## N1..N4 regression expectation (Playwright subset)

- Command: `playwright test auth-consent buyer-discovery marketplace negotiation advisory-climate-gate`
- Isolated run log: `playwright-regression-n1-n4-isolated.log`
- Result: `12 passed`, `4 failed`

Failed specs:

- `tests/e2e/buyer-discovery.spec.ts` (`desktop-critical`, `mobile-critical`)
- `tests/e2e/negotiation.spec.ts` (`desktop-critical`, `mobile-critical`)

## Notes

- Earlier run with artifact screenshot capture also failed and included Chromium screenshot SEGV in mobile advisory/climate path.
- Isolated rerun suppressed proof screenshots and still retained the same buyer/negotiation functional failures, so regression failure is not attributable only to screenshot crash.
