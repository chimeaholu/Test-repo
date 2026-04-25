# AGRO-V2-RESEARCH-BRIEF

## 0) Document Control
- Working Title: `Agrodomain 2.0` (placeholder only)
- Naming Token: `[[PRODUCT_NAME]]`
- Date: 2026-04-12
- Scope: SOP 15 Phase A Step 0 ecosystem research for West Africa + Caribbean launch
- Primary Sources:
  - `/mnt/vault/MWH/Projects/Agrodomain/.planning/PROJECT.md`
  - `/mnt/vault/MWH/Projects/Agrodomain/.planning/ROADMAP.md`
  - `/mnt/vault/MWH/Projects/Agrodomain/.planning/STATE.md`
  - `/mnt/vault/MWH/Projects/Agrodomain/.planning/Agrodomain_2.0_Agentic_AI_Research.md`
  - `/mnt/vault/MWH/Projects/Agrodomain/Deliverables/Investor-Brochure-V2/README.md`
  - `/mnt/vault/MWH/Operations/SOPs/15-enterprise-swarm-development.md`

## 1) Competitive Landscape (What to Learn / Avoid)

### 1.1 Benchmarks
- Farmer advisory at scale: Farmer.Chat, Syngenta Cropwise
- Integrated services (advisory + finance): Apollo Agriculture
- AI commodity intelligence: Helios AI
- End-to-end ag services: DeHaat, Ninjacart
- Climate and MRV: ClimateAi, MyEasyFarm

### 1.2 Learn
- WhatsApp-first advisory and low-cost delivery model.
- Bundled value chain approach beats single-feature products.
- Validation/reviewer-agent pattern is becoming mandatory for trust.
- Climate and insurance become revenue multipliers when embedded in transactions.

### 1.3 Avoid
- Over-promising autonomous execution before governance controls.
- Narrow smartphone-only UX in low-connectivity markets.
- Monolithic architecture that blocks country-by-country compliance differences.
- Premature blockchain complexity in MVP.

## 2) Standard Stack Recommendation (Proven, Non-Exotic)

### 2.1 Product + Channel
- PWA frontend: Next.js + TypeScript
- WhatsApp: Meta WhatsApp Business Cloud API
- USSD: Aggregator adapter model (country-specific provider drivers)
- Notifications: SMS + WhatsApp template fallback

### 2.2 Backend + Data
- API: Node.js/TypeScript service mesh (gateway + domain services)
- Eventing: durable queue for async agent tasks and retries
- Primary DB: PostgreSQL with row-level security and audit tables
- Caching: Redis for session/state and high-read market data
- Object store: media/evidence store for crop photos and artifacts

### 2.3 AI/ML Layer
- Orchestration LLM: Claude API with strict tool contracts
- Specialized ML services: disease vision, credit scoring, price forecasting, climate features
- Retrieval: vetted knowledge base with source provenance metadata

### 2.4 Observability + Delivery
- Centralized logs, traces, and model audit events
- CI/CD with environment promotion gates
- Feature flags for channel/country rollout control

## 3) Architecture Patterns (Research-Backed)
- Domain-driven bounded contexts: Identity, Marketplace, Finance, Advisory, Climate/MRV, Supply Chain, Enterprise.
- Agentic pattern: `Orchestrator -> Specialist Agent(s) -> Reviewer Agent -> HITL checkpoint when risk threshold exceeded`.
- Data provenance first: every recommendation tied to source IDs, timestamp, and confidence.
- Offline/degraded-first: channel downgrade policy (PWA -> WhatsApp -> USSD -> SMS).
- Multi-region by design: tenant-country policy packs for language, regulation, payout rails.

## 4) API Realities and Integration Constraints
- WhatsApp templates require pre-approval and strict policy compliance.
- USSD session timeouts are short and need compact menu state.
- Mobile money and settlement rails vary by country and often need licensed partners.
- Parametric insurance and credit issuance generally require local regulated entities.
- Satellite data quality and revisit frequency differ by provider/region; fallback fusion is required.

## 5) Security, Privacy, Compliance Obligations
- Baseline obligations:
  - NDPR-aligned privacy controls for Nigeria.
  - Caribbean jurisdiction-specific data protection handling by country.
  - Explicit consent and purpose limitation for farmer data.
  - Data minimization and retention schedules per domain.
- Financial-risk modules:
  - Partner-led compliance model for licensed products in MVP.
  - Clear separation between recommendations and regulated decisions.
- AI governance:
  - Hallucination controls, prompt/tool allow-lists, output policy checks, human approval for financial/transactional commitments.

## 6) Common Pitfalls and Mitigations
- Pitfall: cross-channel state drift.
  - Mitigation: canonical workflow state store and idempotent commands.
- Pitfall: over-coupling AI agents to channel UX.
  - Mitigation: channel adapters call domain APIs; agents operate on channel-agnostic intents.
- Pitfall: low-quality farmer profile data hurting scoring/advice.
  - Mitigation: progressive profiling + confidence scores + data quality jobs.
- Pitfall: model cost spikes at scale.
  - Mitigation: model routing tiers, caching, summarization memory, strict token budgets.
