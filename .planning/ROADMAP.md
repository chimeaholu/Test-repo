# Roadmap: Agrodomain 2.0

## Overview

Agrodomain 2.0 is built bottom-up: infrastructure and multi-channel access first, then the data model and marketplace core, then payments, then the AI agent architecture that powers everything, then each specialized agent (market intelligence, farm advisory, climate/MRV, finance/insurance), then supply chain traceability, then enterprise features, and finally integration testing and launch prep. Each phase delivers a standalone, verifiable capability that builds on the previous.

Execution status as of 2026-04-13: the tracked `54`-bead backend/domain package is fully built and formally QA-cleared, and a dedicated frontend program is now in execution with Waves `F1`, `F2`, and `F3` complete and formally QA-cleared under `execution/reviews/`.

### Execution Rule

This roadmap is executed autonomously by default.

- Complete each wave, run the gate, remediate if needed, rerun, and continue automatically.
- Do not pause for routine approvals between phases or gates.
- Treat screenshot-proof capture and email delivery as part of QA closeout.
- Escalate only for true external blockers or mission-critical business/design decisions.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Infrastructure** - Project scaffolding, Supabase schema, auth, CI/CD, monorepo setup
- [ ] **Phase 2: Multi-Channel Access Layer** - USSD gateway, WhatsApp integration, PWA shell, adaptive channel detection
- [ ] **Phase 3: Farmer & Cooperative Data Model** - Farmer profiles, cooperative structures, KYC, consent framework, NDPR compliance
- [ ] **Phase 4: Marketplace Core** - Product listings, offer/bid system, search, multi-commodity support
- [ ] **Phase 5: Digital Wallet & Payments** - Agro Purse, mobile money integrations, escrow, settlement
- [ ] **Phase 6: AI Agent Architecture** - Orchestrator agent, agent communication framework, Claude API integration, hallucination prevention
- [ ] **Phase 7: Market Intelligence Agent** - Commodity price monitoring, demand/supply forecasting, price discovery
- [ ] **Phase 8: Farm Advisory Agent** - Personalized crop advice, multilingual delivery, photo-based disease diagnosis
- [ ] **Phase 9: Climate & MRV Agent** - Climate-risk intelligence, carbon footprint estimation, satellite data integration, digital MRV
- [ ] **Phase 10: Finance & Insurance Agent** - ML credit scoring, parametric insurance, loan origination, crowd-farming/investor matching
- [ ] **Phase 11: Supply Chain & Traceability** - Farm-to-buyer tracking, quality certification, logistics optimization
- [ ] **Phase 12: Enterprise & Analytics** - Anonymized agricultural intelligence, white-label options, API suite
- [ ] **Phase 13: Integration, Testing & Launch Prep** - E2E testing, load testing for low-connectivity, security hardening, multi-region deployment

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Standing project with Supabase database, auth, CI/CD pipeline, monorepo structure, and dev/staging/prod environments
**Depends on**: Nothing (first phase)
**Research**: Unlikely (established patterns)
**Plans**: TBD

Plans:
- [ ] 01-01: Monorepo setup, tooling, and CI/CD pipeline
- [ ] 01-02: Supabase schema design, auth, and RLS policies
- [ ] 01-03: Dev/staging/prod environment configuration

