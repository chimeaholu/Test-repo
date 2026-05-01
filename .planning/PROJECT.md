# Agrodomain 2.0 (Working Title — Rebrand TBD)

## What This Is

An AI-first agricultural super platform that integrates marketplace trading, agricultural finance, farmer advisory, supply chain traceability, and climate intelligence into a single multi-agent system. Built by MWH for simultaneous deployment across West Africa and the Caribbean (6 GRIT nations), serving smallholder farmers, cooperatives, agribusinesses, and enterprise clients through adaptive multi-channel access (USSD, WhatsApp, mobile app).

## Core Value

The integrated multi-agent AI platform IS the differentiator — no existing platform combines AI marketplace + AgFintech + conversational commerce + supply chain traceability + climate intelligence into one system. The whole is greater than the sum of its parts.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Marketplace & Trading**
- [ ] B2B/B2C agricultural marketplace with AI-powered buyer-seller matching
- [ ] AI-driven price discovery and commodity price forecasting
- [ ] Firm and negotiable offer/bid system with AI-assisted negotiation recommendations
- [ ] Multi-commodity support (crops, livestock, fish, poultry, farm inputs)
- [ ] Digital payment processing with escrow and settlement

**AgFintech (Credit + Insurance)**
- [ ] ML-based credit scoring using satellite imagery, mobile data, and farm activity
- [ ] Parametric/index-based crop insurance with satellite-triggered payouts
- [ ] Digital wallet (Agro Purse) with mobile money integration (M-Pesa, Orange Money, local gateways)
- [ ] Crowd-farming/impact investment matching for cooperatives and farmer groups
- [ ] Automated loan origination and portfolio management

**Advisory & Extension**
- [ ] AI-powered personalized crop advice via WhatsApp, SMS, voice, and USSD
- [ ] Multilingual support (English, French, Pidgin, Hausa, Yoruba, Igbo, Caribbean Creole dialects)
- [ ] Satellite + weather + soil data integration for planting, irrigation, pest management
- [ ] Photo-based crop disease diagnosis
- [ ] Climate-smart farming recommendations

**Supply Chain & Traceability**
- [ ] Farm-to-buyer tracking with quality certification
- [ ] Database-backed traceability records (blockchain in v2)
- [ ] Logistics optimization and delivery routing
- [ ] Post-harvest loss prevention alerts
- [ ] Carbon MRV (Monitoring, Reporting, Verification) for carbon credit programs

**AI Agent Architecture (7 Agents)**
- [ ] Market Intelligence Agent — commodity monitoring, demand/supply forecasting, price negotiation assistance
- [ ] Farm Advisory Agent — personalized crop guidance, disease diagnosis, local language delivery
- [ ] Climate & MRV Agent — climate risk intelligence, carbon footprint estimation (IPCC/FAO EX-ACT), weather advisory, digital MRV
- [ ] Finance & Insurance Agent — credit scoring, parametric triggers, loan origination, wallet management
- [ ] Orchestrator + Reviewer Agent — task routing, output validation, hallucination prevention
- [ ] Investor/Funder Agent — impact investor matching, crowd-farming campaigns, sustainability scoring
- [ ] Supply Chain Agent — logistics optimization, quality coordination, traceability management

**Multi-Channel Adaptive Access**
- [ ] USSD interface for feature phones (core marketplace + advisory + price alerts)
- [ ] WhatsApp integration as primary smartphone channel (conversational commerce)
- [ ] Progressive web app for connected users (full platform access)
- [ ] Auto-detection of user device/connectivity with adaptive channel selection
- [ ] SMS fallback for critical alerts and transactions

**Cooperative & Enterprise Features**
- [ ] Cooperative member management and collective bargaining tools
- [ ] Enterprise data analytics platform (anonymized agricultural intelligence)
- [ ] White-label deployment option for governments/NGOs
- [ ] API suite for third-party integration
- [ ] Cooperative pooled trading and resource scheduling

### Out of Scope

- Hardware/IoT integration — Pure software platform, no physical sensors or drones (v2+)
- Autonomous trading — AI assists and recommends, humans approve all transactions (trust-building first)
- Full blockchain layer — Database traceability first, blockchain verification in v2
- Farm machinery leasing (Agro Mech) — Original Agrodomain module, defer to v2
- Offline-first native mobile apps — PWA covers offline needs for MVP
- Multiple language LLM fine-tuning — Use Claude's built-in multilingual + translation layer for MVP

## Context

### Origin & Heritage
Agrodomain 1.0 was a Nigerian Pan-African agritech platform (2018-2023, now defunct). It had 8 modules: Marketplace, Store, Mech, Insurance Hub, Lend, Purse wallet, Big Data, Cooperative support. Built on PHP/WordPress, partnered with NAIC (insurance) and NAMCOFF (5,000+ cooperative federations, 300,000+ members). Self-funded, no VC backing. Domain (agrodomain.com) now for sale at $4,888 — MWH will rebrand rather than acquire.

### MWH-GRIT Partnership
MWH has an existing partnership proposal with GRIT covering 6 Caribbean nations. The Agrodomain platform was presented as Pathway 4 ("AgTech Platform for Agricultural Enterprises") in the GRIT proposal. Climate-smart elements were a key part of the pitch: supply chain traceability, carbon footprint estimation, climate-risk intelligence, agro-insurance marketplace, sustainability-scored agri-finance, and digital MRV.

