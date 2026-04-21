# Accessibility Checks

## Smoke Criteria

- one `main` landmark per route
- no more than one `h1` per route
- interactive `button` and `a` elements must expose a visible or ARIA label
- form inputs, selects, and textareas must retain an associated label
- skip-link remains present on public and protected route shells

## Evidence

- Fresh focused browser proof refresh: `blocked` by local harness instability
- Latest passing browser pack that exercised the same route inventory:
  - `execution/reviews/2026-04-20T09-46-30Z-r5-ux-hardening/results.json`
  - `execution/reviews/2026-04-20T09-46-30Z-r5-ux-hardening/html-report/index.html`
- Fresh focused component regression coverage:
  - `execution/reviews/2026-04-20T11-56-40Z-r5-ux-hardening/vitest-focused.log`

## Notes

- The rerun code changes preserved explicit labels, helper text, and landmark structure on the routes touched in phases 1-3.
- A brand-new route screenshot and browser-smoke pack still needs a clean harness rerun before the rerun can replace the earlier PASS screenshot set.