### Phase 2: Multi-Channel Access Layer
**Goal**: Working USSD, WhatsApp, and PWA channels with adaptive detection — a farmer can reach the platform from any device
**Depends on**: Phase 1
**Research**: Likely (new integrations)
**Research topics**: USSD gateway providers (Africa's Talking, Flutterwave USSD), WhatsApp Business API setup and message templates, adaptive channel detection patterns for 2G/3G/4G
**Plans**: TBD

Plans:
- [ ] 02-01: USSD gateway integration and menu system
- [ ] 02-02: WhatsApp Business API integration
- [ ] 02-03: PWA shell with offline support
- [ ] 02-04: Adaptive channel detection and routing

### Phase 3: Farmer & Cooperative Data Model
**Goal**: Complete farmer/cooperative data model with KYC, consent management, and data privacy compliance (NDPR + Caribbean)
**Depends on**: Phase 1
**Research**: Likely (regulatory compliance)
**Research topics**: Nigeria NDPR compliance requirements, Caribbean data protection laws (Jamaica DPA, Trinidad DPA), KYC frameworks for unbanked/underbanked farmers, cooperative legal structures across target markets
**Plans**: TBD

Plans:
- [ ] 03-01: Farmer profile schema and registration flows
- [ ] 03-02: Cooperative structures and member management
- [ ] 03-03: KYC, consent framework, and NDPR/Caribbean compliance

### Phase 4: Marketplace Core
**Goal**: Functional agricultural marketplace with listings, search, offer/bid system, and multi-commodity support
**Depends on**: Phase 3
**Research**: Unlikely (standard CRUD + search patterns)
**Plans**: TBD

Plans:
- [ ] 04-01: Product listings and multi-commodity catalog
- [ ] 04-02: Offer/bid system with negotiation flows
- [ ] 04-03: Search, filtering, and buyer-seller matching

### Phase 5: Digital Wallet & Payments
**Goal**: Agro Purse digital wallet with mobile money integrations (M-Pesa, Orange Money), escrow, and settlement
**Depends on**: Phase 4
**Research**: Likely (external APIs, financial regulation)
**Research topics**: M-Pesa Daraja API, Orange Money API, Flutterwave/Paystack integration for West Africa, mobile money escrow patterns, financial licensing requirements in Nigeria and Caribbean
**Plans**: TBD

Plans:
- [ ] 05-01: Agro Purse wallet architecture and ledger
- [ ] 05-02: Mobile money integrations (M-Pesa, Orange Money, local gateways)
- [ ] 05-03: Escrow and settlement workflows

### Phase 6: AI Agent Architecture
**Goal**: Multi-agent orchestration framework with Orchestrator+Reviewer agent, Claude API integration, inter-agent communication, and hallucination prevention
**Depends on**: Phase 1
**Research**: Likely (architectural decision)
**Research topics**: Multi-agent orchestration patterns (AgroAskAI 7-agent chain-of-responsibility reference), Claude Agent SDK, inter-agent communication protocols, hallucination prevention techniques, Claude API cost optimization at scale
**Plans**: TBD

Plans:
- [ ] 06-01: Agent framework and inter-agent communication protocol
- [ ] 06-02: Orchestrator + Reviewer agent implementation
- [ ] 06-03: Claude API integration with cost controls and fallback
- [ ] 06-04: Agent testing harness and evaluation framework

### Phase 7: Market Intelligence Agent
**Goal**: Agent that monitors commodity prices, forecasts demand/supply, provides price discovery, and assists with negotiation
**Depends on**: Phase 6, Phase 4
**Research**: Likely (external data sources)
**Research topics**: Free commodity price APIs (FAO GIEWS, World Bank Commodity Prices), agricultural price forecasting ML models, demand/supply modeling for smallholder markets
**Plans**: TBD

Plans:
- [ ] 07-01: Commodity data ingestion and price monitoring
- [ ] 07-02: Price forecasting and demand/supply modeling
- [ ] 07-03: AI-assisted negotiation and price discovery

### Phase 8: Farm Advisory Agent
**Goal**: Agent that delivers personalized crop advice via WhatsApp/SMS/USSD in local languages, with photo-based disease diagnosis
**Depends on**: Phase 6, Phase 2
**Research**: Likely (specialized ML, multilingual)
**Research topics**: Crop disease detection models (PlantVillage, open-source classifiers), multilingual LLM delivery (Hausa, Yoruba, Igbo, Pidgin, Caribbean Creole), FarmerChat architecture reference ($1/farmer/year model), satellite + soil data APIs for personalized recommendations
**Plans**: TBD

Plans:
- [ ] 08-01: Advisory knowledge base and crop recommendation engine
- [ ] 08-02: Photo-based disease diagnosis pipeline
- [ ] 08-03: Multilingual delivery (local languages) via WhatsApp/SMS/USSD
- [ ] 08-04: Weather + soil data integration for personalized advice

### Phase 9: Climate & MRV Agent
**Goal**: Agent that provides climate-risk intelligence, carbon footprint estimation (IPCC/FAO), weather advisories, and digital MRV for carbon credit programs
**Depends on**: Phase 6, Phase 3
**Research**: Likely (satellite data, climate models)
**Research topics**: NASA POWER API integration, Sentinel-2 satellite imagery access, IPCC/FAO EX-ACT emission factor models, NDVI calculation from remote sensing, CHIRPS rainfall data, carbon credit verification standards (Verra, Gold Standard), MRV best practices
**Plans**: TBD

Plans:
- [ ] 09-01: Satellite data integration (Sentinel-2, MODIS, Landsat)
- [ ] 09-02: Carbon footprint estimation engine (IPCC/FAO EX-ACT)
- [ ] 09-03: Climate-risk intelligence and weather advisory
- [ ] 09-04: Digital MRV pipeline for carbon credit programs

### Phase 10: Finance & Insurance Agent
**Goal**: Agent that performs ML credit scoring, manages parametric insurance triggers, handles loan origination, and matches impact investors with cooperatives
**Depends on**: Phase 6, Phase 5, Phase 9
**Research**: Likely (financial ML, regulation)
**Research topics**: Satellite-based credit scoring models (Apollo Agriculture reference), parametric/index-based insurance trigger design, agricultural lending regulations in Nigeria/Caribbean, crowd-farming platform patterns, impact investor matching
**Plans**: TBD

Plans:
- [ ] 10-01: ML credit scoring (satellite + mobile + farm activity data)
- [ ] 10-02: Parametric insurance with satellite-triggered payouts
- [ ] 10-03: Loan origination and portfolio management
- [ ] 10-04: Crowd-farming and impact investor matching

### Phase 11: Supply Chain & Traceability
**Goal**: Farm-to-buyer tracking with quality certification, logistics optimization, and post-harvest loss prevention
**Depends on**: Phase 4, Phase 3
**Research**: Likely (standards, logistics)
**Research topics**: Agricultural traceability standards (GlobalGAP, HACCP), quality certification frameworks for export markets, last-mile logistics optimization in developing markets, post-harvest loss prevention techniques
**Plans**: TBD

Plans:
- [ ] 11-01: Farm-to-buyer tracking and quality certification
- [ ] 11-02: Logistics optimization and delivery routing
- [ ] 11-03: Post-harvest loss prevention alerts

### Phase 12: Enterprise & Analytics
**Goal**: Enterprise data analytics platform with anonymized agricultural intelligence, white-label deployment option, and API suite
**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10
**Research**: Unlikely (standard analytics/API patterns)
**Plans**: TBD

Plans:
- [ ] 12-01: Anonymized agricultural intelligence dashboard
- [ ] 12-02: API suite for third-party integration
- [ ] 12-03: White-label deployment and cooperative analytics

### Phase 13: Integration, Testing & Launch Prep
**Goal**: Production-ready platform with E2E tests, load testing for low-connectivity environments, security hardening, and multi-region deployment
**Depends on**: All previous phases
**Research**: Unlikely (standard testing/deployment patterns)
**Plans**: TBD

Plans:
- [ ] 13-01: End-to-end testing across all channels and agents
- [ ] 13-02: Load testing and low-connectivity simulation
- [ ] 13-03: Security hardening, audit, and multi-region deployment

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13
Note: Phases 2, 3, and 6 can run in parallel after Phase 1.

**Recent Execution Notes:**
- 2026-04-18: `N3-Q1` final rerun passed on canonical `master` with contracts, focused API suites, web gates, full Playwright, and audit-parity evidence green under `execution/reviews/2026-04-18T19-40-00Z-n3-q1-final-rerun`; `N3` wallet/escrow/settlement tranche is now formally closed.
- 2026-04-18: Execution advanced directly into `N4` with `execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md`, locking `B-014` to `B-019` and excluding wallet expansion, finance/insurance, traceability, and enterprise/API hardening from the tranche scope.
- 2026-04-18: `N4` closeout completed on repaired runnable baseline `118fa1b4349eb58f32ca079479ff5d050412dcc4` with `N4-G1` through `N4-G5` green under `execution/reviews/2026-04-18T21-44-57Z-n4-q1-final-rerun-118fa1b4`.
- 2026-04-18: Execution advanced directly into `N5` with `execution/specs/2026-04-18-n5-wave5-finance-insurance-traceability-tranche.md`, locking `B-020` to `B-024` and explicitly excluding `B-025` to `B-030`, Wave 6/admin-hardening, deploy work, and non-regression expansion outside finance/insurance decision surfaces and traceability evidence.
- 2026-04-19: `N5-Q1` final closeout passed under `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/reviews/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun-cd254ff7`, closing `N5-G1` through `N5-G5` on promoted sparse integrated baseline `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`.
- 2026-04-19: Execution advanced directly into `N6` with `execution/specs/2026-04-19-n6-wave6-admin-observability-rollout-reliability-tranche.md`, locking `B-025` to `B-030` to admin observability, rollout controls, reliability hardening, and release/rollback ops only.
- 2026-04-13: Final frontend gate verification passed on publish HEAD `64bec687` with a fresh integrated regression run (`91 passed in 1.65s`), and new frontend final-gate, refreshed Step `9d`, refreshed SOP delta, and frontend release-readiness artifacts were published without push/deploy.
- 2026-04-13: Frontend Wave `F4` landed on commit `21e50566` with `F-022` contract adapters, `F-023` route loader/mutation services, `F-024` performance budgets, `F-025` frontend automation harnessing, `F-026` frontend architecture review gating, and `F-027` frontend plan traceability review; exact-SHA QA, rolling review, architecture check, refreshed frontend Step `9d` / SOP delta artifacts, and a frontend completion rollup were published, bringing the frontend program to `27 / 27`.
- 2026-04-13: Frontend Wave `F3` landed on commit `07df3192` with `F-014` finance queue and decision detail, `F-015` traceability timeline and evidence gallery, `F-016` evidence capture and upload queue, `F-017` offline outbox and conflict UI, `F-018` notifications center, `F-019` cooperative operations surfaces, `F-020` advisor workbench surfaces, and `F-021` admin analytics and observability; exact-SHA QA, rolling review, architecture check, and refreshed frontend Step `9d` / SOP delta artifacts were published.
- 2026-04-13: `B-033` landed with typed memory taxonomy, type-scoped freshness scoring, and pytest coverage for validation and freshness metadata persistence.
- 2026-04-13: Frontend Wave `F2` landed on commit `2374b93f` with `F-006` farmer and buyer home queues, `F-007` listing index/detail routes, `F-008` listing create wizard, `F-009` negotiation inbox/thread, `F-010` escrow and wallet center, `F-011` advisory request/answer routes, `F-012` citation and proof drawer, and `F-013` climate alerts center/detail; exact-SHA QA, rolling review, architecture check, and refreshed frontend Step `9d` / SOP delta artifacts were published.
- 2026-04-13: `B-034` landed with selective top-k recall, freshness-aware ranking, and explicit stale-memory revalidation flags, which unblocked `B-037`.
- 2026-04-13: `B-037` landed with deterministic eval fixtures, metric scoring for reasoning/tool/grounding quality, and commit-pinned QA evidence for the intelligence benchmark lane.
- 2026-04-13: `B-005` landed as a minimal unblock slice with WhatsApp inbound parsing, template strategy, and fallback-hook signaling, which unblocked `B-013`.
- 2026-04-13: Formal QA coverage was refreshed across all built beads through the latest Wave 2 / 2.5 commits, keeping built-bead exact-SHA signoff at `100%`.
- 2026-04-13: `B-044` landed with the canonical `ARM-001..ARM-004` low-end Android harness, executable budget checks, and commit-pinned QA that closes the approved Android-readiness implementation lane.
- 2026-04-13: `B-018` landed with farm-context climate threshold rules, alert precedence ordering, canonical-state emission, and commit-pinned QA that advances Wave 3 beyond ingestion-only climate signals.
- 2026-04-13: `B-045` landed with a country-aware device registry schema, lifecycle transitions, lineage persistence, and commit-pinned QA that opens Wave 2.7 on the approved IoT-readiness seam.
- 2026-04-13: `B-019` landed with MRV evidence records, explicit assumptions, append-only audit provenance, and commit-pinned QA that closes the post-`B-018` climate evidence gap.
- 2026-04-13: `B-046` landed with a versioned sensor event envelope, registry-bound provenance metadata, and commit-pinned QA that advances the IoT lane from identity into telemetry-contract shape.
- 2026-04-13: `B-047` landed with versioned batch-ingest semantics, replay-safe idempotency, resume-token validation, and commit-pinned QA that completes the next IoT-readiness continuation after the sensor envelope contract.
- 2026-04-13: `B-020` landed with a regulated partner decision adapter, explicit responsibility ownership, strict request-envelope validation, and commit-pinned QA that closes the finance integration-boundary gap.
- 2026-04-13: `B-021` landed with approved-insurance-bound parametric trigger thresholds, source-linked payout events, deduped trigger evaluation, and commit-pinned QA that extends Wave 3 from partner decisions into payout logic.
- 2026-04-13: `B-049` landed with additive digital twin schema enforcement, country-scoped sensor-origin governance tags, and explicit hardware-deferred guardrails that close Wave 2.7 on the approved IoT-readiness boundary.
- 2026-04-13: `B-024` landed with attachment capture validation, event-linked evidence gallery projection, and empty/filtered-empty state coverage that turns the traceability chain into operator-visible quality evidence handling.
- 2026-04-13: `B-025` landed with anonymized enterprise analytics mart projections, citation-backed provenance, and climate-plus-traceability metric rollups that open the first Wave 4 reporting seam without leaking raw operator identifiers.
- 2026-04-13: Exact-SHA formal QA was refreshed for `B-049`, `B-024`, and `B-025`; the built-bead rollup remains `PASS` at `42 / 42`, and rolling review, architecture check, Step `9d` snapshot, and SOP delta artifacts were advanced to the post-`B-025` state.
- 2026-04-13: `B-026` landed with scoped partner credentials, country-limited authorization, append-only access-audit records, and exact-SHA QA that extends Wave 4 from mart projection into partner-boundary delivery.
- 2026-04-13: `B-027` landed with idempotent telemetry capture, channel/country SLO evaluation, and risk-graded alert decisions that harden the enterprise lane without locking the repo to one observability vendor.
- 2026-04-13: `B-050` landed with explicit typography/color/spacing tokens and component conformance rules, opening the UX hard gate through an executable visual-language contract.
- 2026-04-13: Frontend Wave `F1` landed on commit `5861a737` with `F-001` unified app shell and role routing, `F-002` consent and identity UI, `F-003` frontend design-token bindings, `F-004` routed interaction-state primitives, and `F-005` accessibility primitives; exact-SHA QA, rolling review, architecture check, and refreshed frontend Step `9d` / SOP delta artifacts were published.
- 2026-04-13: Exact-SHA formal QA was refreshed for `B-026`, `B-027`, and `B-050`; the built-bead rollup remains `PASS` at `45 / 45`, and rolling review, architecture check, Step `9d` snapshot, and SOP delta artifacts were advanced to the post-`B-050` state.
- 2026-04-13: `B-051` landed with critical-flow interaction standards for loading, error, offline, retry, and trust states, tied to the visual-language contract and offline handoff seam so the UX hard gate now extends beyond tokens into executable feedback coverage.
- 2026-04-13: `B-004` landed with compact USSD menu/session primitives, deterministic serialization, and explicit timeout recovery backed by the canonical state store, closing the oldest multi-channel blocker.
- 2026-04-13: `B-028` landed with canonical fixtures plus real USSD/WhatsApp/PWA stubs for `CJ-001..008` and `EP-001..008`, turning the previously blocked automation lane into built QA infrastructure.
- 2026-04-13: Exact-SHA formal QA was refreshed for `B-051`, `B-004`, and `B-028`; the built-bead rollup remains `PASS` at `48 / 48`, and rolling review, architecture check, Step `9d` snapshot, and SOP delta artifacts were advanced to the post-`B-028` state.
- 2026-04-13: `B-052` landed with executable low-literacy/mobile accessibility standards, component-bound readability thresholds, and workflow-wide coverage validation so the UX hard gate now includes a real accessibility/readability compliance seam on top of the visual-language and feedback libraries.
- 2026-04-13: `B-053` landed with a low-end Android UX polish harness that binds the approved performance matrix to UX clarity checks for offline handoff, short CTAs, trust cues, and bounded step counts across the canonical mobile cohort.
- 2026-04-13: `B-029` landed as an executable plan adversarial review gate that flags missing bead reviews, unresolved dependencies, incomplete test obligations, and traceability-matrix gaps before Wave 4 closeout can claim review completeness.
- 2026-04-13: Exact-SHA formal QA was refreshed for `B-052`, `B-053`, and `B-029`; the built-bead rollup remains `PASS` at `51 / 51`, and rolling review, architecture check, Step `9d` snapshot, and SOP delta artifacts were advanced to the post-`B-029` state.
- 2026-04-13: `B-054` landed with an executable UX excellence review gate that splits pre-build and pre-release signoff, treats generic/template-like output as a blocker, and enforces the final `UXG-001` / `UXDI-005` closeout lane for Wave 2.8.
- 2026-04-13: `B-030` landed with an executable architecture adversarial review gate that validates service-boundary integrity, scale evidence, security controls, deployment readiness, and architecture-to-requirement mapping for Wave 4 closeout.
- 2026-04-13: Tracker reconciliation found an overlooked remaining bead, `B-002`, and closed it with a country-aware identity/consent state machine plus consent capture/revocation contract so the foundation lane now matches the actual backlog.
- 2026-04-13: Exact-SHA formal QA was refreshed for `B-054`, `B-030`, and `B-002`; the built-bead rollup is now corrected to `54 / 54`, with rolling review, architecture check, Step `9d` snapshot, and SOP delta artifacts advanced to the full planned-package state.
- 2026-04-13: Final closeout artifacts were published for Step `12` browser proof refresh, approval/acceptance evidence, Agent Mail coordination evidence, final Step `9d` wave-state, final SOP delta, and release-readiness summary; Agrodomain is now build-complete and evidence-pack complete under the current no-push/no-deploy constraint.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation & Infrastructure | 0/3 | Not started | - |
| 2. Multi-Channel Access Layer | 0/4 | Not started | - |
| 3. Farmer & Cooperative Data Model | 0/3 | Not started | - |
| 4. Marketplace Core | 0/3 | Not started | - |
| 5. Digital Wallet & Payments | 0/3 | Not started | - |
| 6. AI Agent Architecture | 0/4 | Not started | - |
| 7. Market Intelligence Agent | 0/3 | Not started | - |
| 8. Farm Advisory Agent | 0/4 | Not started | - |
| 9. Climate & MRV Agent | 0/4 | Not started | - |
| 10. Finance & Insurance Agent | 0/4 | Not started | - |
| 11. Supply Chain & Traceability | 0/3 | Not started | - |
| 12. Enterprise & Analytics | 0/3 | Not started | - |
| 13. Integration, Testing & Launch | 0/3 | Not started | - |
