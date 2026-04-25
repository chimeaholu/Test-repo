# R4 Codex Dev 2 Artifact

## Scope

- `RB-039` Create Listing Flow (4-Step Wizard)
- `RB-041` Negotiation Thread Redesign

## Files Changed

- `apps/web/app/app/market/listings/create/page.tsx`
- `apps/web/app/app/market/negotiations/[id]/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/marketplace/listing-wizard/types.ts`
- `apps/web/components/marketplace/listing-wizard/step-basic.tsx`
- `apps/web/components/marketplace/listing-wizard/step-pricing.tsx`
- `apps/web/components/marketplace/listing-wizard/step-media.tsx`
- `apps/web/components/marketplace/listing-wizard/step-review.tsx`
- `apps/web/components/marketplace/listing-wizard/wizard-container.tsx`
- `apps/web/components/marketplace/listing-wizard/wizard-container.test.tsx`
- `apps/web/components/marketplace/conversation-list.tsx`
- `apps/web/components/marketplace/negotiation-thread.tsx`
- `apps/web/components/marketplace/offer-card.tsx`
- `apps/web/components/molecules/step-indicator.tsx`
- `apps/web/features/listings/listing-slice.tsx`
- `apps/web/features/listings/listing-slice.test.tsx`
- `apps/web/features/negotiation/negotiation-inbox.tsx`
- `apps/web/features/negotiation/negotiation-inbox.test.tsx`

## Delivered

- Added seller-facing `/app/market/listings/create` 4-step wizard with per-step validation, local draft persistence, photo preview/rotate, review card preview, and real `createListing` -> optional `publishListing` command flow.
- Replaced the seller inline create form on `/app/market/listings` with a CTA into the wizard while preserving the existing inventory and listing detail behavior.
- Redesigned negotiations into a searchable conversation list plus chat-style active thread with offer cards, confirmation cards, mobile back behavior, optimistic thread/message updates, and preserved marketplace mutations.
- Added direct thread route support at `/app/market/negotiations/[id]` without breaking the existing inbox route/query-param behavior.

## Validation

- `corepack pnpm exec vitest run components/marketplace/listing-wizard/wizard-container.test.tsx features/negotiation/negotiation-inbox.test.tsx features/listings/listing-slice.test.tsx`
- `corepack pnpm exec tsc --noEmit`

## R4 Gate Notes

- Ready for R4 gate on frontend scope.
- Wizard publish path uses the existing listing command bus and resets to a clean default draft after publish.
- Photo handling is intentionally local-preview-only in this lane; cloud upload and persisted media still depend on `RB-043`.
- Conversation unread dots are heuristic, derived from latest counterparty activity; true unread state still needs backend support if required later.