- Pitfall: unverifiable agronomy guidance.
  - Mitigation: retrieval from vetted corpus + citation surfaces + reviewer agent + HITL escalation.

## 7) Multi-Region Implications (Day-One Requirement)
- Region pack model:
  - Languages, locale formats, compliance clauses, payment rails, KYC requirements.
- Deployment:
  - Single codebase, region-aware policy configuration.
- Operations:
  - Country launch checklist and go/no-go gates.
- Data:
  - Region segmentation in storage and audit exports.

## 8) Assumptions to Validate Before Build
- Availability of licensed partners for payments/insurance in each launch country.
- Stable USSD aggregator access across target operators.
- Weather/satellite coverage quality for target crop zones.
- Acceptable WhatsApp template approval cycle time.
- Sufficient local-language data quality for advisory responses.

## 9) Research Conclusions for Planning
1. The product must launch with strict governance around agent outputs or trust will fail.
2. A channel-adaptive architecture is non-negotiable for inclusion and growth.
3. Marketplace plus finance plus climate intelligence is defensible only with strong data provenance.
4. Multi-region readiness must be configuration-driven, not branch-per-country.
5. MVP should prioritize transaction trust and advisory reliability over autonomous novelty.

## 10) Naming Placeholder Guidance
- Canonical token in all planning docs: `[[PRODUCT_NAME]]`.
- Optional subtitle token: `[[PRODUCT_TAGLINE]]`.
- Replace strategy:
  - Find: `Agrodomain 2.0` and `[[PRODUCT_NAME]]`
  - Replace with approved name globally across `/mnt/vault/MWH/Projects/Agrodomain/v2-planning/`.

## 11) Step 0 API Realities Ledger (Source-Backed)

### 11.1 Priority APIs and Constraints
| Domain | API / Spec | Integration Reality | Risk | Implementation Note |
|---|---|---|---|---|
| WhatsApp channel | Meta WhatsApp Business Cloud API | Template and policy compliance gates affect delivery reliability | high | Keep template lifecycle service and SMS fallback (`FR-004`) |
| Weather/climate | NASA POWER + Open-Meteo + CHIRPS | Coverage granularity and temporal windows vary by source | medium | Build normalized climate ingestion with source confidence tags |
| Geocoding/context | OpenCage (via AgroAskAI pattern) | Location ambiguity causes recommendation drift | medium | Require geolocation confidence threshold before high-impact advice |
| Finance rails | Mobile-money/provider APIs (country specific) | Auth scopes and settlement workflows differ across providers | high | Use adapter boundary (`FR-050`) + per-country policy packs |
| MRV evidence | Sentinel/Landsat/MODIS + MRV standards | Data latency and quality vary by area/date | high | Persist assumptions and provenance (`FR-041`, `FR-042`) |

### 11.2 Official/Primary References (Citations)
- WhatsApp Cloud API docs: `https://developers.facebook.com/docs/whatsapp/cloud-api/`
- OpenWeather API docs (AgroAskAI reference pattern): `https://openweathermap.org/api`
- NASA POWER API docs: `https://power.larc.nasa.gov/docs/services/api/`
- CHIRPS dataset/service reference: `https://www.chc.ucsb.edu/data/chirps`
- Open-Meteo API docs: `https://open-meteo.com/en/docs`
- Sentinel data access (Copernicus): `https://dataspace.copernicus.eu/`
- Verra program resources (MRV context): `https://verra.org/programs/verified-carbon-standard/`
- Agrodomain planning research source set:
  - `/mnt/vault/MWH/Projects/Agrodomain/.planning/Agrodomain_2.0_Agentic_AI_Research.md`

## 12) Code-Example-Backed Integration Notes (Step 0 Evidence)

### 12.1 WhatsApp Message Send Contract (Reference Skeleton)
```http
POST /vXX.X/{phone-number-id}/messages
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "messaging_product": "whatsapp",
  "to": "recipient",
  "type": "template",
  "template": {
    "name": "settlement_update",
    "language": {"code": "en"}
  }
}
```
Implementation note: wrap with retry + fallback to SMS when template/path fails (`EP-003`).

### 12.2 Climate Provider Adapter Contract (Reference Skeleton)
```ts
type ClimateObservation = {
  source: "nasa_power" | "open_meteo" | "chirps";
  observed_at: string;
  lat: number;
  lon: number;
  rainfall_mm?: number;
  temp_c?: number;
  confidence: number;
};
```
Implementation note: never emit downstream climate recommendations without `source` + `confidence`.

### 12.3 Tool Call Envelope for Regulated Operations
```json
{
  "request_id": "uuid",
  "idempotency_key": "uuid",
  "tool_name": "finance.partner_decision.submit",
  "schema_version": "1.0.0",
  "policy_context": {"country_pack":"NG","risk_class":"high"},
  "input": {}
}
```
Implementation note: if schema/policy fails, block and route to HITL (`FR-081`, `FR-087`).

## 13) Step 0 Evidence Closure Summary
- Competitive landscape: complete (sections 1-3).
- API realities: explicit and source-linked (section 11).
- Implementation examples: included with direct architecture implications (section 12).
- Remaining uncertainty: country-specific payment/insurance partner API specifics remain approval-gated.
