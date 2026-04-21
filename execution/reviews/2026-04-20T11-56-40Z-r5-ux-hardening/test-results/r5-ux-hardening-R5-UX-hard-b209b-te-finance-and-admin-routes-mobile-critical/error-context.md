# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures operations, advisory, climate, finance, and admin routes
- Location: tests/e2e/r5-ux-hardening.spec.ts:461:7

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator:  getByLabel('Full name')
Expected: visible
Received: undefined

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByLabel('Full name')

```

```
Tearing down "context" exceeded the test timeout of 300000ms.
```