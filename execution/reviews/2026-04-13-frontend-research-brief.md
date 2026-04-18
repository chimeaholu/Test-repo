# Agrodomain Frontend Research Brief

Date: 2026-04-13
Track: Frontend Phase A under SOP 15
Project: `/mnt/vault/MWH/Projects/Agrodomain`
Author: `engineering` background task
Status: Evidence-backed planning artifact

## Executive Summary

Agrodomain now has mature backend/domain seams but no integrated product surface. The frontend program therefore should not behave like a generic admin dashboard project. The evidence points to a field-first, trust-heavy, degraded-connectivity-first operating model with three hard requirements:
- critical actions must succeed or recover on unstable mobile conditions before richer desktop complexity is added
- every high-stakes decision needs proof, provenance, and a visible next step
- role-specific surfaces must share one visual and interaction grammar so a farmer, buyer, cooperative operator, advisor, and finance reviewer all see the same product truth from different task lenses

Competitive pattern review shows the strongest agri products converge on a few repeatable UX ideas:
- one-task-first mobile flows rather than dense navigation trees
- explicit trust markers for recommendations, pricing, and approvals
- operational dashboards only after the user clears a concrete action queue
- progressive disclosure from lightweight summaries into evidence-backed detail
- strong handoff patterns between automation and human review in finance, insurance, and dispute paths

The Agrodomain frontend should therefore be structured as a channel-aware application shell with:
- a mobile-first farmer/buyer workspace
- a desktop-optimized cooperative, advisor, finance, and enterprise operations layer
- a shared design system bound directly to `B-050..B-054`
- an offline and retry architecture bound directly to `B-004`, `B-006`, `B-039`, `B-040`, `B-041`, `B-042`, `B-043`, and `B-044`
- a proof-before-trust content model bound directly to advisory citations, finance responsibility boundaries, traceability evidence, and climate provenance

## Research Method

Evidence sources combined:
- existing Agrodomain backend contracts, source modules, and QA-cleared review artifacts
- official standards for accessibility and web performance
- official product pages for relevant agri and farmer-service platforms
- internal constraints already encoded in Agrodomain mobile and UX contracts

Internal Agrodomain evidence reviewed:
- backend contracts `B-002`, `B-004`, `B-005`, `B-006`, `B-013`, `B-016`, `B-018`, `B-020` through `B-030`, and `B-039` through `B-054`
- source modules for listings, negotiation, escrow, advisory retrieval, climate alerts, finance HITL, traceability, evidence gallery, analytics, and identity consent
- final repo test baseline: `390 passed` on 2026-04-13 UTC

## Product and Pattern Findings

### Competitive Pattern Matrix

| Reference | Primary Surface Pattern | Notable Strength | Relevance to Agrodomain | Direct Implication |
| --- | --- | --- | --- | --- |
| Plantix | task-first mobile advisory flow with image-led entry and diagnosis/recommendation output | turns a complex agronomy problem into a single dominant user action | strong analog for advisory ask, evidence-backed recommendations, and low-literacy flow design | advisory starts with one obvious action, then fans into citations, interventions, and follow-up logging |
| DigiFarm | integrated farmer service hub combining markets, inputs, insurance, mechanization, and extension | bundles multiple services inside one farmer context instead of splitting into isolated products | strong analog for Agrodomain's marketplace + advisory + finance model | cross-service navigation should be farmer-centric, not backend-domain-centric |
| Apollo Agriculture | blended credit, agronomy, insurance, and repayment experience | combines risk-heavy products with visible education and status framing | strong analog for finance/insurance trust UX | every decision screen needs ownership, rationale summary, and next-step clarity |
| Pula | structured insurance and agricultural risk support at program scale | emphasizes institutional trust and formal program operations | strong analog for insurance ops and partner-boundary clarity | finance/insurance workflows need explicit human-review queues and partner accountability markers |
| Hello Tractor | equipment-access workflow with operational coordination | action queues and marketplace logistics matter more than decorative marketing | analog for cooperative and logistics-oriented operations surfaces | operations dashboards should foreground pending actions, locations, status, and confirmations |

### Observed Pattern Cluster

1. `Single dominant action` beats dashboard overload.
Agri users often enter with one job: list produce, answer an offer, request advice, confirm settlement, review an alert, or upload proof. The homepage for each role should therefore prioritize the current queue and strongest CTA instead of feature grids.