### Competitive Landscape (65+ platforms researched, March 2026)
**Africa:** Apollo Agriculture ($67.8M raised, ML credit scoring), ThriveAgric (500K+ farmers, offline-first AOS), Complete Farmer (USSD marketplace), Pula (21M farmers insured), DigiFarm/Safaricom (M-Pesa integrated), CropIn (30M+ acres, 103 countries)
**Americas:** FBN ($900M+ raised, "Norm" LLM), Solinftec (autonomous solar robots), Indigo ($1.2B raised, carbon credits), Agrofy ("Amazon for ag" in LATAM), Kilimo (AI irrigation + water credits)
**Asia:** DeHaat ($270M raised, 12M farmers), Ninjacart ($508M raised), CropIn Sage (Gemini-powered GenAI), BharatAgri (GPT-based farmer chatbot)

### Key Whitespace
No existing platform integrates all five pillars — AI marketplace + AgFintech + conversational commerce + supply chain traceability + climate intelligence — into one multi-agent platform. This is the strategic differentiator.

### Agentic AI State of the Art (March 2026)
- AgroAskAI: 7-agent chain-of-responsibility architecture (reference pattern)
- FarmerChat: 830K+ users on WhatsApp, GPT-4 based, under $1/farmer/year
- Helios AI: Multi-agent commodity trading co-pilot, 75+ commodities, $4.7M raised
- Cognizant Neuro SAN: Open-source multi-agent library, tested by Bayer Crop Science
- CropIn Sage: Gemini-powered, 99.5% reduction in report turnaround
- 2026 declared "Year of Multi-Agent Systems" (Gartner, 1,445% inquiry surge)
- $250B total AI value creation potential in agriculture (McKinsey)

### Data Sources Strategy
**Free/Open:** NASA POWER (weather), Sentinel-2 (satellite imagery), CHIRPS (rainfall), Open-Meteo (forecasts), MODIS (vegetation), Landsat (land use)
**Premium (where needed):** Planet Labs (daily high-res imagery), The Weather Company (hyperlocal), CropIn imagery APIs

### Climate-Smart Module Specifications
1. Supply Chain Traceability — Plot-level tracking of practices, inputs, environmental metrics
2. Carbon Footprint Estimation — IPCC + FAO EX-ACT emission factor models with farmer-reported activity data
3. Climate-Risk Intelligence — Satellite imagery + weather APIs for farm-level recommendations
4. Agro-Insurance Marketplace — Satellite-derived weather triggers for parametric insurance
5. Agri-Finance — Sustainability-scored farmer profiles for green finance access
6. Digital MRV — Self-reported farmer data + satellite verification (NDVI, land use, deforestation)

## Constraints

- **Timeline**: 6-month MVP targeting Q3 2026 — aggressive, requires ruthless prioritization
- **Budget**: Lean build — cannot burn $500K+ on MVP. Cloud/API costs must be managed (Claude API at scale, satellite data fees)
- **Data Privacy**: Nigeria NDPR and Caribbean data protection laws apply. Farmer data handling requires consent frameworks and data residency considerations
- **Financial Regulation**: Credit and insurance modules may require licensing in target markets. MVP may need to partner with licensed entities rather than operating directly
- **Connectivity**: Target regions have intermittent internet. USSD/SMS must work on 2G networks. WhatsApp on 3G. Full app on 4G+
- **AI Foundation**: Hybrid approach — Claude API for orchestration/reasoning, specialized ML for domain tasks (credit scoring, disease detection, satellite analysis). Must manage Claude API costs at scale

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build from scratch (not white-label/platform) | Maximum control over AI-first architecture; no existing platform covers all 5 pillars | -- Pending |
| Multi-region simultaneous launch (Africa + Caribbean) | Leverage both MWH's West Africa roots and GRIT partnership; proves platform is region-agnostic | -- Pending |
| Hybrid AI: Claude + specialized ML | Claude best for orchestration/reasoning; specialized models needed for credit scoring, disease detection, satellite analysis; cost-efficient at scale | -- Pending |
| 7-agent multi-agent architecture | Covers all value chain segments with specialized agents; Orchestrator+Reviewer ensures quality; modeled on AgroAskAI reference architecture | -- Pending |
| Freemium + enterprise revenue model | Farmers always free (maximizes adoption); revenue from cooperatives, agribusinesses, enterprise licensing, transaction fees, commissions | -- Pending |
| Cooperative-subsidized farmer access | Individual farmers never pay; cooperatives/enterprises fund the ecosystem; proven model (Apollo, DigiFarm, FarmerChat) | -- Pending |
| Multi-channel adaptive (USSD/WhatsApp/App) | Auto-detects connectivity; USSD for feature phones, WhatsApp for smartphones, PWA for connected users; maximum inclusion | -- Pending |
| Rebrand (not acquire agrodomain.com) | Clean slate; no association with defunct platform; $4,888 domain cost avoided; signals innovation | -- Pending |
| Database traceability first (blockchain v2) | Faster MVP; blockchain adds complexity without immediate user value; database records sufficient for initial traceability | -- Pending |
| Human-approved transactions (no autonomous trading) | Builds trust with farmers who are new to digital trading; AI recommends, humans decide | -- Pending |
| Free + premium data sources | Open data (NASA, Sentinel-2, CHIRPS) for baseline; premium (Planet Labs, Weather Company) where resolution matters; controls data costs | -- Pending |
| Enterprise tier: analytics + white-label + APIs | Maximum revenue surface area; different enterprise clients want different things; all three tiers serve distinct needs | -- Pending |

---
*Last updated: 2026-03-07 after initialization*
