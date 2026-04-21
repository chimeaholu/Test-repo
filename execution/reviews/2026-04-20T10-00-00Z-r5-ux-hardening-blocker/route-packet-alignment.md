# R5 Route Packet Alignment

- Timestamp: `2026-04-20T09:14:35Z`
- Verdict policy: any route without green `R5-B02` through `R5-B04` evidence remains `FAIL`

| Route | B01 Planning Copy | B02 Accessibility/320px | B03 Localization/copy management | B04 Degraded/performance proof | Overall | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Source copy registry landed, but `R5` Playwright gate failed before 320px proof could be closed |
| `/signin` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Source copy registry landed; no green tranche pack |
| `/onboarding/consent` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Source copy registry landed; no green tranche pack |
| `/app/[role]` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Hydration/loading shell remained part of failed route sweep |
| `/app/market/listings` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No R5-green route proof |
| `/app/market/listings/[listingId]` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Copy leak removed in listing slice, but no green R5 packet |
| `/app/market/negotiations` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | N2-A2 user-facing copy removed; no green R5 packet |
| `/app/advisory/new` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Localized copy registry landed, but tranche gate failed |
| `/app/advisor/requests` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Shared advisory workspace did not receive green tranche proof |
| `/app/climate/alerts` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | N4 user-facing copy removed; no green R5 packet |
| `/app/finance/queue` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No green R5 packet |
| `/app/traceability/[consignmentId]` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No green R5 packet |
| `/app/payments/wallet` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Fixture-era copy removed; no green R5 packet |
| `/app/notifications` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Live heading exists as “Important updates across your workflow”, but route sweep never closed green |
| `/app/profile` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No green R5 packet |
| `/app/offline/outbox` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | W-003 copy removed; no green R5 packet |
| `/app/offline/conflicts/[id]` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No green R5 packet |
| `/app/cooperative/dispatch` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | No green R5 packet |
| `/app/admin/analytics` | `PASS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | Route rendered but admin API calls returned `403` during R5 sweep, blocking hardening closeout |

## Why The Matrix Is Strict

The copy-leak sweep is the only R5 sub-gate with direct green evidence. Accessibility, localization, and degraded-state proof were not closed in a green Playwright pack, and `R5` cannot be marked `PASS` on narrative review alone.
