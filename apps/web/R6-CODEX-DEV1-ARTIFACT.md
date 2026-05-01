# R6 Codex-Dev-1 Artifact

**Lane:** `codex-dev-1`  
**Scope:** `RB-055 Insurance Module (AgroShield)`  
**Date:** 2026-04-25

## Files Changed

- `apps/web/app/app/insurance/page.tsx`
- `apps/web/app/app/insurance/layout.tsx`
- `apps/web/app/app/insurance/claims/[id]/page.tsx`
- `apps/web/components/insurance/insurance-home.tsx`
- `apps/web/components/insurance/insurance-claim-detail.tsx`
- `apps/web/components/insurance/policy-card.tsx`
- `apps/web/components/insurance/coverage-flow.tsx`
- `apps/web/components/insurance/claim-timeline.tsx`
- `apps/web/components/insurance/coverage-flow.test.tsx`
- `apps/web/components/insurance/insurance-home.test.tsx`
- `apps/web/components/empty-states/insurance-empty.tsx`
- `apps/web/components/layout/nav-items.ts`
- `apps/web/components/ui/alert.tsx`
- `apps/web/components/ui/radio.tsx`
- `apps/web/lib/api/insurance.ts`
- `apps/web/lib/api/index.ts`
- `apps/web/lib/api/api-client.ts`
- `apps/web/app/globals.css`
- `apps/web/features/climate/climate-dashboard.tsx`
- `apps/web/components/farm/add-field-flow.tsx`
- `apps/web/components/farm/farm-operations-home.test.tsx`

## What Landed

- Added `/app/insurance` and `/app/insurance/claims/[id]` inside the existing protected shell with no auth or route-guard changes.
- Built an AgroShield dashboard that reads current wallet and climate runtime data, shows insured field coverage KPIs, renders active policy cards, and exposes a wallet-linked coverage enrollment flow.
- Built claim detail with timeline, trigger summary, payout panel, rainfall evidence chart, and evidence attachment cards linked to current climate data.
- Added a dedicated `insuranceApi` seam that uses live climate + wallet reads and a local policy store for enrollment persistence until canonical insurance write endpoints exist.
- Exposed AgroShield in farmer navigation and corrected the insurance empty-state CTA to point at the live route.

## Validation

- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web exec vitest run components/insurance/coverage-flow.test.tsx components/insurance/insurance-home.test.tsx`
  - PASS (`2/2`)
- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web typecheck`
  - BLOCKED by unrelated existing type errors in `features/climate/model.test.ts` and `lib/api/farm.ts`
  - AgroShield lane-specific issues cleared before rerun (`components/insurance/coverage-flow.tsx`)

## R6 Readiness Notes

- `RB-055 Insurance Module (AgroShield)`
  - UI route set is ready for R6 gate review on the current R1 design system and protected shell.
  - Coverage enrollment uses live farm/climate and wallet reads, plus deterministic premium calculation, without disturbing auth or routing behavior.
  - Claim detail is wired to current climate evidence and observations so weather-linked proof is available in-module.

## Gate Caveat

- Canonical insurance backend mutations do not exist in this tree yet. Coverage purchase persists client-side behind `lib/api/insurance.ts` while continuing to validate wallet affordability against the live AgroWallet read path.
- Full web typecheck is not globally green because unrelated farm/climate files outside RB-055 still fail type checking.
