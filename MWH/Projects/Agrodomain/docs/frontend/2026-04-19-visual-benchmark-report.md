# Agrodomain Visual Benchmark Report

Date: 2026-04-19
Scope: buyer marketplace, role-aware admin surfaces, consent-heavy onboarding, trust-critical finance and advisory flows

## Benchmark set

1. Stripe Dashboard and Stripe Apps design guidance
   Source: https://docs.stripe.com/dashboard/basics
   Source: https://docs.stripe.com/stripe-apps/design
   Why it matters: high-trust financial product surfaces with strong navigation hierarchy, explicit status, keyboard-aware operations, and restrained customization in service of consistency and accessibility.

2. Stripe checkout and payment page guidance
   Source: https://stripe.com/elements
   Source: https://stripe.com/us/resources/more/checkout-screen-best-practices
   Why it matters: trust UX, conversion-safe forms, visible error handling, and payment reassurance patterns map directly to Agrodomain wallet and escrow screens.

3. Atlassian Design foundations, spacing, forms, and navigation primitives
   Source: https://atlassian.design/design-system/
   Source: https://atlassian.design/foundations/spacing
   Source: https://atlassian.design/patterns/forms/
   Why it matters: dense operational interfaces that remain scannable through tokenized spacing, deliberate component semantics, and progressive disclosure.

4. Material 3 responsive layout and system guidance
   Source: https://m3.material.io/
   Why it matters: responsive patterns, stateful surfaces, and scalable component behavior from mobile to desktop.

5. Shopify design and Polaris principles
   Source: https://shopify.design/
   Source: https://polaris.shopify.com/ if deeper system alignment is needed in follow-up work
   Why it matters: marketplace and merchant tooling patterns that balance merchandising clarity with admin-grade operational throughput.

6. NN/g mobile, menu, and dashboard evidence
   Source: https://www.nngroup.com/videos/mobile-images/?lm=supporting-multiple-location-users&pt=article
   Source: https://media.nngroup.com/media/articles/attachments/PDF_Menu-Design-Checklist.pdf
   Source: https://media.nngroup.com/media/reports/free/Application_Design_Showcase_1st_edition.pdf
   Why it matters: practical evidence for information scent, progressive disclosure, tap targets, and avoiding decorative overhead on mobile.

## Patterns worth carrying forward

### 1. Trust-critical flows lead with state, not decoration

Stripe consistently surfaces state first: balance, transaction status, account scope, or settlement readiness. The design implication for Agrodomain is straightforward:

- wallet and escrow surfaces should prioritize settlement state, fallback delivery state, and participant ownership before showing secondary explanation
- onboarding should show exactly why access is still blocked
- advisory and climate views should always keep confidence, reviewer posture, or degraded mode visible near the main content

### 2. Dense admin products stay usable through spacing discipline

Atlassian’s spacing guidance reinforces an 8px-based rhythm with deliberate density control. The takeaway is not “add more white space”; it is “be consistent enough that dense surfaces remain parseable.”

For Agrodomain:

- use one vertical rhythm across cards, forms, stat bands, and timelines
- keep list items and cards internally consistent
- reserve larger spacing jumps for section transitions and page-shell hierarchy

### 3. Navigation should reflect task posture, not site map completeness

Stripe and Atlassian both avoid overloading primary navigation with every possible destination. Their better pattern is a stable frame plus contextual secondary actions.

For Agrodomain:

- the shell should keep role, queue, and consent state visible in the persistent frame
- page-level quick actions should move into the content area
- mobile nav should stay limited and task-oriented

### 4. Marketplace and merchant tooling benefit from “inspect before commit”

Shopify-like patterns are especially relevant for buyer discovery and listing management:

- cards should summarize commercial essentials fast: commodity, quantity, location, price, state
- detail routes should separate read-only proof from editable owner controls
- state chips should make publish boundaries and buyer-safe visibility obvious

### 5. Mobile surfaces should avoid decorative height tax

NN/g’s mobile guidance is relevant because Agrodomain is field-facing. Decorative imagery that adds height without information reduces usefulness. That implies:

- hero surfaces should include meaning, not just mood
- stat bands and status rows should compress information instead of expanding page length with ornamental modules
- primary CTA order should stay stable between mobile and desktop

### 6. Accessibility is not a separate pass

The most useful benchmark trait across Stripe, Atlassian, and Material is that semantics are baked into component behavior:

- buttons vs links are intentionally differentiated
- focus states are strong and consistent
- form structure is explicit, not placeholder-driven
- status is conveyed by text and layout, not color alone

## Recommended Agrodomain visual direction

Working direction: agronomic control room, not generic SaaS dashboard.

The product should feel:

- grounded and operational
- trustworthy under regulation and weak connectivity
- premium through craft, not through flashy illustration
- legible for mixed contexts: field officer, buyer, cooperative dispatcher, reviewer, finance operator, admin

That translates into:

- warm agricultural neutrals with deep green and clay accents
- high-contrast serif display paired with sturdy humanist sans body copy
- glass-like but restrained surface depth
- state chips, stat bands, and dense-but-readable cards
- visible separation between command surfaces and evidence surfaces

## Key UX conclusions by journey

### Onboarding

- Keep field count minimal.
- Make the consent boundary explicit.
- Show “what happens next” without forcing the user to infer it.

### Buyer discovery and listings

- Use scan-friendly cards for feed views.
- Make owner-only vs buyer-safe state unmissable.
- Preserve commercial comparability across cards.

### Offers and negotiation

- Thread state should be readable at a glance.
- Confirmation checkpoints should feel like controlled transitions, not inline errors.
- Timeline and mutation controls should remain adjacent but visually separated.

### Wallet and escrow

- Settlement state, delivery fallback, and participant responsibility must lead the page.
- The design should feel auditable and calm.
- Timeline, receipts, and notifications should read as one system.

### Advisory and climate

- Confidence, reviewer posture, and degraded-source posture must stay on-screen.
- Lists and detail panes should support queue-to-detail scanning on desktop and one-primary-panel reading on mobile.

### Finance and admin

- Surface runtime truth, not placeholder confidence.
- Keep counts, readiness, and health in the first screenful.

## Gaps found in the pre-upgrade UI

- The shell already had a direction, but hierarchy was uneven across pages.
- Public entry, operational review, and trust-critical workflows looked too similar structurally.
- Several routes still felt like “recovery scaffolding” rather than a product system.
- Information density existed, but not always with clear emphasis hierarchy.
- The product needed stronger summary bands and tighter separation between command, proof, and status surfaces.