2. `Trust artifacts are part of the interface, not footnotes.`
The backend already models citations, responsibility boundaries, evidence references, and policy gates. The frontend must expose them inline through provenance rows, decision rationale cards, trust badges, and expandable evidence timelines.

3. `Mobile-first does not mean mobile-only.`
Farmer and buyer execution needs aggressive mobile optimization, but cooperative operators, advisors, finance reviewers, and enterprise analysts need multi-panel desktop views. The plan must support both without splitting into separate products.

4. `Status clarity outranks visual novelty.`
In high-latency or policy-sensitive systems, users care more about whether an action was queued, funded, approved, retried, or blocked than whether the page feels flashy. Motion and brand expression should support comprehension, not compete with it.

5. `Proof-before-trust is a product law.`
Agrodomain should never present advice, alerts, payouts, or analytics without an answer to one of these questions: what generated this, who owns it, what evidence supports it, and what can the user safely do next?

## Interaction Standards Derived for Agrodomain

### Core Interaction Rules

| Standard | Definition | Why it matters in Agrodomain | Backend tie-in |
| --- | --- | --- | --- |
| Deterministic primary action | every major screen has one strongest action and one recovery path | reduces ambiguity for low-literacy and low-connectivity users | `B-051`, `B-053` |
| Proof before trust | recommendations and decisions surface citations, evidence, or responsibility metadata before commitment | prevents black-box behavior in agronomy, finance, and settlement | `B-014`, `B-020`, `B-021`, `B-023`, `B-024`, `B-025` |
| Offline-safe continuity | user can see queued state, retry state, and resolution state for network-sensitive actions | unstable connectivity is an expected condition, not an exception | `B-004`, `B-006`, `B-039`, `B-040`, `B-041`, `B-044` |
| Human review visibility | policy or partner review steps are explicit in the UI timeline | high-risk flows must not feel like silent failures | `B-020`, `B-021`, `B-022`, `B-030` |
| Channel-aware simplification | PWA, WhatsApp, and USSD versions of the same job preserve intent while adapting complexity | keeps multi-channel experiences coherent | `B-004`, `B-005`, `B-028`, `B-039` |
| Role-centered entry points | each role lands on active work, not general exploration | reduces time to value across different personas | listings, negotiation, climate, finance, analytics modules |
| Visible state framing | loading, empty, error, blocked, queued, synced, disputed, and approved states are all named and styled intentionally | avoids false certainty and support burden | `B-051`, `B-052`, `B-053`, `B-054` |

### State Expectations

Loading states:
- always show the object being loaded, expected outcome, and fallback action
- use skeletons for structured content and progress bars only for bounded operations
- avoid spinner-only states longer than 800 ms

Error states:
- separate `user-fixable`, `system-retryable`, and `policy-blocked` errors
- keep copy plain and action-led
- include correlation metadata only in expandable debug detail for ops roles

Offline states:
- queued actions remain visible in context, not buried in a separate page
- last-known-good data must be clearly labeled with freshness age
- conflict resolution must explain which copy wins and why

Trust states:
- advice cards show citation count and source freshness
- finance cards show partner, responsibility boundary, and review status
- traceability cards show evidence count and custody stage
- climate cards show signal source, threshold basis, and severity

## Responsive Benchmarks

Agrodomain-specific viewport tiers:
- `320-374px`: survival tier for low-end Android and compact browsers
- `375-479px`: primary mobile reference tier
- `480-767px`: large mobile and WhatsApp-web-adjacent tier
- `768-1023px`: tablet and shared-device tier
- `1024-1439px`: laptop operations tier
- `1440px+`: enterprise analytics tier

Responsive rules:
- all primary job flows must complete without horizontal scrolling at `320px`
- mobile navigation must expose queue, search, create, notifications, and profile within one thumb-friendly structure
- desktop operations views may use split panes only when a single screen requires cross-reference between queue, detail, and evidence
- tables must collapse into card stacks below `1024px`
- evidence galleries must switch from masonry/grid to chronological card list below `768px`
- analytics pages should define mobile fallback summaries instead of forcing full-chart parity on small screens

## Accessibility Benchmarks

Accessibility baselines for this program:
- WCAG 2.2 AA is the minimum global target
- minimum contrast target: `4.5:1` for normal text and `3:1` for large text/non-text UI where applicable
- target size minimum: controls should respect WCAG 2.2 guidance and the product should default to `44-48px` touch targets on mobile
- all workflows must support screen reader labels, clear focus order, and visible focus styling
- low-literacy copy should keep sentence structure short, active, and concrete
- time-sensitive alerts and payouts should not rely on color alone for meaning
- uploaded media and evidence need text metadata equivalents for non-visual review

