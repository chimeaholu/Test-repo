# R0 Backend Audit — Beads RB-005 through RB-009

**Date:** 2026-04-23
**Auditor:** engineering agent
**Scope:** API routes, services, schemas, seeds, and command-bus contracts supporting Wave R0 frontend beads

---

## 1. Route / Module Coverage Map

### Backend API Routes (9 routers, all under `/api/v1/`)

| Router File | Prefix | Endpoints | Status |
|-------------|--------|-----------|--------|
| `identity.py` | `/identity` | POST /session, GET /session, POST /consent, POST /consent/revoke | LIVE |
| `marketplace.py` | `/marketplace` | GET /listings, GET /listings/{id}, GET /listings/{id}/revisions, GET /negotiations, GET /negotiations/{id} | LIVE |
| `wallet.py` | `/wallet` | GET /summary, GET /transactions, GET /escrows, GET /escrows/{id} | LIVE |
| `climate.py` | `/climate` | GET /alerts, GET /alerts/{id}, POST /alerts/{id}/acknowledge, GET /degraded-modes, GET /farms/{id}, GET /observations, GET /mrv-evidence, GET /evidence | LIVE |
| `advisory.py` | `/advisory` | GET /requests, GET /conversations, GET /requests/{id} | LIVE |
| `audit.py` | `/audit` | GET /events | LIVE |
| `commands.py` | `/workflow` | POST /commands (20 command types) | LIVE |
| `system.py` | `/system` | GET /healthz, GET /readyz, GET /settings | LIVE |
| `preview.py` | `/` | GET / (503 fallback) | LIVE |

### Frontend → Backend Wiring (current state)

All feature components already import from domain-specific API modules (`@/lib/api/marketplace`, `@/lib/api/wallet`, etc.), **not** from mock-client. The `mock-client.ts` file is a 2-line re-export of the real `api-client.ts`.

| Feature File | Imports From | Backend Routes Used |
|--------------|-------------|---------------------|
| `listing-slice.tsx` | `marketplace`, `audit` | marketplace/listings, marketplace/negotiations, workflow/commands, audit/events |
| `negotiation-inbox.tsx` | `marketplace`, `audit` | marketplace/negotiations, workflow/commands, audit/events |
| `wallet-dashboard.tsx` | `wallet`, `audit` | wallet/summary, wallet/transactions, wallet/escrows, workflow/commands, audit/events |
| `climate-dashboard.tsx` | `climate` | climate/alerts, climate/degraded-modes, climate/mrv-evidence, climate/alerts/{id}/acknowledge |
| `conversation-workspace.tsx` | `advisory` | advisory/conversations |
| `notifications-center.tsx` | `climate`, `wallet` | wallet/escrows, climate/alerts + degraded-modes + mrv-evidence |
| `consignment-timeline.tsx` | `marketplace`, `wallet` | marketplace/listings, marketplace/listings/{id}/revisions, marketplace/negotiations, wallet/escrows |
| `finance-queue.tsx` | `wallet` | wallet/escrows |
| `dispatch-board.tsx` | `marketplace` | marketplace/listings, marketplace/negotiations |

---

## 2. Missing Backend Surfaces by Bead

### RB-005 — Marketplace Pages (Wire to Real API)
**Backend coverage: COMPLETE**
- `GET /marketplace/listings` — exists, role-based filtering
- `GET /marketplace/listings/{id}` — exists
- `GET /marketplace/listings/{id}/revisions` — exists
- `GET /marketplace/negotiations` — exists
- `GET /marketplace/negotiations/{id}` — exists
- Commands: `market.listings.create`, `market.listings.update`, `market.listings.publish`, `market.listings.unpublish`, `market.negotiations.create`, `market.negotiations.counter`, `market.negotiations.confirm.*` — all 9 handlers present
- **Missing: NOTHING** — full CRUD + negotiation lifecycle covered

