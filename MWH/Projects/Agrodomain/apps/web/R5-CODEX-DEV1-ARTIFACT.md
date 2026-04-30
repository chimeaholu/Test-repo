# R5 Codex-Dev-1 Artifact

**Lane:** `codex-dev-1`  
**Scope:** `RB-046 Add Funds Flow`, `RB-047 Send Money Flow`, `RB-050 Farm Opportunity Detail and Fund-a-Farm Flow`  
**Date:** 2026-04-24

## Files Changed

- `apps/api/app/api/routes/identity.py`
- `apps/api/app/api/routes/wallet.py`
- `apps/api/app/db/repositories/identity.py`
- `apps/api/tests/integration/test_wallet_transfer_routes.py`
- `packages/contracts/src/ledger/index.ts`
- `apps/web/lib/api/identity.ts`
- `apps/web/lib/api/wallet.ts`
- `apps/web/features/wallet/wallet-dashboard.tsx`
- `apps/web/components/wallet/payment-method-selector.tsx`
- `apps/web/components/wallet/mobile-money-form.tsx`
- `apps/web/components/wallet/bank-transfer-form.tsx`
- `apps/web/components/wallet/add-funds-flow.tsx`
- `apps/web/components/wallet/recipient-search.tsx`
- `apps/web/components/wallet/transfer-confirm.tsx`
- `apps/web/components/wallet/send-money-flow.tsx`
- `apps/web/lib/fund.ts`
- `apps/web/lib/fund.test.ts`
- `apps/web/app/app/fund/layout.tsx`
- `apps/web/app/app/fund/page.tsx`
- `apps/web/app/app/fund/[id]/page.tsx`
- `apps/web/app/app/fund/my-investments/page.tsx`
- `apps/web/components/fund/opportunity-card.tsx`
- `apps/web/components/fund/opportunity-filters.tsx`
- `apps/web/components/fund/fund-hero.tsx`
- `apps/web/components/fund/how-it-works.tsx`
- `apps/web/components/fund/farm-detail.tsx`
- `apps/web/components/fund/invest-flow.tsx`
- `apps/web/components/fund/investment-card.tsx`
- `apps/web/components/fund/portfolio-summary.tsx`
- `apps/web/components/dashboards/investor-dashboard.tsx`
- `apps/web/app/globals.css`

## What Landed

- Added wallet funding UI on the existing wallet dashboard with payment method selection plus mobile money and bank transfer forms wired to the current `wallets.fund` command.
- Added send money flow on the wallet dashboard with authenticated actor search, recipient validation, confirmation, and dual-ledger transfer posting.
- Added authenticated actor search support for transfer recipients through `GET /api/v1/identity/actors/search`.
- Added authenticated wallet transfer support through `POST /api/v1/wallet/transfers`, including self-transfer blocking and same-country recipient validation.
- Added `/app/fund`, `/app/fund/[id]`, and `/app/fund/my-investments` using the current marketplace listings and wallet data flows without changing auth or route guards.
- Linked investor dashboard detail navigation into the new farm opportunity route.

## Validation

- `pytest apps/api/tests/integration/test_wallet_transfer_routes.py -q`
  - PASS (`1/1`)
- `corepack pnpm exec vitest run lib/fund.test.ts features/fund/model.test.ts`
  - PASS (`5/5`)
- `corepack pnpm --filter @agrodomain/web typecheck`
  - PASS

## R5 Readiness Notes

- `RB-046 Add Funds Flow`
  - Ready for gate review on the live wallet funding command path.
- `RB-047 Send Money Flow`
  - Ready for gate review on the live wallet transfer path with recipient search and ledger updates.
- `RB-050 Farm Opportunity Detail and Fund-a-Farm`
  - Route set is ready on current marketplace and wallet reads.
  - Investment capture currently records the investor portfolio client-side after the live wallet transfer succeeds. This preserves current behavior and keeps the UI usable until canonical fund persistence is merged.

## Gate Caveats

- No auth or routing guards were changed.
- Canonical fund investment persistence remains a backend follow-on. The current UI uses the existing listing and wallet flows plus a local portfolio seam to avoid blocking RB-050.