Agrodomain-specific accessibility additions:
- grade-6-or-below reading level for farmer-facing microcopy unless legal/compliance text requires otherwise
- bilingual or multilingual label slots in all reusable form and action components
- all critical CTA labels capped at two words on low-end Android scenarios where `B-053` applies
- recovery instructions must include voice-friendly phrasing so a field officer can read the steps aloud

## Performance Benchmarks

### External benchmark anchors
- Web Vitals guidance keeps `LCP <= 2.5s`, `INP <= 200ms`, and `CLS <= 0.1` in the good range for user experience evaluation
- offline fallback patterns should be explicit and cache-aware rather than assuming continuous connectivity

### Agrodomain frontend budgets
- initial route JS budget for farmer mobile routes: `<= 170 KB gzipped` excluding framework baseline and image assets
- initial route JS budget for operations routes: `<= 240 KB gzipped`
- route data payload budget for mobile market listing index: honor `B-039` max `240 bytes` at the contract layer for the compact mobile profile, then progressively hydrate detail on demand
- user-visible first content on farmer mobile shell: `<= 1.8s` on emulated unstable 3G for cached shell routes
- interactive completion for primary mobile actions: `<= 2.2s p95`, aligned with `B-044`
- zero duplicate commits and zero data-loss tolerance for queued write actions
- asset strategy must prefer responsive images, partial hydration, and route-level streaming rather than dashboard-wide client hydration

### Performance posture by surface
- farmer/buyer routes: optimize for low-memory, low-bandwidth, short-session use
- cooperative/advisor/finance routes: optimize for dense decision support and keyboard throughput
- analytics/admin routes: optimize for progressive aggregation, saved filters, and virtualization

## Research Conclusions for Frontend Phase A

### What the frontend must not become
- not a generic SaaS admin dashboard
- not a desktop-first analytics shell backfilled onto mobile
- not a set of disconnected feature pages that mirror backend module boundaries
- not a black-box AI surface that hides citations, provenance, or policy review
- not a spinner-heavy PWA that treats offline as a rare edge case

### What the frontend should become
- a role-aware field operations product with one shared interaction grammar
- a mobile-first execution surface for farmers and buyers
- a trust-first operations console for cooperative, advisor, finance, and enterprise roles
- an evidence-bearing interface where advice, risk, payment, and traceability are always inspectable
- a route and component architecture that can later support WhatsApp/USSD content parity without redesigning domain concepts

## Recommendation Set

1. Use a single Next.js frontend with route groups by role and capability, not multiple separate apps.
2. Bind design system rules directly to `B-050..B-054` so UX gates remain executable.
3. Treat offline outbox, retry, and conflict resolution as first-class navigational objects.
4. Put evidence rails beside every high-trust object: advice, decision, alert, settlement, and traceability event.
5. Ship the first implementation wave around task-complete flows, not around abstract pages or design-system-only work.

## Source List

Standards and technical guidance:
1. W3C Web Content Accessibility Guidelines overview: https://www.w3.org/WAI/standards-guidelines/wcag/ (accessed 2026-04-13)
2. W3C WCAG 2.2 Understanding: Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (accessed 2026-04-13)
3. W3C WCAG 2.2 Understanding: Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (accessed 2026-04-13)
4. web.dev Web Vitals overview: https://web.dev/articles/vitals (accessed 2026-04-13)
5. web.dev Workbox / offline fallback guidance: https://web.dev/learn/pwa/workbox/ (accessed 2026-04-13)

Competitive and reference products:
6. Plantix: https://plantix.net/en/ (accessed 2026-04-13)
7. DigiFarm Kenya: https://www.digifarmkenya.com/ (accessed 2026-04-13)
8. Apollo Agriculture: https://www.apolloagriculture.com/ (accessed 2026-04-13)
9. Pula: https://www.pula-advisors.com/ (accessed 2026-04-13)
10. Hello Tractor: https://www.hello-tractor.com/ (accessed 2026-04-13)

Internal Agrodomain evidence:
11. `/mnt/vault/MWH/Projects/Agrodomain/execution/contracts/*.json` frontend-relevant contract set
12. `/mnt/vault/MWH/Projects/Agrodomain/src/agro_v2/*.py` frontend-relevant domain service modules
13. `/mnt/vault/MWH/Projects/Agrodomain/execution/reviews/2026-04-13T10-03-36Z-wave-state-snapshot.md`