### RB-006 — Wallet Pages (Wire to Real API)
**Backend coverage: COMPLETE**
- `GET /wallet/summary` — exists with currency param
- `GET /wallet/transactions` — exists
- `GET /wallet/escrows` — exists
- `GET /wallet/escrows/{id}` — exists with timeline
- Commands: `wallets.fund`, `wallets.escrows.initiate`, `wallets.escrows.fund`, `wallets.escrows.release`, `wallets.escrows.reverse`, `wallets.escrows.dispute_open`, `wallets.escrows.mark_partner_pending` — all 7 handlers present
- **Missing: NOTHING** — full wallet + escrow lifecycle covered

### RB-007 — Climate / Advisory / Traceability / Notifications (Wire to API)
**Backend coverage: MOSTLY COMPLETE with caveats**

| Sub-domain | Status | Notes |
|-----------|--------|-------|
| Climate alerts | COVERED | GET /alerts, GET /alerts/{id}, POST /alerts/{id}/acknowledge |
| Climate observations | COVERED | GET /observations, GET /degraded-modes |
| MRV evidence | COVERED | GET /mrv-evidence, GET /evidence |
| Farm profiles | COVERED | GET /farms/{id} |
| Advisory conversations | COVERED | GET /conversations, GET /requests, GET /requests/{id} |
| Traceability | COVERED via composition | consignment-timeline composes marketplace + wallet data; no dedicated traceability route needed |
| Notifications | COVERED via composition | notifications-center composes escrows + climate alerts; no dedicated notification route needed |

**Missing surfaces:**
- **No dedicated `/notifications` route** — but the frontend composes notifications from wallet escrows + climate alerts + consent state + offline queue. No backend gap.
- **No dedicated `/traceability` route** — but the frontend composes from listings, revisions, negotiations, escrows. No backend gap.
- Advisory `submit` and `reviewer.decide` commands exist but the frontend conversation-workspace only reads conversations (GET). Write commands are advisory-internal.

### RB-008 — Finance / Cooperative / Offline (Wire to Real API)
**Backend coverage: COMPLETE (via composition)**

