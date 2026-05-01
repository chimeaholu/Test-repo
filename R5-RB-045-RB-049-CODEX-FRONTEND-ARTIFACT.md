# R5 RB-045 / RB-049 Codex Frontend Artifact

## Scope

- `RB-045` Wallet Home Redesign
- `RB-049` AgroFund Portal Home

## Files Changed

- `apps/web/app/app/fund/[id]/page.tsx`
- `apps/web/app/app/fund/layout.tsx`
- `apps/web/app/app/fund/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/dashboards/investor-dashboard.tsx`
- `apps/web/components/fund/fund-hero.tsx`
- `apps/web/components/fund/fund-portal-home.test.tsx`
- `apps/web/components/fund/fund-portal-home.tsx`
- `apps/web/components/fund/investment-card.tsx`
- `apps/web/components/fund/opportunity-card.tsx`
- `apps/web/components/fund/opportunity-filters.tsx`
- `apps/web/components/layout/nav-items.ts`
- `apps/web/components/ui/progress-bar.tsx`
- `apps/web/components/wallet/balance-card.tsx`
- `apps/web/components/wallet/escrow-card.tsx`
- `apps/web/components/wallet/escrow-timeline.tsx`
- `apps/web/components/wallet/transaction-table.tsx`
- `apps/web/features/fund/fund-dashboard.tsx`
- `apps/web/features/fund/model.test.ts`
- `apps/web/features/shell/model.ts`
- `apps/web/features/wallet/wallet-dashboard.test.tsx`
- `apps/web/features/wallet/wallet-dashboard.tsx`

## Delivered

- Reworked wallet home into a mobile-first finance surface with live balance context, real transaction history, escrow action cards, portfolio cues, and direct AgroFund entry points while keeping the existing wallet and escrow APIs intact.
- Added an AgroFund home route with trust-led hero, live marketplace-to-opportunity transformation, filterable opportunity cards, seed fallback behavior, and a detail-route bridge that keeps current listing and wallet data wiring in place.
- Updated investor navigation and dashboard entry points so AgroFund is a first-class destination alongside AgroWallet.
- Extended shared styling and component structure to match the R1 design system while preserving existing real data reads and mutation flows from prior waves.

## Validation

- `corepack pnpm --filter @agrodomain/web typecheck`
- `corepack pnpm exec vitest run features/wallet/wallet-dashboard.test.tsx components/fund/fund-portal-home.test.tsx`

## R5 Gate Notes

- Ready for the R5 frontend gate for `RB-045` and `RB-049`.
- Wallet actions remain wired to the existing wallet runtime and escrow command paths; no mock-only frontend behavior was introduced.
- AgroFund home derives opportunity context from live listings, escrows, wallet summary, and wallet transactions, with curated seed cards only as an empty-data fallback.
- Validation covered compile/type safety and focused wallet/fund component tests. No broader browser regression pass was run in this lane.
