# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('form[data-interactive=\'true\']')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('form[data-interactive=\'true\']')

```

```
Tearing down "context" exceeded the test timeout of 90000ms.
```