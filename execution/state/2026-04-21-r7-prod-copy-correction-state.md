# R7 Production Copy Correction State

- Timestamp (UTC): `2026-04-21T00:05:00Z`
- Decision: `NO-GO / NO FALSE PASS`

## Summary

1. Production commit `ec7e7fb61063aeab140aecb8c008cf8ac1438513` diverges materially from the April 19 frontend closeout deliverables.
2. Corrective source changes are implemented locally and mirrored into `/mnt/vault/MWH/Projects/Agrodomain`.
3. Release gates now fail on internal lexicon leakage and on missing acceptance screenshots.
4. Verification is partially re-established locally, but no new live deploy was executed from this runtime.

## Verified

- `corepack pnpm --filter @agrodomain/web typecheck`
- `corepack pnpm --filter @agrodomain/web test`
- isolated `tests/e2e/advisory-climate-gate.spec.ts --grep "CJ-006"` rerun on desktop + mobile

## Open

- fresh full Playwright archive still needs a clean final pass after proof-harness fixes
- Railway GraphQL deploy path is blocked by Cloudflare `1010`
- no new canary/prod deploy IDs were produced in this correction pass

## Rollback pointer

- prior production rollback target remains `bc00a49a-ef4d-4d48-a300-1915d246891c`