| Sub-domain | Frontend Component | Backend Surface | Gap? |
|-----------|-------------------|-----------------|------|
| Finance | `finance-queue.tsx` | `walletApi.listEscrows()` → GET /wallet/escrows | NO — finance queue is an escrow review view |
| Cooperative | `dispatch-board.tsx` | `marketplaceApi.listListings()` + `listNegotiations()` → GET /marketplace/* | NO — dispatch board composes listing + negotiation data |
| Offline | local storage only | `getQueue()` / `storeQueue()` are localStorage operations | NO — no backend route needed; offline queue is client-side |

**Key insight:** Finance, cooperative, and offline pages are **read-only composition views** over existing domain data. They do not introduce new mutations or new aggregate types. The backend already serves all required data through marketplace and wallet routes.

### RB-009 — Database Demo Seeding Script
**Backend coverage: INSUFFICIENT — requires new work**

**What exists:**
- `apps/api/app/db/migrations/seed.py` — minimal bootstrap seed:
  - 2 country policies (GH, NG)
  - 1 admin membership (`system:test`)
  - 1 consent record
  - 1 workflow definition
  - 3 advisory source documents

**What does NOT exist:**
- `apps/api/app/seed_demo_data.py` — **DOES NOT EXIST** (RB-009 output file)
- `apps/api/scripts/seed.sh` — **DOES NOT EXIST** (RB-009 output file)
- No demo users with realistic roles (farmer, buyer, cooperative_admin, advisor, finance_ops)
- No demo listings with varied commodities
- No demo negotiation threads at different lifecycle stages
- No demo wallet balances or escrow records
- No demo farm profiles or climate data
- No demo advisory conversations

---

## 3. Demo Seed Script — What to Build (RB-009)

`seed_demo_data.py` must create via the existing repository layer:

| Entity | Count | Notes |
|--------|-------|-------|
| Users (IdentitySessionRecord) | 6-8 | One per role: farmer, buyer, coop_admin, advisor, finance_ops, admin; with granted consent |
| Farm profiles | 2-3 | Tied to farmer actors, GH/NG |
| Listings | 5-8 | Mix of draft/published, various crops (maize, rice, cocoa, yam) |
| Negotiation threads | 3-4 | open, pending_confirmation, confirmed states |
| Wallet accounts | 4-6 | One per transacting actor |
| Wallet ledger entries | 8-12 | Fund + escrow-related movements |
| Escrow records | 2-3 | funded, released, disputed states |
| Climate observations | 3-5 | Varied farm_id, source_type |
| Climate alerts | 2-3 | open + acknowledged |
| MRV evidence | 1-2 | Tied to farm profiles |
| Advisory requests | 2-3 | With response_text and citations |

`scripts/seed.sh` should:
1. Run Alembic migrations (`alembic upgrade head`)
2. Call `python -m app.db.migrations.seed` (baseline)
3. Call `python -m app.seed_demo_data` (rich demo data)

---

## 4. Command-Bus Contracts the Frontend Must Preserve

All mutations flow through `POST /api/v1/workflow/commands` with a `CommandEnvelope`:

```
CommandEnvelope {
  metadata: {
    schema_version: "2026.04",
    request_id: uuid,
    idempotency_key: uuid,
    actor_id: string,
    country_code: "GH" | "NG",
    channel: string,
    correlation_id: uuid,
    occurred_at: ISO timestamp,
    traceability: { journey_ids: string[], data_check_ids: string[] }
  },
  command: {
    name: string,         // e.g. "market.listings.create"
    aggregate_ref: string, // target entity ID
    mutation_scope: string,
    payload: object        // command-specific, validated against contract schema
  }
}
```

### Commands by Domain

**Marketplace (9):**
- `market.listings.create` / `update` / `publish` / `unpublish`
- `market.negotiations.create` / `counter`
- `market.negotiations.confirm.request` / `approve` / `reject`

**Wallet & Escrow (7):**
- `wallets.fund`
- `wallets.escrows.initiate` / `fund` / `release` / `reverse` / `dispute_open` / `mark_partner_pending`

**Climate (3):**
- `climate.observations.ingest` / `climate.mrv.create` / `climate.alerts.acknowledge`

**Advisory (2):**
- `advisory.requests.submit` / `advisory.reviewer.decide`

**Frontend callers must preserve:**
1. Full `CommandEnvelope` structure including traceability metadata
2. `idempotency_key` for safe retries
3. `schema_version: "2026.04"` header
4. Contract-validated payloads per command (Zod schemas in `@agrodomain/contracts`)
5. Bearer token in Authorization header

---

## 5. Go / No-Go Verdicts

### RB-008 (Finance / Cooperative / Offline) — GO

**Rationale:**
- All three sub-pages are **read-only composition views** that consume existing backend routes
- `finance-queue.tsx` → `GET /wallet/escrows` (done)
- `dispatch-board.tsx` → `GET /marketplace/listings` + `GET /marketplace/negotiations` (done)
- Offline → purely client-side localStorage queue (no backend needed)
- The frontend components are already wired to the correct domain API modules
- No new backend routes, models, or commands required
- **Risk: NONE** — this bead is essentially already wired. The remaining work is UI polish and removing any residual mock data fallbacks.

### RB-009 (Database Demo Seeding Script) — GO with conditions

**Rationale:**
- The target files (`seed_demo_data.py`, `scripts/seed.sh`) do not exist yet — clean slate
- All required repository methods and DB models are in place
- The existing `seed.py` provides the pattern to follow
- **Condition:** The script must use the repository layer (not raw SQL) to maintain referential integrity and trigger any model-level defaults
- **Condition:** Must seed users with `consent_state = "consent_granted"` so demo pages render without requiring manual consent flow
- **Condition:** Must be idempotent (safe to re-run)
- **Risk: LOW** — straightforward data insertion through well-tested repositories

---

## Summary

| Bead | Backend Ready? | Gaps | Verdict |
|------|---------------|------|---------|
| RB-005 Marketplace | YES — 5 GET routes + 9 commands | None | GO |
| RB-006 Wallet | YES — 4 GET routes + 7 commands | None | GO |
| RB-007 Climate/Advisory/Trace/Notif | YES — 8 climate + 3 advisory GET routes + 5 commands | None (composition pattern handles trace/notif) | GO |
| RB-008 Finance/Coop/Offline | YES — reuses marketplace + wallet routes | None (composition + localStorage) | GO |
| RB-009 Demo Seeding | NO — seed files don't exist | Must build `seed_demo_data.py` + `scripts/seed.sh` | GO with conditions |
