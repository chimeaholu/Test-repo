# RB-001 + RB-002 Dependency-Ready Note

**Status:** PASS
**Date:** 2026-04-23
**Worker:** @codex-architect (running as Claude Opus on engineering agent)

---

## What was delivered

### RB-001 — API Client Module (Core HTTP Layer)

The core HTTP transport layer, extracted from the pre-swarm 1700-line monolith into a clean, focused module:

| File | Purpose |
|------|---------|
| `apps/web/lib/api-client.ts` | Core HTTP primitives: `requestJson`, `responseEnvelope`, `sendCommand`, token/session storage, offline queue seeding |
| `apps/web/lib/api-types.ts` | Shared types not in contracts: `SystemSettings`, `ClimateRuntimeSnapshot`, climate API record shapes, `ListingRevisionCollection` |
| `apps/web/lib/api-client.test.ts` | 18 unit tests covering responseEnvelope, localStorage, token management, requestJson, unwrapCollection, seedQueue |
| `apps/web/.env.example` | Documents `NEXT_PUBLIC_AGRO_API_BASE_URL` |
| `apps/web/.env.local` | Local dev config pointing to `http://127.0.0.1:8000` |

### RB-002 — Domain Service Modules

Each domain's API surface is now a self-contained module with its own logic (no more pass-through delegation to a monolith):

| File | Domain | Key methods |
|------|--------|-------------|
| `apps/web/lib/api/identity.ts` | Identity & Consent | `signIn`, `restoreSession`, `captureConsent`, `revokeConsent`, `evaluateProtectedAction`, offline queue |
| `apps/web/lib/api/marketplace.ts` | Listings & Negotiation | `listListings`, `createListing`, `updateListing`, `createNegotiation`, `counterNegotiation`, confirmation lifecycle |
| `apps/web/lib/api/wallet.ts` | Wallet & Escrow | `getWalletSummary`, `listWalletTransactions`, escrow CRUD (`fund`, `release`, `reverse`, `dispute`) |
| `apps/web/lib/api/climate.ts` | Climate Intelligence | `listRuntime`, `acknowledgeAlert` + normalizers + locale-aware fallback fixtures |
| `apps/web/lib/api/advisory.ts` | AI Advisory | `listConversations` + locale-aware fallback fixtures (en-GH, fr-CI, sw-KE) |
| `apps/web/lib/api/audit.ts` | Audit Trail | `getEvents` |
| `apps/web/lib/api/system.ts` | System | `getSettings` |
| `apps/web/lib/api/api-client.ts` | Backward-compat facade | Re-aggregates all domain methods into `agroApiClient` for existing consumers |
| `apps/web/lib/api/mock-client.ts` | Backward compat | Re-exports `agroApiClient` / `mockApiClient` |
| `apps/web/lib/api/index.ts` | Barrel export | All domain APIs + backward compat |

---

## Validation

- **TypeScript:** `tsc --noEmit` exits 0 (zero errors)
- **Tests:** 54/54 pass across 16 test files (including 18 new core layer tests)
- **Backward compatibility:** All existing consumers (`role-home.tsx`, `app-provider.tsx`, `admin-analytics.tsx`, feature modules) import unchanged

---

## What downstream lanes can now start

| Lane | Bead | Worker | Unblocked by |
|------|------|--------|-------------|
| Frontend Auth | RB-003 | @codex-frontend | RB-001 (core HTTP client is available) |
| DB Seeding | RB-009 | @codex-builder | Independent (was always unblocked) |
| All R0 wiring beads | RB-005 through RB-008 | @codex-dev-1, @codex-dev-2 | RB-002 (domain service modules) + RB-003 (auth) |

**RB-003 can start immediately.** It should import identity methods from `@/lib/api/identity` (or from the facade at `@/lib/api/api-client`). The auth flow (`signIn` → `restoreSession` → `captureConsent`) makes real API calls to the backend and manages session/token state in localStorage.

**RB-005 through RB-008** are unblocked on the API client side but still depend on RB-003 (auth integration) completing first.

---

## Architecture notes for downstream workers

1. **Import pattern:** `import { identityApi } from "@/lib/api/identity"` (preferred) or `import { agroApiClient } from "@/lib/api/api-client"` (backward compat)
2. **All mutations** go through `POST /api/v1/workflow/commands` via `sendCommand()` — the core handles envelope construction, idempotency keys, and traceability metadata
3. **All queries** use `requestJson()` with authenticated=true for protected endpoints
4. **Fallback fixtures** in climate and advisory modules provide offline/demo resilience — they fire automatically when the backend is unreachable or returns empty data
5. **Backend is source of truth** — the API client does NOT rewrite backend responses; it only normalizes shape differences (e.g. climate alert severity mapping)
