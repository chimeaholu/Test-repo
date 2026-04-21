# R5 UX Hardening Closeout

- Timestamp: `2026-04-20T09:14:35Z`
- Execution base: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Baseline ref: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Dependency satisfied: `execution/reviews/2026-04-20T04-22-22Z-r4-web-route-completion/r4-closeout-report.md`

## Scope Executed

- removed residual tranche-era user-facing copy from landing, offline, advisory, climate, negotiation, listings, and wallet surfaces
- introduced a versioned copy registry at `apps/web/lib/content/route-copy.ts`
- tightened small-screen and disabled-state styling in `apps/web/app/globals.css`
- added a targeted Playwright hardening gate for public and authenticated route copy/accessibility proof in `tests/e2e/r5-ux-hardening.spec.ts`

## Gate Verdict

`FAIL`

`R5` cannot close. The tranche has one green sub-gate and three red ones:

| Gate | Verdict | Why |
| --- | --- | --- |
| `R5-B01` remove tranche/planning copy | `PASS` | Source scan over `apps/web` returned no remaining `Wave`, `W-003`, `N4`, `N5`, or `N2-A2` user-facing strings |
| `R5-B02` accessibility and readability pass | `FAIL` | No green Playwright hardening pack exists for keyboard/focus/320px proof |
| `R5-B03` country-pack copy and localization pass | `FAIL` | Copy registry exists, but route-by-route locale proof was not closed with green verification |
| `R5-B04` performance and degraded-state UX pass | `FAIL` | R5 rerun hit a Next dev `vendor-chunks` `MODULE_NOT_FOUND` error before the gate could complete cleanly |

## Blocking Evidence

### 1. Hardening gate failed

Targeted command:

- `AGRO_E2E_API_PORT=8015 PLAYWRIGHT_WEB_PORT=3015 PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-20T09-30-00Z-r5-ux-hardening corepack pnpm test:e2e -- tests/e2e/r5-ux-hardening.spec.ts`

Result:

- `FAIL` (`4` failing cases across desktop and mobile)

Observed blockers:

- the 320px landing-route assertion did not close green in the first R5 pack
- the authenticated route sweep did not close green in the first R5 pack
- `notifications` expectation required correction to the actual live heading
- `admin` route API reads emitted `403` responses during the R5 sweep, which is incompatible with a clean route-hardening PASS claim

### 2. Rerun exposed environment instability

Rerun command:

- `AGRO_E2E_API_PORT=8016 PLAYWRIGHT_WEB_PORT=3016 PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-20T09-45-00Z-r5-ux-hardening-rerun corepack pnpm test:e2e -- tests/e2e/r5-ux-hardening.spec.ts`

Result:

- `FAIL / ABORTED`

Blocking incident:

- Next dev server raised `MODULE_NOT_FOUND` for `.next/server/vendor-chunks/next@15.5.15...` while compiling `/_not-found`

That is enough to stop the tranche. A hardening gate cannot be promoted on a flaky server pack.

## Route Verdict

Route-by-route verdicts are published in:

- `execution/reviews/2026-04-20T10-00-00Z-r5-ux-hardening-blocker/route-packet-alignment.md`

Every route remains `FAIL` overall for R5 because `R5-B02` through `R5-B04` do not have a green proof pack.

## Verification

- `corepack pnpm --filter @agrodomain/web test`
  - `PASS` (`16` files, `40` tests) from execution output
- `grep -RIn "\bN[0-9]\b|\bW-[0-9][0-9][0-9]\b|Wave [0-9]" apps/web --exclude-dir=node_modules --exclude-dir=.next --include=*.tsx --include=*.ts`
  - `PASS` (`0` matches; grep exit `1`)
- `corepack pnpm test:e2e -- tests/e2e/r5-ux-hardening.spec.ts`
  - first run `FAIL`
  - rerun `FAIL / ABORTED`

## R6 And R7 Status

| Phase | Verdict | Reason |
| --- | --- | --- |
| `R6` parity, reliability, release proof | `BLOCKED` | `R5` is not green; moving forward would violate the no-false-pass rule |
| `R7` staging/canary/production promotion | `BLOCKED` | `R6` is not green, so promotion is disallowed |

No staging, canary, or production promotion was attempted. No deploy IDs, URLs, or rollback pointers can be truthfully published for `R7`.
