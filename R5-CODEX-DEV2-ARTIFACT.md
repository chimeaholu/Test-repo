# R5 Codex Dev 2 Artifact

## Scope

- `RB-048` Escrow Integration with Marketplace
- `RB-051` Wallet and Fund Mobile States
- `RB-052` Wallet/Fund Notifications and Empty States

## Files Changed

- `apps/web/app/app/fund/page.tsx`
- `apps/web/app/app/fund/my-investments/page.tsx`
- `apps/web/app/r3-pages.css`
- `apps/web/components/dashboards/investor-dashboard.tsx`
- `apps/web/components/empty-states/fund-empty.tsx`
- `apps/web/components/empty-states/index.ts`
- `apps/web/components/empty-states/wallet-empty.tsx`
- `apps/web/components/fund/fund-hero.tsx`
- `apps/web/components/fund/fund-portal-home.tsx`
- `apps/web/components/fund/investment-card.tsx`
- `apps/web/components/fund/opportunity-card.tsx`
- `apps/web/components/fund/opportunity-filters.tsx`
- `apps/web/components/marketplace/escrow-prompt.tsx`
- `apps/web/components/marketplace/negotiation-thread.tsx`
- `apps/web/components/wallet/balance-card.tsx`
- `apps/web/components/wallet/escrow-card.tsx`
- `apps/web/components/wallet/escrow-management.tsx`
- `apps/web/components/wallet/escrow-timeline.tsx`
- `apps/web/components/wallet/transaction-table.tsx`
- `apps/web/features/fund/fund-dashboard.tsx`
- `apps/web/features/fund/model.ts`
- `apps/web/features/fund/model.test.ts`
- `apps/web/features/negotiation/negotiation-inbox.tsx`
- `apps/web/features/notifications/model.ts`
- `apps/web/features/notifications/notifications-center.tsx`
- `apps/web/features/wallet/wallet-dashboard.tsx`
- `apps/web/lib/api/wallet.ts`
- `apps/web/lib/fund.test.ts`

## Delivered

- Added accepted-thread escrow initiation in the negotiation workspace using the existing `wallets.escrows.initiate` command path, with thread-linked wallet follow-through and a compact escrow status surface.
- Added `AgroFund` opportunity and portfolio pages that stay inside current marketplace and wallet read models, so investor/mobile flows work without introducing a new backend dependency.
- Extended finance notifications and empty states to deep-link into wallet escrow records and AgroFund opportunity views.
- Preserved existing buyer/seller/finance wallet actions and wallet mutation flows; all new fund UX is additive and read-model based.

## Validation

- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web exec vitest run /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/fund/model.test.ts /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/notifications/model.test.ts /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/wallet/model.test.ts /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/wallet/wallet-dashboard.test.tsx /mnt/vault/MWH/Projects/Agrodomain/apps/web/lib/fund.test.ts`
- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web typecheck`

## R5 Gate Notes

- Ready for the R5 frontend gate on this lane.
- AgroFund pages intentionally derive opportunities and portfolio state from existing marketplace listings, escrows, wallet summary, and wallet transactions until dedicated fund APIs land.
- Escrow initiation is now available directly after negotiation acceptance, but downstream settlement actions remain canonical in AgroWallet.
