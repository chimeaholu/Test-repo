# Agrodomain Frontend Architecture and UX Plan

Date: 2026-04-13
Track: Frontend Phase A under SOP 15
Project: `/mnt/vault/MWH/Projects/Agrodomain`
Author: `engineering` background task
Target status: Step `7b` complete, Step `8` ready

## 1. Mission and Outcome
- The frontend program exists to turn the completed backend/domain-contract surface into a usable, trustworthy product.
- This plan assumes the Python domain layer remains the source of truth for workflow state, policy, evidence, and integrity checks.
- The frontend must unify marketplace, advisory, finance, traceability, climate, and analytics work without becoming a generic admin shell.
- The first implementation track should deliver task-complete experiences for the most valuable user journeys before broader visual expansion.
- The design center is unstable mobile connectivity for field users and dense desktop decision support for operational roles.

## 2. Guiding Principles
### P-01 Queue before dashboard
- Rule: Every role lands on work that needs action, not a feature gallery.
- Consequence: implementation work that violates `P-01` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-01`.

### P-02 Proof before trust
- Rule: Recommendations, settlements, and finance outcomes expose supporting evidence inline.
- Consequence: implementation work that violates `P-02` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-02`.

### P-03 Offline is a normal state
- Rule: Queued, retrying, conflicted, and synced are primary UX states.
- Consequence: implementation work that violates `P-03` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-03`.

### P-04 Role-aware, not app-fragmented
- Rule: One application shell adapts per role instead of spawning disconnected products.
- Consequence: implementation work that violates `P-04` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-04`.

### P-05 Plain language first
- Rule: Farmer-facing copy defaults to short, concrete, low-literacy phrasing.
- Consequence: implementation work that violates `P-05` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-05`.

### P-06 Desktop density where it pays
- Rule: Operations surfaces may use split panels and tables only where throughput matters.
- Consequence: implementation work that violates `P-06` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-06`.

### P-07 Mobile thumb economy
- Rule: Primary actions stay reachable and short on low-end Android.
- Consequence: implementation work that violates `P-07` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-07`.

### P-08 Evidence-bearing interactions
- Rule: Attachment counts, citations, and ownership labels are part of core components.
- Consequence: implementation work that violates `P-08` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-08`.

### P-09 Backend contract fidelity
- Rule: Frontend DTOs, route loaders, and mutations map directly to existing contracts.
- Consequence: implementation work that violates `P-09` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-09`.

### P-10 Gateable design quality
- Rule: B-050..B-054 become concrete design and release checks, not aspirational notes.
- Consequence: implementation work that violates `P-10` should be blocked in review.
- Frontend impact: components, routes, and tests must all be traceable back to `P-10`.

## 3. Personas and Role Posture
### R-01 Farmer / Seller
- Home route: `/app/farmer`
- Primary jobs: complete onboarding and consent, create and manage listings, reply to offers, track settlement, request advisory help, review climate alerts, upload quality evidence
- Device posture: Android low-end mobile first
- Channel posture: PWA, WhatsApp handoff, USSD fallback
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

### R-02 Buyer
- Home route: `/app/buyer`
- Primary jobs: browse market, filter listings, make offers, complete confirmation, track order and receipt, review evidence before acceptance
- Device posture: mobile first with tablet support
- Channel posture: PWA, WhatsApp notification handoff
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

### R-03 Cooperative Operator
- Home route: `/app/cooperative`
- Primary jobs: manage member activity, bulk-create or supervise listings, verify quality, coordinate dispatch and receipt, resolve queue exceptions
- Device posture: tablet and desktop priority
- Channel posture: PWA primary
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

### R-04 Advisor / Field Officer
- Home route: `/app/advisor`
- Primary jobs: triage advisory requests, inspect citations, log interventions, review climate alerts, support recovery in person
- Device posture: mobile and tablet hybrid
- Channel posture: PWA primary, WhatsApp support context
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

### R-05 Finance / Insurance Reviewer
- Home route: `/app/finance`
- Primary jobs: process review queues, inspect partner decisions, approve or reject payouts, audit responsibility boundaries
- Device posture: desktop first
- Channel posture: PWA primary
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

### R-06 Enterprise Analyst / Admin
- Home route: `/app/admin`
- Primary jobs: monitor analytics, inspect observability, manage country packs and access, validate rollout readiness
- Device posture: desktop and large laptop priority
- Channel posture: PWA primary
- Success metric: the role can resume pending work in one interaction from its home surface.
- Failure condition: the role needs to navigate through feature-first pages before seeing urgent actions.

## 4. Information Architecture
### 4.1 Route Topology
- `/`
- `/signin`
- `/onboarding/consent`
- `/app`
- `/app/farmer`
- `/app/buyer`
- `/app/cooperative`
- `/app/advisor`
- `/app/finance`
- `/app/admin`
- `/app/market/listings`
- `/app/market/listings/new`
- `/app/market/listings/[listingId]`
- `/app/market/negotiations`
- `/app/market/negotiations/[threadId]`
- `/app/payments/wallet`
- `/app/payments/escrow/[escrowId]`
- `/app/advisory/new`
- `/app/advisory/[requestId]`
- `/app/advisory/[requestId]/citations`
- `/app/climate/alerts`
- `/app/climate/alerts/[alertId]`
- `/app/finance/queue`
- `/app/finance/queue/[itemId]`
- `/app/finance/payouts/[eventId]`
- `/app/traceability/[consignmentId]`
- `/app/traceability/[consignmentId]/evidence`
- `/app/traceability/[consignmentId]/evidence/new`
- `/app/notifications`
- `/app/offline/outbox`
- `/app/offline/conflicts/[conflictId]`
- `/app/profile`
- `/app/cooperative/members`
- `/app/cooperative/bulk-listings`
- `/app/cooperative/quality`
- `/app/cooperative/dispatch`
- `/app/advisor/requests`
- `/app/advisor/interventions/[caseId]`
- `/app/admin/analytics`
- `/app/admin/observability`
- `/app/admin/access`
- `/app/admin/countries`

### 4.2 Navigation Model
- Mobile uses a bottom bar with `Home`, `Market`, `Inbox`, `Alerts`, and `Profile` plus an always-visible outbox badge when queued actions exist.
- Desktop uses a persistent left rail with role-specific modules, top-level search, language switcher, and status chips for connectivity and notifications.
- Cross-role switching happens from the shell, never from deep-linking into a different role without context reset.
- All notifications deep-link to canonical detail routes rather than rendering state in-place inside the notification center.
- Evidence, citations, and audit summaries open in drawers or side panels on desktop and bottom sheets on mobile.

## 5. Role-Based Workflow Map
### WF-001 Farmer onboarding and consent
- Primary owner: Farmer / Seller
- Path: Identity entry -> consent review -> language choice -> workspace home
- Backend dependencies: B-002, B-016, B-050..B-054
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-002 Listing creation and publication
- Primary owner: Farmer / Cooperative
- Path: Home queue -> create wizard -> listing detail -> publish
- Backend dependencies: B-009, B-039, B-051, B-053
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-003 Offer negotiation and confirmation
- Primary owner: Farmer / Buyer
- Path: Listing detail -> offer thread -> confirmation checkpoint -> accepted state
- Backend dependencies: B-010, B-051
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-004 Escrow funding and release
- Primary owner: Buyer / Seller
- Path: Negotiation accepted -> escrow center -> funding state -> release state
- Backend dependencies: B-011, B-012, B-013
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-005 Advisory question and answer review
- Primary owner: Farmer / Advisor
- Path: Advisory composer -> answer detail -> citations -> follow-up
- Backend dependencies: B-014, B-016, B-051, B-052
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-006 Climate alert triage
- Primary owner: Farmer / Advisor / Cooperative
- Path: Alerts center -> alert detail -> follow-up action
- Backend dependencies: B-017, B-018
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-007 Finance partner review
- Primary owner: Finance reviewer
- Path: Queue -> detail -> evidence -> decision
- Backend dependencies: B-020, B-021, B-022
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-008 Traceability and evidence review
- Primary owner: Buyer / Cooperative
- Path: Traceability timeline -> evidence gallery -> event inspection
- Backend dependencies: B-023, B-024
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-009 Enterprise analytics review
- Primary owner: Admin
- Path: Analytics cockpit -> filters -> drill-down summary
- Backend dependencies: B-025
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

### WF-010 Offline retry and conflict resolution
- Primary owner: Shared
- Path: Inline queue badge -> outbox -> conflict detail -> resolution
- Backend dependencies: B-006, B-040, B-041, B-044
- UX law: the user must always know the current state, the next safe action, and the recovery path.
- Mobile rule: keep the number of decision points under four before the user reaches a clear outcome or queue state.
- Desktop rule: show adjacent evidence when the user is expected to make an approval or exception decision.

## 6. Screen Inventory
### S-001 Landing and role chooser
- Zone: Public shell
- Route: `/`
- Purpose: Explain value, route users into the correct workspace, and anchor trust early.
- Primary actions: Choose role, Review proof points, Start onboarding
- Data dependencies: brand proof, country availability, language choice
- UX notes: minimal marketing chrome, direct CTA to task surfaces
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-002 Sign-in and identity entry
- Zone: Shared auth
- Route: `/signin`
- Purpose: Capture the smallest identity payload needed to resume work safely.
- Primary actions: Enter phone or email, Verify method, Select workspace
- Data dependencies: identity state, channel preference, last active role
- UX notes: OTP-first mobile bias, clear fallback if verification is delayed
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-003 Consent and policy capture
- Zone: Shared onboarding
- Route: `/onboarding/consent`
- Purpose: Present consent scopes in plain language and record acceptance or refusal.
- Primary actions: Read scopes, Grant consent, Review revocation path
- Data dependencies: policy version, scope ids, country-specific text
- UX notes: must map to B-002, voice-friendly summary mode
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-004 Workspace selector
- Zone: Shared shell
- Route: `/app`
- Purpose: Route authenticated users to the right role home and recent work.
- Primary actions: Open workspace, Resume pending task, Switch role
- Data dependencies: assigned roles, open queues, recent objects
- UX notes: single-tap resume cards, desktop keyboard shortcut support
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-005 Farmer home queue
- Zone: Farmer
- Route: `/app/farmer`
- Purpose: Summarize the farmer's current jobs with one dominant next action.
- Primary actions: Create listing, Reply to offer, View alert
- Data dependencies: queue counts, wallet status, last sync age
- UX notes: offline outbox visible at top, cards sorted by urgency
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-006 Buyer home queue
- Zone: Buyer
- Route: `/app/buyer`
- Purpose: Show active purchase paths and pending confirmations.
- Primary actions: Search market, Open negotiation, Track receipt
- Data dependencies: saved filters, open offers, delivery status
- UX notes: compact market search entry, evidence callouts before commitment
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-007 Cooperative operations home
- Zone: Cooperative
- Route: `/app/cooperative`
- Purpose: Center the operator on member exceptions, dispatch work, and approvals.
- Primary actions: Review members, Open quality queue, Check dispatches
- Data dependencies: pending verifications, member listing health, logistics status
- UX notes: multi-panel desktop layout, tablet condensed list detail mode
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-008 Advisor workbench home
- Zone: Advisor
- Route: `/app/advisor`
- Purpose: Surface urgent farmer questions, climate follow-ups, and incomplete interventions.
- Primary actions: Open request, Review citation pack, Log intervention
- Data dependencies: request SLA, farmer context, alert severity
- UX notes: must support rapid note entry, supports field handoff copy
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-009 Finance queue home
- Zone: Finance
- Route: `/app/finance`
- Purpose: Prioritize partner decisions, payout events, and risk exceptions.
- Primary actions: Start review, Inspect evidence, Approve or reject
- Data dependencies: risk score, country, partner reference
- UX notes: desktop first queue detail layout, hard separation between pending and filtered-empty
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-010 Enterprise/admin home
- Zone: Admin
- Route: `/app/admin`
- Purpose: Expose rollout, observability, analytics, and configuration status.
- Primary actions: Open analytics, Inspect health, Manage access
- Data dependencies: country readiness, SLO alerts, role assignments
- UX notes: desktop-heavy layout, mobile reduced to summary only
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-011 Listings index
- Zone: Farmer/Buyer
- Route: `/app/market/listings`
- Purpose: Provide searchable, filterable inventory with compact mobile cards.
- Primary actions: Browse cards, Filter by commodity, Open detail
- Data dependencies: listing summary, freshness, trust markers
- UX notes: compact card stack on mobile, progressive filters on drawer
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-012 Listing create wizard
- Zone: Farmer/Cooperative
- Route: `/app/market/listings/new`
- Purpose: Guide the user through creating or drafting a listing with the fewest possible steps.
- Primary actions: Set commodity, Set quantity and price, Publish or save draft
- Data dependencies: listing payload, country and currency, media placeholder
- UX notes: bind to B-009 and B-039, 3-step mobile target
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-013 Listing detail
- Zone: Farmer/Buyer
- Route: `/app/market/listings/[listingId]`
- Purpose: Show commercial facts, seller context, and evidence needed before negotiation.
- Primary actions: Review price, Open offer, Inspect evidence
- Data dependencies: status, version, seller metadata
- UX notes: above-the-fold summary with sticky CTA, evidence strip below summary
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-014 Negotiation inbox
- Zone: Farmer/Buyer
- Route: `/app/market/negotiations`
- Purpose: Display threads ordered by urgency, confirmation state, and unread activity.
- Primary actions: Open thread, Filter state, Resume pending confirmation
- Data dependencies: thread state, latest amount, counterparty
- UX notes: badge heavy but readable, desktop split view optional
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-015 Negotiation thread detail
- Zone: Farmer/Buyer
- Route: `/app/market/negotiations/[threadId]`
- Purpose: Enable offer exchange with explicit confirmation checkpoints.
- Primary actions: Submit offer, Request confirmation, Cancel thread
- Data dependencies: offers history, checkpoint, current amount
- UX notes: composer fixed to bottom on mobile, timeline trust cues
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-016 Escrow and settlement center
- Zone: Farmer/Buyer
- Route: `/app/payments/escrow/[escrowId]`
- Purpose: Translate ledger and escrow state into a comprehensible status journey.
- Primary actions: Fund, Track funding, Release or dispute
- Data dependencies: escrow state, funding status, wallet balances
- UX notes: state timeline required, blocked-by-policy copy required
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-017 Wallet activity
- Zone: Farmer/Buyer
- Route: `/app/payments/wallet`
- Purpose: Provide current balance, movements, and pending entries without exposing ledger complexity.
- Primary actions: Review balance, Inspect transactions, Open settlement item
- Data dependencies: account totals, currency, pending entries
- UX notes: mobile card ledger view, desktop table with filters
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-018 Advisory request composer
- Zone: Farmer/Advisor
- Route: `/app/advisory/new`
- Purpose: Capture the user's question, context, and optional image or crop detail.
- Primary actions: Type question, Add crop context, Submit request
- Data dependencies: query text, country, optional media
- UX notes: single-column mobile flow, camera permission degraded mode
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-019 Advisory answer detail
- Zone: Farmer/Advisor
- Route: `/app/advisory/[requestId]`
- Purpose: Present guidance with citations, confidence, and follow-through actions.
- Primary actions: Review advice, Open citations, Log follow-up
- Data dependencies: citations, relevance, freshness
- UX notes: proof-before-trust layout, citations expandable not hidden
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-020 Citation drawer
- Zone: Shared advisory utility
- Route: `/app/advisory/[requestId]/citations`
- Purpose: Expose source metadata and excerpts in a compact, inspectable surface.
- Primary actions: Open source info, Compare citations, Copy summary
- Data dependencies: publisher, published date, trust tier
- UX notes: must work in bottom sheet on mobile, supports screen readers clearly
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-021 Climate alerts center
- Zone: Farmer/Advisor/Cooperative
- Route: `/app/climate/alerts`
- Purpose: Rank climate decisions by severity, farm context, and recency.
- Primary actions: Open alert, Acknowledge, Start follow-up
- Data dependencies: severity, farm context, provenance
- UX notes: color never sole signal, severity chips plus icon and copy
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-022 Climate alert detail
- Zone: Farmer/Advisor
- Route: `/app/climate/alerts/[alertId]`
- Purpose: Explain the signal, threshold, implication, and recommended next step.
- Primary actions: Review rationale, Launch task, Share with member
- Data dependencies: metric, threshold, signal source
- UX notes: trust row at top, localized risk copy
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-023 Finance decision queue
- Zone: Finance
- Route: `/app/finance/queue`
- Purpose: Work queue for partner decisions and payout events.
- Primary actions: Filter queue, Start review, Bulk triage
- Data dependencies: item type, amount, risk score
- UX notes: default split panel on desktop, single-column inbox on mobile fallback
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-024 Finance decision detail
- Zone: Finance
- Route: `/app/finance/queue/[itemId]`
- Purpose: Display evidence, boundary ownership, and approval controls.
- Primary actions: Read rationale, Inspect evidence, Approve or reject
- Data dependencies: partner response, responsibility boundary, data check
- UX notes: approval action pinned, decision audit trail visible
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-025 Payout event detail
- Zone: Finance
- Route: `/app/finance/payouts/[eventId]`
- Purpose: Show trigger basis, beneficiary scope, and payout decision controls.
- Primary actions: Review trigger, Inspect policy gate, Approve payout
- Data dependencies: trigger thresholds, country, evidence refs
- UX notes: clear human review framing, high-risk warning banner
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-026 Traceability chain view
- Zone: Farmer/Buyer/Cooperative
- Route: `/app/traceability/[consignmentId]`
- Purpose: Render the custody chain as a readable event timeline.
- Primary actions: Inspect event, Verify continuity, Open evidence gallery
- Data dependencies: event type, location, sequence
- UX notes: timeline never hidden behind tabs, desktop evidence side rail
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-027 Quality evidence gallery
- Zone: Farmer/Buyer/Cooperative
- Route: `/app/traceability/[consignmentId]/evidence`
- Purpose: Display attachments as chronological proof linked to specific events.
- Primary actions: Preview attachment, Filter by event type, Review metadata
- Data dependencies: attachment count, kind, checksum metadata
- UX notes: mobile list view first, avoid gallery-first vanity layout
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-028 Evidence capture flow
- Zone: Farmer/Cooperative
- Route: `/app/traceability/[consignmentId]/evidence/new`
- Purpose: Guide compliant capture, metadata entry, and upload state visibility.
- Primary actions: Capture media, Attach metadata, Queue upload
- Data dependencies: mime validation, size, capture source
- UX notes: upload queue visible immediately, works in offline deferred mode
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-029 Notifications center
- Zone: Shared
- Route: `/app/notifications`
- Purpose: Central place for alerts, offers, settlement changes, and review requests.
- Primary actions: Open item, Mark done, Filter by urgency
- Data dependencies: type, source object, timestamp
- UX notes: notification rows must deep-link deterministically, mobile swipe secondary only
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-030 Offline outbox
- Zone: Shared mobile utility
- Route: `/app/offline/outbox`
- Purpose: Expose queued writes, retries, and conflict outcomes.
- Primary actions: Retry now, Inspect payload summary, Resolve conflict
- Data dependencies: queued action, sync age, status
- UX notes: mandatory mobile utility route, must mirror inline badges elsewhere
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-031 Conflict resolution detail
- Zone: Shared
- Route: `/app/offline/conflicts/[conflictId]`
- Purpose: Explain competing payload versions and let the user resolve safely.
- Primary actions: Choose version, Keep latest, Escalate
- Data dependencies: winning copy, local changes, server changes
- UX notes: plain-language conflict summary, no raw JSON by default
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-032 Profile and preferences
- Zone: Shared
- Route: `/app/profile`
- Purpose: Manage identity, language, notification, and region preferences.
- Primary actions: Change language, Set notification channel, Review consent
- Data dependencies: identity state, preferred language, contact methods
- UX notes: consent revocation path always present, simple form segmentation
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-033 Member roster
- Zone: Cooperative
- Route: `/app/cooperative/members`
- Purpose: Support member search, segmentation, and issue triage.
- Primary actions: Search member, Open profile, Bulk act
- Data dependencies: member status, listing count, consent state
- UX notes: desktop table with sticky filters, mobile compact directory
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-034 Bulk listing workspace
- Zone: Cooperative
- Route: `/app/cooperative/bulk-listings`
- Purpose: Accelerate multi-member listing operations with controlled validation.
- Primary actions: Import draft set, Validate rows, Publish selected
- Data dependencies: bulk row status, errors, publish results
- UX notes: desktop-first, mobile summary only
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-035 Quality verification queue
- Zone: Cooperative
- Route: `/app/cooperative/quality`
- Purpose: Prioritize quality checks before dispatch or buyer handoff.
- Primary actions: Open consignment, Upload evidence, Mark verified
- Data dependencies: consignment status, missing proof, latest event
- UX notes: evidence-first queue columns, mobile stacked cards
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-036 Dispatch board
- Zone: Cooperative
- Route: `/app/cooperative/dispatch`
- Purpose: Track dispatch and receipt events operationally.
- Primary actions: Update dispatch, Open consignment, Confirm receipt
- Data dependencies: stage, location, exceptions
- UX notes: timeline plus map-ready placeholders, desktop board view
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-037 Advisor request queue
- Zone: Advisor
- Route: `/app/advisor/requests`
- Purpose: Triage incoming farmer requests by urgency and context quality.
- Primary actions: Open case, Assign self, Sort by urgency
- Data dependencies: query text, country, time open
- UX notes: desktop queue-detail, mobile stack with sticky filters
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-038 Intervention log detail
- Zone: Advisor
- Route: `/app/advisor/interventions/[caseId]`
- Purpose: Document what was advised, cited, and followed up.
- Primary actions: Add note, Schedule follow-up, Mark resolved
- Data dependencies: case context, recommendation history, follow-up status
- UX notes: timeline first, copy-optimized for field use
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-039 Analytics cockpit
- Zone: Admin
- Route: `/app/admin/analytics`
- Purpose: Show anonymized enterprise metrics without leaking raw identifiers.
- Primary actions: Inspect chart, Change filter, Export approved view
- Data dependencies: country, commodity, risk ratios
- UX notes: desktop first with virtualization, mobile summary KPI cards only
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-040 Observability console
- Zone: Admin
- Route: `/app/admin/observability`
- Purpose: Expose channel and country health, SLOs, and incident drill-down.
- Primary actions: Open alert, Inspect trend, Acknowledge
- Data dependencies: SLO state, country, channel
- UX notes: ops-heavy layout, not required for farmer mobile
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-041 Access and roles
- Zone: Admin
- Route: `/app/admin/access`
- Purpose: Manage role assignments and route entitlements.
- Primary actions: Grant role, Suspend access, Inspect audit
- Data dependencies: user, role, country scope
- UX notes: guardrail copy required, destructive actions behind confirmation
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

### S-042 Country configuration summary
- Zone: Admin
- Route: `/app/admin/countries`
- Purpose: Expose readiness state for languages, rails, policies, and rollout status.
- Primary actions: Review pack, Open gaps, Prepare launch
- Data dependencies: country policy, language bundle, payment rails
- UX notes: desktop summary grid, strong status semantics
- Entry points: role home, notification deep link, search result, or adjacent workflow step.
- Exit points: canonical detail route, previous queue, or success confirmation state.
- Loading state: render structural skeletons that preserve final layout and keep the primary action area stable.
- Empty state: explain whether the user has no data yet or filters removed visible results.
- Error state: show a plain-language cause, retry path, and escalation path if policy or partner review blocks progress.
- Offline state: if the route is writable, preserve draft intent locally and surface queue/outbox status.
- Trust state: expose citations, evidence counts, policy boundaries, or freshness markers relevant to the object type.
- Accessibility note: every control needs visible focus, large touch targets, and explicit labels.
- Mobile behavior: prioritize one-column reading order with sticky primary actions where needed.
- Desktop behavior: use multi-panel layouts only when cross-reference improves decision speed.
- Analytics events: emit view-opened, primary-action-clicked, and failure-recovery-selected with role and object metadata.
- Test hooks: include deterministic `data-testid` and stable object identifiers for journey automation.

## 7. Component Architecture and Design System
### 7.1 Design System Foundation
- Typography, color, spacing, and component rules are governed by `B-050` and implemented as code-level tokens.
- Interaction states, especially loading/error/offline/retry/trust, are governed by `B-051` and implemented as reusable component wrappers.
- Accessibility and readability checks are governed by `B-052` and applied to every base component story and route acceptance test.
- Low-end Android clarity thresholds are governed by `B-053` and influence CTA wording, step counts, and trust markers.
- The full release bar is governed by `B-054`, which means generic-looking layouts or missing trust cues are blocking findings.

### C-001 App shell
- Purpose: shared navigation and layout frame
- Notes: role-aware header, bottom nav, desktop side rail, country/language switch, outbox badge
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-002 Action card
- Purpose: queue-first card with title, state, trust row, and CTA
- Notes: used on role homes and inboxes
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-003 Trust row
- Purpose: small evidence strip showing citations, ownership, freshness, or proof count
- Notes: inline on high-stakes cards
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-004 State banner
- Purpose: loading, queued, blocked, or warning strip with deterministic action
- Notes: must map to B-051 states
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-005 Primary action bar
- Purpose: sticky mobile action zone with 1 primary and 1 secondary action
- Notes: supports low-literacy CTA labels
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-006 Section header
- Purpose: title, status, freshness, and optional evidence count
- Notes: used throughout detail screens
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-007 Data table / stacked rows
- Purpose: desktop table that collapses into structured mobile cards
- Notes: used for queues and analytics
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-008 Timeline rail
- Purpose: chronological event display with icons, trust markers, and action affordances
- Notes: used for escrow, negotiations, traceability
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-009 Evidence tile
- Purpose: attachment preview with kind, size, checksum state, and capture metadata
- Notes: used in quality evidence gallery
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-010 Citation tile
- Purpose: publisher, title, freshness, and excerpt stub
- Notes: used in advisory detail and citation drawer
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-011 Metric chip
- Purpose: compact severity or state label with icon and accessible text
- Notes: used for alerts and queue states
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-012 Filter drawer
- Purpose: mobile progressive disclosure for filters and sorting
- Notes: used on marketplace and queues
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-013 Empty state panel
- Purpose: explains why the space is empty and what to do next
- Notes: must distinguish true empty vs filtered empty
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-014 Conflict compare card
- Purpose: shows local and server versions with chosen winner
- Notes: used in sync conflict resolution
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-015 Upload queue item
- Purpose: shows capture state, retry count, and metadata completeness
- Notes: used in evidence capture and offline outbox
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-016 Review decision panel
- Purpose: finance approval controls with rationale summary and audit trail
- Notes: desktop-first
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-017 Chart frame
- Purpose: analytics wrapper with skeleton, error, empty, and annotation states
- Notes: admin only
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-018 Language-aware field
- Purpose: form field that supports helper text, examples, and localization variants
- Notes: shared across onboarding and workflows
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-019 Search bar
- Purpose: supports fast find with scope chips and offline-safe recent searches
- Notes: used across market and member directories
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

### C-020 Notification row
- Purpose: deep-link row with type icon, summary, timestamp, and resolution badge
- Notes: shared notifications surface
- Token requirements: consumes typography, color, radius, spacing, and semantic state tokens rather than inline styles.
- State requirements: must define loading, empty, error, offline, and disabled appearances when relevant.
- Accessibility requirements: labels, focus ring, keyboard support, and screen-reader description where complexity exists.
- Mobile requirement: maintain 44-48px touchable controls and avoid multi-line CTA labels where a short label exists.
- Testing requirement: story-level state snapshots and route-level interaction assertions.

## 8. State Management and Data Fetching Model
- Use server-first rendering for route shells and read-heavy surfaces, with client islands only where interaction state is rich or continuous.
- Use typed frontend adapters that mirror backend contract objects instead of leaking raw Python-centric shapes directly into view components.
- Keep route loaders thin and capability-specific: listing summaries, thread detail, escrow timeline, advisory result, queue items, analytics aggregates.
- Separate `server truth`, `local draft`, and `queued mutation` as three distinct stores so offline behavior remains understandable.
- The offline outbox owns queued writes and replay metadata; route-local components only reflect that state, they do not invent their own queue model.
- Cache read models optimistically only when the backend contract guarantees idempotent mutation or conflict-safe replay semantics.
- Never optimistic-update finance approval decisions, consent transitions, or payout outcomes without explicit server confirmation.
- Use cursor-based pagination on data-dense queues and listing indexes to stay aligned with mobile payload budgets.

### 8.1 Data Shape Layers
- Contract layer: typed request/response adapters aligned to backend contract versions.
- Domain view model layer: route-specific derived structures such as queue cards, timeline entries, trust rows, and analytics panels.
- Component props layer: minimal shape each component needs so visual building blocks stay reusable and testable.

## 9. Error, Recovery, and Trust UX
### ER-01 Validation failure
- Meaning: user can fix immediately in context
- Frontend response: keep focus in form, show field-level guidance, preserve entered values
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

### ER-02 Retryable network failure
- Meaning: system can replay or user can retry
- Frontend response: show queued or retry state with timestamp and action button
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

### ER-03 Conflict detected
- Meaning: local and server versions differ
- Frontend response: open conflict route with plain-language compare view
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

### ER-04 Policy block
- Meaning: action requires approval or violates guardrail
- Frontend response: show why blocked, owner of the decision, and next allowed action
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

### ER-05 Partner timeout
- Meaning: external finance or notification partner delayed
- Frontend response: show pending status rather than failure if replay-safe
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

### ER-06 Data unavailable
- Meaning: read model not ready or filtered empty
- Frontend response: differentiate true empty from temporary load or filtered view
- Copy style: short sentences, no internal jargon, and one strongest recommended action.

## 10. Mobile and Desktop Behavior
- Farmer, buyer, and advisor routes are designed mobile-first, then expanded to tablet and desktop.
- Finance, cooperative, and admin routes are designed desktop-first but still require a legible mobile fallback for urgent triage.
- Multi-column layouts are allowed only at `>= 1024px` and only if each pane contains a coherent task unit.
- Charts, wide tables, and dense audit logs collapse into summary stacks on mobile; no horizontal scroll for critical flows.
- Bottom sheets are preferred on mobile for filters, evidence previews, and citation lists; drawers or side panels are preferred on desktop.
- Sticky primary actions are valid on mobile create/review routes but should not obscure important trust or error information.

## 11. Accessibility Plan
- Adopt WCAG 2.2 AA as baseline and test against keyboard, screen reader, contrast, focus appearance, and target size requirements.
- Apply `B-052` readability and accessibility rules to every farmer-facing screen before implementation signoff.
- Maintain visible focus indicators across all custom components and never rely on browser defaults alone.
- Ensure every icon-only control has an accessible name and every state chip has text meaning.
- Use structured heading order so long detail views remain navigable by assistive technology.
- Localize helper text, error text, and trust labels without breaking reading order or CTA brevity.

## 12. Performance and Delivery Budgets
- Guard mobile listing and offer payloads with the compact profile from `B-039` and defer secondary data until detail routes.
- Target `LCP <= 2.5s`, `INP <= 200ms`, `CLS <= 0.1` for top farmer routes where feasible, with Agrodomain-specific p95 action budgets from `B-044` used as hard release bars.
- Keep write interactions idempotent and queue-aware so retries do not create duplicate commitments.
- Use image capture compression, upload chunking, and background sync for evidence workflows on weak connections.
- Virtualize only where data density demands it; do not add heavy client complexity to simple mobile routes.
- Instrument route chunk sizes, hydration cost, and replay latency in CI before any large visual expansion wave.

## 13. Backend Contract Integration Map
### B-002 Identity and consent
- Backend module: `IdentityConsentService`
- Frontend surfaces: onboarding, profile, consent review
- Integration implication: state transitions and revocation UX
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-004 USSD adapter
- Backend module: `ussd_adapter`
- Frontend surfaces: future copy parity and session-safe summaries
- Integration implication: frontend content model for short labels and step compression
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-005 WhatsApp adapter
- Backend module: `whatsapp_adapter`
- Frontend surfaces: message summaries and handoff receipts
- Integration implication: cross-channel status wording
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-006 PWA offline queue
- Backend module: `offline_queue`
- Frontend surfaces: offline outbox, queued writes, retry banners
- Integration implication: must mirror queue semantics exactly
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-013 Settlement notifications
- Backend module: `settlement_notifications`
- Frontend surfaces: notifications center and settlement timeline
- Integration implication: requires deterministic deep links
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-016 Multilingual delivery
- Backend module: `multilingual_delivery`
- Frontend surfaces: language switch, localized helper text
- Integration implication: translation slot architecture
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-018 Climate alert rules
- Backend module: `ClimateAlertRulesEngine`
- Frontend surfaces: alerts center and detail
- Integration implication: must surface threshold and provenance
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-019 MRV evidence
- Backend module: `mrv_evidence_service`
- Frontend surfaces: future climate proof views
- Integration implication: same evidence display primitives
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-020 Finance partner adapter
- Backend module: `FinancePartnerDecisionAdapter`
- Frontend surfaces: finance detail and boundary UI
- Integration implication: must show partner ownership and rationale
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-021 Insurance trigger registry
- Backend module: `insurance_trigger_registry`
- Frontend surfaces: payout review and payout detail
- Integration implication: must show trigger basis and evidence references
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-022 Finance HITL console
- Backend module: `FinanceHitlConsole`
- Frontend surfaces: finance queue and review states
- Integration implication: filtered-empty and pending states are contractually meaningful
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-023 Traceability event chain
- Backend module: `TraceabilityEventChainService`
- Frontend surfaces: traceability timeline
- Integration implication: immutable event order and continuity markers
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-024 Quality evidence attachments
- Backend module: `QualityEvidenceAttachmentService`
- Frontend surfaces: evidence gallery and capture
- Integration implication: checksum, size, and kind metadata surfaced
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-025 Enterprise analytics mart
- Backend module: `EnterpriseAnalyticsDataMartContract`
- Frontend surfaces: analytics cockpit
- Integration implication: anonymized-only display posture
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-026 Partner API gateway
- Backend module: `partner_api_gateway`
- Frontend surfaces: future partner-facing status and settings
- Integration implication: separate internal from external surfaces
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-027 Observability
- Backend module: `observability`
- Frontend surfaces: ops console and country health
- Integration implication: country/channel SLO visualization
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-028 QA harness
- Backend module: `multi_channel_qa_harness`
- Frontend surfaces: test fixture alignment
- Integration implication: frontend IDs should align with journey coverage
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-029 Plan review gate
- Backend module: `plan_adversarial_review_gate`
- Frontend surfaces: delivery governance
- Integration implication: implementation backlog must preserve traceability
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-030 Architecture review gate
- Backend module: `architecture_adversarial_review_gate`
- Frontend surfaces: release validation UI evidence
- Integration implication: frontend architecture invariants
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-039 Mobile API profile
- Backend module: `mobile_api_profile`
- Frontend surfaces: compact route data strategy
- Integration implication: payload discipline for mobile listing and offers
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-040 Offline action queue
- Backend module: `offline_action_queue`
- Frontend surfaces: write queue UX
- Integration implication: must expose action token and replay status
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-041 Sync conflict resolver
- Backend module: `sync_conflict_resolver`
- Frontend surfaces: conflict detail UI
- Integration implication: explain resolution deterministically
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-042 Device capability layer
- Backend module: `device_capability_layer`
- Frontend surfaces: camera, storage, location affordances
- Integration implication: capability state cannot be hidden
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-043 Notification broker
- Backend module: `notification_broker`
- Frontend surfaces: notifications center
- Integration implication: delivery source attribution
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-044 Android performance harness
- Backend module: `android_performance_harness`
- Frontend surfaces: performance budgets and test gates
- Integration implication: used as release thresholds
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-045 Device registry
- Backend module: `device_registry`
- Frontend surfaces: future device trust indicators
- Integration implication: deferred but should inform profile hooks
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-046 Sensor event schema
- Backend module: `sensor_event_schema`
- Frontend surfaces: future telemetry views
- Integration implication: not phase-1 blocking
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-047 Telemetry ingestion API
- Backend module: `telemetry_ingestion_api`
- Frontend surfaces: future monitoring views
- Integration implication: not phase-1 blocking
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-048 Event bus partitioning
- Backend module: `event_bus_partitioning`
- Frontend surfaces: future observability drill-down
- Integration implication: internal-only for now
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-049 Digital twin governance
- Backend module: `digital_twin_governance`
- Frontend surfaces: future advanced traceability and telemetry
- Integration implication: not phase-1 blocking
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-050 Visual language system
- Backend module: `visual_language_system`
- Frontend surfaces: design tokens and conformance
- Integration implication: frontend must implement directly
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-051 Interaction feedback library
- Backend module: `interaction_feedback_library`
- Frontend surfaces: state library
- Integration implication: frontend state components map here exactly
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-052 Accessibility readability pack
- Backend module: `accessibility_readability_pack`
- Frontend surfaces: copy and component accessibility
- Integration implication: release gate dependency
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-053 Android mobile UX harness
- Backend module: `android_mobile_ux_harness`
- Frontend surfaces: mobile acceptance tests
- Integration implication: route copy and step counts must comply
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

### B-054 UX excellence review gate
- Backend module: `ux_excellence_review_gate`
- Frontend surfaces: pre-build and pre-release signoff
- Integration implication: frontend design quality gate
- Required adapter rule: frontend maps backend states into explicit presentation enums; no implicit string handling in components.
- Required test rule: at least one journey test and one state test must cover this integration where the contract is user-visible.

## 14. Implementation Architecture
- Recommended frontend stack: Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui primitives, route-based code splitting, server actions only where they preserve contract clarity.
- Use a feature-and-route hybrid folder structure: route groups by role, shared domain adapters by capability, and design system components by primitive/composite level.
- Create a `contracts/` frontend package that mirrors backend beads as typed DTO adapters and validation helpers.
- Create a `ui-system/` package for tokens, semantic colors, state wrappers, and trust components tied to `B-050..B-054`.
- Create a `journeys/` or `e2e/` package early so test IDs and route invariants are designed with automation in mind.

## 15. Suggested Repository Layout
- `apps/web/app/(public)/...`
- `apps/web/app/(shared)/...`
- `apps/web/app/(farmer)/...`
- `apps/web/app/(buyer)/...`
- `apps/web/app/(cooperative)/...`
- `apps/web/app/(advisor)/...`
- `apps/web/app/(finance)/...`
- `apps/web/app/(admin)/...`
- `packages/contracts/src/...`
- `packages/ui-system/src/tokens/...`
- `packages/ui-system/src/components/...`
- `packages/domain-view-models/src/...`
- `tests/e2e/...`

## 16. Analytics and Instrumentation
- Every critical route emits route-opened, queue-depth-rendered, primary-action-clicked, and terminal-state-reached events.
- Every offline mutation emits queued, replay-started, replay-succeeded, replay-failed, and conflict-created events.
- Every trust-bearing object emits evidence-opened or citation-opened events to measure whether users inspect proof before action.
- Finance review routes emit review-started, review-completed, and reason-path metrics for operational throughput analysis.
- Accessibility instrumentation records keyboard-only completion for key flows in test environments.

## 17. Security and Privacy UX Considerations
- Never expose raw identifiers from enterprise analytics rows; preserve the anonymized posture already enforced by `B-025`.
- Keep consent and revocation history visible to the user but do not overexpose internal policy implementation detail.
- Protect high-risk action controls with explicit confirmation and role-scoped visibility.
- Mask or abbreviate sensitive references in mobile views where shoulder-surfing risk is high.
- Separate user-facing error copy from operator debugging metadata with progressive disclosure.

## 18. Release Gates for Frontend Implementation
- Gate F-A: design tokens, interaction states, and base components mapped to `B-050..B-052`.
- Gate F-B: low-end Android route checks pass for farmer create/reply/review flows under `B-053` and `B-044` budgets.
- Gate F-C: critical journeys pass for listing, negotiation, escrow, advisory, alerts, and finance review routes.
- Gate F-D: accessibility sweep passes for keyboard, focus, labels, contrast, and readable copy.
- Gate F-E: UX excellence review passes without template-like layout or missing trust cues under `B-054`.

## 19. Risks and Mitigations
### RK-01 Trying to ship every role at full depth in one wave
- Mitigation: Use bead routing and wave slicing around critical workflows first.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

### RK-02 Generic dashboard drift
- Mitigation: Require evidence rails and queue-first home layouts in design review.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

### RK-03 Offline behavior hidden behind implementation detail
- Mitigation: Build outbox and conflict routes in the first wave, not later.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

### RK-04 Contract mismatch between backend and frontend naming
- Mitigation: Introduce typed contract adapters and integration fixtures before page proliferation.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

### RK-05 Localization debt
- Mitigation: Reserve translation-ready component props and copy tokens from day one.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

### RK-06 Heavy client bundle growth
- Mitigation: Set per-route budgets and fail CI when mobile routes cross the agreed ceiling.
- Owner: route lead plus architecture reviewer for cross-cutting risks.

## 20. Frontend Readiness Summary
- The backend is sufficiently complete to support a dedicated frontend implementation program immediately.
- The frontend should begin with a unified app shell, critical workflows, and contract adapters rather than with isolated visual exploration.
- The route plan, component plan, and contract map are stable enough to convert directly into a routed bead backlog.
- The next step after this document is Step `8` swarm launch on the frontend bead package with mandatory rolling reviews and mobile-first QA gates.

## Appendix A. Detailed Route Specifications
### Appendix S-001 Detailed Spec
- Action 1: Choose role.
- Action 2: Review proof points.
- Action 3: Start onboarding.
- Data field 1: brand proof.
- Data field 2: country availability.
- Data field 3: language choice.
- Route contract: `/` remains the canonical path for landing and role chooser.
- Role zone: Public shell.
- Purpose recap: Explain value, route users into the correct workspace, and anchor trust early.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-002 Detailed Spec
- Action 1: Enter phone or email.
- Action 2: Verify method.
- Action 3: Select workspace.
- Data field 1: identity state.
- Data field 2: channel preference.
- Data field 3: last active role.
- Route contract: `/signin` remains the canonical path for sign-in and identity entry.
- Role zone: Shared auth.
- Purpose recap: Capture the smallest identity payload needed to resume work safely.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-003 Detailed Spec
- Action 1: Read scopes.
- Action 2: Grant consent.
- Action 3: Review revocation path.
- Data field 1: policy version.
- Data field 2: scope ids.
- Data field 3: country-specific text.
- Route contract: `/onboarding/consent` remains the canonical path for consent and policy capture.
- Role zone: Shared onboarding.
- Purpose recap: Present consent scopes in plain language and record acceptance or refusal.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-004 Detailed Spec
- Action 1: Open workspace.
- Action 2: Resume pending task.
- Action 3: Switch role.
- Data field 1: assigned roles.
- Data field 2: open queues.
- Data field 3: recent objects.
- Route contract: `/app` remains the canonical path for workspace selector.
- Role zone: Shared shell.
- Purpose recap: Route authenticated users to the right role home and recent work.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-005 Detailed Spec
- Action 1: Create listing.
- Action 2: Reply to offer.
- Action 3: View alert.
- Data field 1: queue counts.
- Data field 2: wallet status.
- Data field 3: last sync age.
- Route contract: `/app/farmer` remains the canonical path for farmer home queue.
- Role zone: Farmer.
- Purpose recap: Summarize the farmer's current jobs with one dominant next action.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-006 Detailed Spec
- Action 1: Search market.
- Action 2: Open negotiation.
- Action 3: Track receipt.
- Data field 1: saved filters.
- Data field 2: open offers.
- Data field 3: delivery status.
- Route contract: `/app/buyer` remains the canonical path for buyer home queue.
- Role zone: Buyer.
- Purpose recap: Show active purchase paths and pending confirmations.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-007 Detailed Spec
- Action 1: Review members.
- Action 2: Open quality queue.
- Action 3: Check dispatches.
- Data field 1: pending verifications.
- Data field 2: member listing health.
- Data field 3: logistics status.
- Route contract: `/app/cooperative` remains the canonical path for cooperative operations home.
- Role zone: Cooperative.
- Purpose recap: Center the operator on member exceptions, dispatch work, and approvals.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-008 Detailed Spec
- Action 1: Open request.
- Action 2: Review citation pack.
- Action 3: Log intervention.
- Data field 1: request SLA.
- Data field 2: farmer context.
- Data field 3: alert severity.
- Route contract: `/app/advisor` remains the canonical path for advisor workbench home.
- Role zone: Advisor.
- Purpose recap: Surface urgent farmer questions, climate follow-ups, and incomplete interventions.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-009 Detailed Spec
- Action 1: Start review.
- Action 2: Inspect evidence.
- Action 3: Approve or reject.
- Data field 1: risk score.
- Data field 2: country.
- Data field 3: partner reference.
- Route contract: `/app/finance` remains the canonical path for finance queue home.
- Role zone: Finance.
- Purpose recap: Prioritize partner decisions, payout events, and risk exceptions.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-010 Detailed Spec
- Action 1: Open analytics.
- Action 2: Inspect health.
- Action 3: Manage access.
- Data field 1: country readiness.
- Data field 2: SLO alerts.
- Data field 3: role assignments.
- Route contract: `/app/admin` remains the canonical path for enterprise/admin home.
- Role zone: Admin.
- Purpose recap: Expose rollout, observability, analytics, and configuration status.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-011 Detailed Spec
- Action 1: Browse cards.
- Action 2: Filter by commodity.
- Action 3: Open detail.
- Data field 1: listing summary.
- Data field 2: freshness.
- Data field 3: trust markers.
- Route contract: `/app/market/listings` remains the canonical path for listings index.
- Role zone: Farmer/Buyer.
- Purpose recap: Provide searchable, filterable inventory with compact mobile cards.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-012 Detailed Spec
- Action 1: Set commodity.
- Action 2: Set quantity and price.
- Action 3: Publish or save draft.
- Data field 1: listing payload.
- Data field 2: country and currency.
- Data field 3: media placeholder.
- Route contract: `/app/market/listings/new` remains the canonical path for listing create wizard.
- Role zone: Farmer/Cooperative.
- Purpose recap: Guide the user through creating or drafting a listing with the fewest possible steps.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-013 Detailed Spec
- Action 1: Review price.
- Action 2: Open offer.
- Action 3: Inspect evidence.
- Data field 1: status.
- Data field 2: version.
- Data field 3: seller metadata.
- Route contract: `/app/market/listings/[listingId]` remains the canonical path for listing detail.
- Role zone: Farmer/Buyer.
- Purpose recap: Show commercial facts, seller context, and evidence needed before negotiation.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-014 Detailed Spec
- Action 1: Open thread.
- Action 2: Filter state.
- Action 3: Resume pending confirmation.
- Data field 1: thread state.
- Data field 2: latest amount.
- Data field 3: counterparty.
- Route contract: `/app/market/negotiations` remains the canonical path for negotiation inbox.
- Role zone: Farmer/Buyer.
- Purpose recap: Display threads ordered by urgency, confirmation state, and unread activity.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-015 Detailed Spec
- Action 1: Submit offer.
- Action 2: Request confirmation.
- Action 3: Cancel thread.
- Data field 1: offers history.
- Data field 2: checkpoint.
- Data field 3: current amount.
- Route contract: `/app/market/negotiations/[threadId]` remains the canonical path for negotiation thread detail.
- Role zone: Farmer/Buyer.
- Purpose recap: Enable offer exchange with explicit confirmation checkpoints.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-016 Detailed Spec
- Action 1: Fund.
- Action 2: Track funding.
- Action 3: Release or dispute.
- Data field 1: escrow state.
- Data field 2: funding status.
- Data field 3: wallet balances.
- Route contract: `/app/payments/escrow/[escrowId]` remains the canonical path for escrow and settlement center.
- Role zone: Farmer/Buyer.
- Purpose recap: Translate ledger and escrow state into a comprehensible status journey.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-017 Detailed Spec
- Action 1: Review balance.
- Action 2: Inspect transactions.
- Action 3: Open settlement item.
- Data field 1: account totals.
- Data field 2: currency.
- Data field 3: pending entries.
- Route contract: `/app/payments/wallet` remains the canonical path for wallet activity.
- Role zone: Farmer/Buyer.
- Purpose recap: Provide current balance, movements, and pending entries without exposing ledger complexity.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-018 Detailed Spec
- Action 1: Type question.
- Action 2: Add crop context.
- Action 3: Submit request.
- Data field 1: query text.
- Data field 2: country.
- Data field 3: optional media.
- Route contract: `/app/advisory/new` remains the canonical path for advisory request composer.
- Role zone: Farmer/Advisor.
- Purpose recap: Capture the user's question, context, and optional image or crop detail.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-019 Detailed Spec
- Action 1: Review advice.
- Action 2: Open citations.
- Action 3: Log follow-up.
- Data field 1: citations.
- Data field 2: relevance.
- Data field 3: freshness.
- Route contract: `/app/advisory/[requestId]` remains the canonical path for advisory answer detail.
- Role zone: Farmer/Advisor.
- Purpose recap: Present guidance with citations, confidence, and follow-through actions.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-020 Detailed Spec
- Action 1: Open source info.
- Action 2: Compare citations.
- Action 3: Copy summary.
- Data field 1: publisher.
- Data field 2: published date.
- Data field 3: trust tier.
- Route contract: `/app/advisory/[requestId]/citations` remains the canonical path for citation drawer.
- Role zone: Shared advisory utility.
- Purpose recap: Expose source metadata and excerpts in a compact, inspectable surface.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-021 Detailed Spec
- Action 1: Open alert.
- Action 2: Acknowledge.
- Action 3: Start follow-up.
- Data field 1: severity.
- Data field 2: farm context.
- Data field 3: provenance.
- Route contract: `/app/climate/alerts` remains the canonical path for climate alerts center.
- Role zone: Farmer/Advisor/Cooperative.
- Purpose recap: Rank climate decisions by severity, farm context, and recency.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-022 Detailed Spec
- Action 1: Review rationale.
- Action 2: Launch task.
- Action 3: Share with member.
- Data field 1: metric.
- Data field 2: threshold.
- Data field 3: signal source.
- Route contract: `/app/climate/alerts/[alertId]` remains the canonical path for climate alert detail.
- Role zone: Farmer/Advisor.
- Purpose recap: Explain the signal, threshold, implication, and recommended next step.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-023 Detailed Spec
- Action 1: Filter queue.
- Action 2: Start review.
- Action 3: Bulk triage.
- Data field 1: item type.
- Data field 2: amount.
- Data field 3: risk score.
- Route contract: `/app/finance/queue` remains the canonical path for finance decision queue.
- Role zone: Finance.
- Purpose recap: Work queue for partner decisions and payout events.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-024 Detailed Spec
- Action 1: Read rationale.
- Action 2: Inspect evidence.
- Action 3: Approve or reject.
- Data field 1: partner response.
- Data field 2: responsibility boundary.
- Data field 3: data check.
- Route contract: `/app/finance/queue/[itemId]` remains the canonical path for finance decision detail.
- Role zone: Finance.
- Purpose recap: Display evidence, boundary ownership, and approval controls.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-025 Detailed Spec
- Action 1: Review trigger.
- Action 2: Inspect policy gate.
- Action 3: Approve payout.
- Data field 1: trigger thresholds.
- Data field 2: country.
- Data field 3: evidence refs.
- Route contract: `/app/finance/payouts/[eventId]` remains the canonical path for payout event detail.
- Role zone: Finance.
- Purpose recap: Show trigger basis, beneficiary scope, and payout decision controls.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-026 Detailed Spec
- Action 1: Inspect event.
- Action 2: Verify continuity.
- Action 3: Open evidence gallery.
- Data field 1: event type.
- Data field 2: location.
- Data field 3: sequence.
- Route contract: `/app/traceability/[consignmentId]` remains the canonical path for traceability chain view.
- Role zone: Farmer/Buyer/Cooperative.
- Purpose recap: Render the custody chain as a readable event timeline.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-027 Detailed Spec
- Action 1: Preview attachment.
- Action 2: Filter by event type.
- Action 3: Review metadata.
- Data field 1: attachment count.
- Data field 2: kind.
- Data field 3: checksum metadata.
- Route contract: `/app/traceability/[consignmentId]/evidence` remains the canonical path for quality evidence gallery.
- Role zone: Farmer/Buyer/Cooperative.
- Purpose recap: Display attachments as chronological proof linked to specific events.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-028 Detailed Spec
- Action 1: Capture media.
- Action 2: Attach metadata.
- Action 3: Queue upload.
- Data field 1: mime validation.
- Data field 2: size.
- Data field 3: capture source.
- Route contract: `/app/traceability/[consignmentId]/evidence/new` remains the canonical path for evidence capture flow.
- Role zone: Farmer/Cooperative.
- Purpose recap: Guide compliant capture, metadata entry, and upload state visibility.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-029 Detailed Spec
- Action 1: Open item.
- Action 2: Mark done.
- Action 3: Filter by urgency.
- Data field 1: type.
- Data field 2: source object.
- Data field 3: timestamp.
- Route contract: `/app/notifications` remains the canonical path for notifications center.
- Role zone: Shared.
- Purpose recap: Central place for alerts, offers, settlement changes, and review requests.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-030 Detailed Spec
- Action 1: Retry now.
- Action 2: Inspect payload summary.
- Action 3: Resolve conflict.
- Data field 1: queued action.
- Data field 2: sync age.
- Data field 3: status.
- Route contract: `/app/offline/outbox` remains the canonical path for offline outbox.
- Role zone: Shared mobile utility.
- Purpose recap: Expose queued writes, retries, and conflict outcomes.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-031 Detailed Spec
- Action 1: Choose version.
- Action 2: Keep latest.
- Action 3: Escalate.
- Data field 1: winning copy.
- Data field 2: local changes.
- Data field 3: server changes.
- Route contract: `/app/offline/conflicts/[conflictId]` remains the canonical path for conflict resolution detail.
- Role zone: Shared.
- Purpose recap: Explain competing payload versions and let the user resolve safely.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-032 Detailed Spec
- Action 1: Change language.
- Action 2: Set notification channel.
- Action 3: Review consent.
- Data field 1: identity state.
- Data field 2: preferred language.
- Data field 3: contact methods.
- Route contract: `/app/profile` remains the canonical path for profile and preferences.
- Role zone: Shared.
- Purpose recap: Manage identity, language, notification, and region preferences.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-033 Detailed Spec
- Action 1: Search member.
- Action 2: Open profile.
- Action 3: Bulk act.
- Data field 1: member status.
- Data field 2: listing count.
- Data field 3: consent state.
- Route contract: `/app/cooperative/members` remains the canonical path for member roster.
- Role zone: Cooperative.
- Purpose recap: Support member search, segmentation, and issue triage.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-034 Detailed Spec
- Action 1: Import draft set.
- Action 2: Validate rows.
- Action 3: Publish selected.
- Data field 1: bulk row status.
- Data field 2: errors.
- Data field 3: publish results.
- Route contract: `/app/cooperative/bulk-listings` remains the canonical path for bulk listing workspace.
- Role zone: Cooperative.
- Purpose recap: Accelerate multi-member listing operations with controlled validation.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-035 Detailed Spec
- Action 1: Open consignment.
- Action 2: Upload evidence.
- Action 3: Mark verified.
- Data field 1: consignment status.
- Data field 2: missing proof.
- Data field 3: latest event.
- Route contract: `/app/cooperative/quality` remains the canonical path for quality verification queue.
- Role zone: Cooperative.
- Purpose recap: Prioritize quality checks before dispatch or buyer handoff.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-036 Detailed Spec
- Action 1: Update dispatch.
- Action 2: Open consignment.
- Action 3: Confirm receipt.
- Data field 1: stage.
- Data field 2: location.
- Data field 3: exceptions.
- Route contract: `/app/cooperative/dispatch` remains the canonical path for dispatch board.
- Role zone: Cooperative.
- Purpose recap: Track dispatch and receipt events operationally.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-037 Detailed Spec
- Action 1: Open case.
- Action 2: Assign self.
- Action 3: Sort by urgency.
- Data field 1: query text.
- Data field 2: country.
- Data field 3: time open.
- Route contract: `/app/advisor/requests` remains the canonical path for advisor request queue.
- Role zone: Advisor.
- Purpose recap: Triage incoming farmer requests by urgency and context quality.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-038 Detailed Spec
- Action 1: Add note.
- Action 2: Schedule follow-up.
- Action 3: Mark resolved.
- Data field 1: case context.
- Data field 2: recommendation history.
- Data field 3: follow-up status.
- Route contract: `/app/advisor/interventions/[caseId]` remains the canonical path for intervention log detail.
- Role zone: Advisor.
- Purpose recap: Document what was advised, cited, and followed up.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-039 Detailed Spec
- Action 1: Inspect chart.
- Action 2: Change filter.
- Action 3: Export approved view.
- Data field 1: country.
- Data field 2: commodity.
- Data field 3: risk ratios.
- Route contract: `/app/admin/analytics` remains the canonical path for analytics cockpit.
- Role zone: Admin.
- Purpose recap: Show anonymized enterprise metrics without leaking raw identifiers.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-040 Detailed Spec
- Action 1: Open alert.
- Action 2: Inspect trend.
- Action 3: Acknowledge.
- Data field 1: SLO state.
- Data field 2: country.
- Data field 3: channel.
- Route contract: `/app/admin/observability` remains the canonical path for observability console.
- Role zone: Admin.
- Purpose recap: Expose channel and country health, SLOs, and incident drill-down.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-041 Detailed Spec
- Action 1: Grant role.
- Action 2: Suspend access.
- Action 3: Inspect audit.
- Data field 1: user.
- Data field 2: role.
- Data field 3: country scope.
- Route contract: `/app/admin/access` remains the canonical path for access and roles.
- Role zone: Admin.
- Purpose recap: Manage role assignments and route entitlements.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

### Appendix S-042 Detailed Spec
- Action 1: Review pack.
- Action 2: Open gaps.
- Action 3: Prepare launch.
- Data field 1: country policy.
- Data field 2: language bundle.
- Data field 3: payment rails.
- Route contract: `/app/admin/countries` remains the canonical path for country configuration summary.
- Role zone: Admin.
- Purpose recap: Expose readiness state for languages, rails, policies, and rollout status.
- Loader behavior: request only the minimum summary payload required for first render, then progressively hydrate deeper context.
- Mutation behavior: preserve optimistic clarity only where replay and idempotency are safe; otherwise wait for confirmed server state.
- Audit behavior: action outcomes should be traceable back to a stable object identifier and event timestamp.
- Localization behavior: all visible labels and helper text route through copy tokens with country and language overrides.
- Accessibility behavior: field labels, headings, landmarks, and focus order are part of the route contract, not decoration.
- QA behavior: route must be addressable by deterministic test hooks for critical, error, responsive, and integrity journeys.
- Mobile behavior: primary content appears above secondary inspection surfaces such as tabs, drawers, or evidence metadata.
- Desktop behavior: support side-by-side context only where the user benefits from simultaneous reading and action.
- Recovery behavior: if a write fails, the route shows either inline recovery or a clear handoff to the offline outbox/conflict route.

## Appendix B. Component Contract Notes
### Appendix C-001 App shell
- Purpose recap: shared navigation and layout frame.
- Detail note: role-aware header, bottom nav, desktop side rail, country/language switch, outbox badge.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-002 Action card
- Purpose recap: queue-first card with title, state, trust row, and CTA.
- Detail note: used on role homes and inboxes.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-003 Trust row
- Purpose recap: small evidence strip showing citations, ownership, freshness, or proof count.
- Detail note: inline on high-stakes cards.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-004 State banner
- Purpose recap: loading, queued, blocked, or warning strip with deterministic action.
- Detail note: must map to B-051 states.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-005 Primary action bar
- Purpose recap: sticky mobile action zone with 1 primary and 1 secondary action.
- Detail note: supports low-literacy CTA labels.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-006 Section header
- Purpose recap: title, status, freshness, and optional evidence count.
- Detail note: used throughout detail screens.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-007 Data table / stacked rows
- Purpose recap: desktop table that collapses into structured mobile cards.
- Detail note: used for queues and analytics.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-008 Timeline rail
- Purpose recap: chronological event display with icons, trust markers, and action affordances.
- Detail note: used for escrow, negotiations, traceability.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-009 Evidence tile
- Purpose recap: attachment preview with kind, size, checksum state, and capture metadata.
- Detail note: used in quality evidence gallery.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-010 Citation tile
- Purpose recap: publisher, title, freshness, and excerpt stub.
- Detail note: used in advisory detail and citation drawer.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-011 Metric chip
- Purpose recap: compact severity or state label with icon and accessible text.
- Detail note: used for alerts and queue states.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-012 Filter drawer
- Purpose recap: mobile progressive disclosure for filters and sorting.
- Detail note: used on marketplace and queues.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-013 Empty state panel
- Purpose recap: explains why the space is empty and what to do next.
- Detail note: must distinguish true empty vs filtered empty.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-014 Conflict compare card
- Purpose recap: shows local and server versions with chosen winner.
- Detail note: used in sync conflict resolution.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-015 Upload queue item
- Purpose recap: shows capture state, retry count, and metadata completeness.
- Detail note: used in evidence capture and offline outbox.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-016 Review decision panel
- Purpose recap: finance approval controls with rationale summary and audit trail.
- Detail note: desktop-first.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-017 Chart frame
- Purpose recap: analytics wrapper with skeleton, error, empty, and annotation states.
- Detail note: admin only.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-018 Language-aware field
- Purpose recap: form field that supports helper text, examples, and localization variants.
- Detail note: shared across onboarding and workflows.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-019 Search bar
- Purpose recap: supports fast find with scope chips and offline-safe recent searches.
- Detail note: used across market and member directories.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

### Appendix C-020 Notification row
- Purpose recap: deep-link row with type icon, summary, timestamp, and resolution badge.
- Detail note: shared notifications surface.
- Inputs: semantic props, trust metadata, and state enums rather than arbitrary style flags.
- Outputs: visual state plus optional analytics event emission hooks.
- Composition rule: no component may hide a required trust row where the route contract calls for proof display.
- Accessibility rule: keyboard interaction and assistive labels are mandatory, not opt-in.
- Theming rule: color and typography must resolve from tokens, not custom local overrides.
- Test rule: each component has baseline state coverage for normal, loading, error, empty, and disabled or blocked states as relevant.

## Appendix C. Screen-to-Component Pairings
- `S-001` uses `C-001` because app shell supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-002` because action card supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-003` because trust row supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-004` because state banner supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-005` because primary action bar supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-006` because section header supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-007` because data table / stacked rows supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-008` because timeline rail supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-009` because evidence tile supports the core interaction pattern for landing and role chooser.
- `S-001` uses `C-010` because citation tile supports the core interaction pattern for landing and role chooser.
- `S-002` uses `C-001` because app shell supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-002` because action card supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-003` because trust row supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-004` because state banner supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-005` because primary action bar supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-006` because section header supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-007` because data table / stacked rows supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-008` because timeline rail supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-009` because evidence tile supports the core interaction pattern for sign-in and identity entry.
- `S-002` uses `C-010` because citation tile supports the core interaction pattern for sign-in and identity entry.
- `S-003` uses `C-001` because app shell supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-002` because action card supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-003` because trust row supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-004` because state banner supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-005` because primary action bar supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-006` because section header supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-007` because data table / stacked rows supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-008` because timeline rail supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-009` because evidence tile supports the core interaction pattern for consent and policy capture.
- `S-003` uses `C-010` because citation tile supports the core interaction pattern for consent and policy capture.
- `S-004` uses `C-001` because app shell supports the core interaction pattern for workspace selector.
- `S-004` uses `C-002` because action card supports the core interaction pattern for workspace selector.
- `S-004` uses `C-003` because trust row supports the core interaction pattern for workspace selector.
- `S-004` uses `C-004` because state banner supports the core interaction pattern for workspace selector.
- `S-004` uses `C-005` because primary action bar supports the core interaction pattern for workspace selector.
- `S-004` uses `C-006` because section header supports the core interaction pattern for workspace selector.
- `S-004` uses `C-007` because data table / stacked rows supports the core interaction pattern for workspace selector.
- `S-004` uses `C-008` because timeline rail supports the core interaction pattern for workspace selector.
- `S-004` uses `C-009` because evidence tile supports the core interaction pattern for workspace selector.
- `S-004` uses `C-010` because citation tile supports the core interaction pattern for workspace selector.
- `S-005` uses `C-001` because app shell supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-002` because action card supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-003` because trust row supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-004` because state banner supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-005` because primary action bar supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-006` because section header supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-007` because data table / stacked rows supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-008` because timeline rail supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-009` because evidence tile supports the core interaction pattern for farmer home queue.
- `S-005` uses `C-010` because citation tile supports the core interaction pattern for farmer home queue.
- `S-006` uses `C-001` because app shell supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-002` because action card supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-003` because trust row supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-004` because state banner supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-005` because primary action bar supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-006` because section header supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-007` because data table / stacked rows supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-008` because timeline rail supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-009` because evidence tile supports the core interaction pattern for buyer home queue.
- `S-006` uses `C-010` because citation tile supports the core interaction pattern for buyer home queue.
- `S-007` uses `C-001` because app shell supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-002` because action card supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-003` because trust row supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-004` because state banner supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-005` because primary action bar supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-006` because section header supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-007` because data table / stacked rows supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-008` because timeline rail supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-009` because evidence tile supports the core interaction pattern for cooperative operations home.
- `S-007` uses `C-010` because citation tile supports the core interaction pattern for cooperative operations home.
- `S-008` uses `C-001` because app shell supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-002` because action card supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-003` because trust row supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-004` because state banner supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-005` because primary action bar supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-006` because section header supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-007` because data table / stacked rows supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-008` because timeline rail supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-009` because evidence tile supports the core interaction pattern for advisor workbench home.
- `S-008` uses `C-010` because citation tile supports the core interaction pattern for advisor workbench home.
- `S-009` uses `C-001` because app shell supports the core interaction pattern for finance queue home.
- `S-009` uses `C-002` because action card supports the core interaction pattern for finance queue home.
- `S-009` uses `C-003` because trust row supports the core interaction pattern for finance queue home.
- `S-009` uses `C-004` because state banner supports the core interaction pattern for finance queue home.
- `S-009` uses `C-005` because primary action bar supports the core interaction pattern for finance queue home.
- `S-009` uses `C-006` because section header supports the core interaction pattern for finance queue home.
- `S-009` uses `C-007` because data table / stacked rows supports the core interaction pattern for finance queue home.
- `S-009` uses `C-008` because timeline rail supports the core interaction pattern for finance queue home.
- `S-009` uses `C-009` because evidence tile supports the core interaction pattern for finance queue home.
- `S-009` uses `C-010` because citation tile supports the core interaction pattern for finance queue home.
- `S-010` uses `C-001` because app shell supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-002` because action card supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-003` because trust row supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-004` because state banner supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-005` because primary action bar supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-006` because section header supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-007` because data table / stacked rows supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-008` because timeline rail supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-009` because evidence tile supports the core interaction pattern for enterprise/admin home.
- `S-010` uses `C-010` because citation tile supports the core interaction pattern for enterprise/admin home.
- `S-011` uses `C-001` because app shell supports the core interaction pattern for listings index.
- `S-011` uses `C-002` because action card supports the core interaction pattern for listings index.
- `S-011` uses `C-003` because trust row supports the core interaction pattern for listings index.
- `S-011` uses `C-004` because state banner supports the core interaction pattern for listings index.
- `S-011` uses `C-005` because primary action bar supports the core interaction pattern for listings index.
- `S-011` uses `C-006` because section header supports the core interaction pattern for listings index.
- `S-011` uses `C-007` because data table / stacked rows supports the core interaction pattern for listings index.
- `S-011` uses `C-008` because timeline rail supports the core interaction pattern for listings index.
- `S-011` uses `C-009` because evidence tile supports the core interaction pattern for listings index.
- `S-011` uses `C-010` because citation tile supports the core interaction pattern for listings index.
- `S-012` uses `C-001` because app shell supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-002` because action card supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-003` because trust row supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-004` because state banner supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-005` because primary action bar supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-006` because section header supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-007` because data table / stacked rows supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-008` because timeline rail supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-009` because evidence tile supports the core interaction pattern for listing create wizard.
- `S-012` uses `C-010` because citation tile supports the core interaction pattern for listing create wizard.
- `S-013` uses `C-001` because app shell supports the core interaction pattern for listing detail.
- `S-013` uses `C-002` because action card supports the core interaction pattern for listing detail.
- `S-013` uses `C-003` because trust row supports the core interaction pattern for listing detail.
- `S-013` uses `C-004` because state banner supports the core interaction pattern for listing detail.
- `S-013` uses `C-005` because primary action bar supports the core interaction pattern for listing detail.
- `S-013` uses `C-006` because section header supports the core interaction pattern for listing detail.
- `S-013` uses `C-007` because data table / stacked rows supports the core interaction pattern for listing detail.
- `S-013` uses `C-008` because timeline rail supports the core interaction pattern for listing detail.
- `S-013` uses `C-009` because evidence tile supports the core interaction pattern for listing detail.
- `S-013` uses `C-010` because citation tile supports the core interaction pattern for listing detail.
- `S-014` uses `C-001` because app shell supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-002` because action card supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-003` because trust row supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-004` because state banner supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-005` because primary action bar supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-006` because section header supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-007` because data table / stacked rows supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-008` because timeline rail supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-009` because evidence tile supports the core interaction pattern for negotiation inbox.
- `S-014` uses `C-010` because citation tile supports the core interaction pattern for negotiation inbox.
- `S-015` uses `C-001` because app shell supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-002` because action card supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-003` because trust row supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-004` because state banner supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-005` because primary action bar supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-006` because section header supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-007` because data table / stacked rows supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-008` because timeline rail supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-009` because evidence tile supports the core interaction pattern for negotiation thread detail.
- `S-015` uses `C-010` because citation tile supports the core interaction pattern for negotiation thread detail.
- `S-016` uses `C-001` because app shell supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-002` because action card supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-003` because trust row supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-004` because state banner supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-005` because primary action bar supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-006` because section header supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-007` because data table / stacked rows supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-008` because timeline rail supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-009` because evidence tile supports the core interaction pattern for escrow and settlement center.
- `S-016` uses `C-010` because citation tile supports the core interaction pattern for escrow and settlement center.
- `S-017` uses `C-001` because app shell supports the core interaction pattern for wallet activity.
- `S-017` uses `C-002` because action card supports the core interaction pattern for wallet activity.
- `S-017` uses `C-003` because trust row supports the core interaction pattern for wallet activity.
- `S-017` uses `C-004` because state banner supports the core interaction pattern for wallet activity.
- `S-017` uses `C-005` because primary action bar supports the core interaction pattern for wallet activity.
- `S-017` uses `C-006` because section header supports the core interaction pattern for wallet activity.
- `S-017` uses `C-007` because data table / stacked rows supports the core interaction pattern for wallet activity.
- `S-017` uses `C-008` because timeline rail supports the core interaction pattern for wallet activity.
- `S-017` uses `C-009` because evidence tile supports the core interaction pattern for wallet activity.
- `S-017` uses `C-010` because citation tile supports the core interaction pattern for wallet activity.
- `S-018` uses `C-001` because app shell supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-002` because action card supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-003` because trust row supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-004` because state banner supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-005` because primary action bar supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-006` because section header supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-007` because data table / stacked rows supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-008` because timeline rail supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-009` because evidence tile supports the core interaction pattern for advisory request composer.
- `S-018` uses `C-010` because citation tile supports the core interaction pattern for advisory request composer.
- `S-019` uses `C-001` because app shell supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-002` because action card supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-003` because trust row supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-004` because state banner supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-005` because primary action bar supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-006` because section header supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-007` because data table / stacked rows supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-008` because timeline rail supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-009` because evidence tile supports the core interaction pattern for advisory answer detail.
- `S-019` uses `C-010` because citation tile supports the core interaction pattern for advisory answer detail.
- `S-020` uses `C-001` because app shell supports the core interaction pattern for citation drawer.
- `S-020` uses `C-002` because action card supports the core interaction pattern for citation drawer.
- `S-020` uses `C-003` because trust row supports the core interaction pattern for citation drawer.
- `S-020` uses `C-004` because state banner supports the core interaction pattern for citation drawer.
- `S-020` uses `C-005` because primary action bar supports the core interaction pattern for citation drawer.
- `S-020` uses `C-006` because section header supports the core interaction pattern for citation drawer.
- `S-020` uses `C-007` because data table / stacked rows supports the core interaction pattern for citation drawer.
- `S-020` uses `C-008` because timeline rail supports the core interaction pattern for citation drawer.
- `S-020` uses `C-009` because evidence tile supports the core interaction pattern for citation drawer.
- `S-020` uses `C-010` because citation tile supports the core interaction pattern for citation drawer.
- `S-021` uses `C-001` because app shell supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-002` because action card supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-003` because trust row supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-004` because state banner supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-005` because primary action bar supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-006` because section header supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-007` because data table / stacked rows supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-008` because timeline rail supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-009` because evidence tile supports the core interaction pattern for climate alerts center.
- `S-021` uses `C-010` because citation tile supports the core interaction pattern for climate alerts center.
- `S-022` uses `C-001` because app shell supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-002` because action card supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-003` because trust row supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-004` because state banner supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-005` because primary action bar supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-006` because section header supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-007` because data table / stacked rows supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-008` because timeline rail supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-009` because evidence tile supports the core interaction pattern for climate alert detail.
- `S-022` uses `C-010` because citation tile supports the core interaction pattern for climate alert detail.
- `S-023` uses `C-001` because app shell supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-002` because action card supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-003` because trust row supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-004` because state banner supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-005` because primary action bar supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-006` because section header supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-007` because data table / stacked rows supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-008` because timeline rail supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-009` because evidence tile supports the core interaction pattern for finance decision queue.
- `S-023` uses `C-010` because citation tile supports the core interaction pattern for finance decision queue.
- `S-024` uses `C-001` because app shell supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-002` because action card supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-003` because trust row supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-004` because state banner supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-005` because primary action bar supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-006` because section header supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-007` because data table / stacked rows supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-008` because timeline rail supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-009` because evidence tile supports the core interaction pattern for finance decision detail.
- `S-024` uses `C-010` because citation tile supports the core interaction pattern for finance decision detail.
- `S-025` uses `C-001` because app shell supports the core interaction pattern for payout event detail.
- `S-025` uses `C-002` because action card supports the core interaction pattern for payout event detail.
- `S-025` uses `C-003` because trust row supports the core interaction pattern for payout event detail.
- `S-025` uses `C-004` because state banner supports the core interaction pattern for payout event detail.
- `S-025` uses `C-005` because primary action bar supports the core interaction pattern for payout event detail.
- `S-025` uses `C-006` because section header supports the core interaction pattern for payout event detail.
- `S-025` uses `C-007` because data table / stacked rows supports the core interaction pattern for payout event detail.
- `S-025` uses `C-008` because timeline rail supports the core interaction pattern for payout event detail.
- `S-025` uses `C-009` because evidence tile supports the core interaction pattern for payout event detail.
- `S-025` uses `C-010` because citation tile supports the core interaction pattern for payout event detail.
- `S-026` uses `C-001` because app shell supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-002` because action card supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-003` because trust row supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-004` because state banner supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-005` because primary action bar supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-006` because section header supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-007` because data table / stacked rows supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-008` because timeline rail supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-009` because evidence tile supports the core interaction pattern for traceability chain view.
- `S-026` uses `C-010` because citation tile supports the core interaction pattern for traceability chain view.
- `S-027` uses `C-001` because app shell supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-002` because action card supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-003` because trust row supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-004` because state banner supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-005` because primary action bar supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-006` because section header supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-007` because data table / stacked rows supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-008` because timeline rail supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-009` because evidence tile supports the core interaction pattern for quality evidence gallery.
- `S-027` uses `C-010` because citation tile supports the core interaction pattern for quality evidence gallery.
- `S-028` uses `C-001` because app shell supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-002` because action card supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-003` because trust row supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-004` because state banner supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-005` because primary action bar supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-006` because section header supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-007` because data table / stacked rows supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-008` because timeline rail supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-009` because evidence tile supports the core interaction pattern for evidence capture flow.
- `S-028` uses `C-010` because citation tile supports the core interaction pattern for evidence capture flow.
- `S-029` uses `C-001` because app shell supports the core interaction pattern for notifications center.
- `S-029` uses `C-002` because action card supports the core interaction pattern for notifications center.
- `S-029` uses `C-003` because trust row supports the core interaction pattern for notifications center.
- `S-029` uses `C-004` because state banner supports the core interaction pattern for notifications center.
- `S-029` uses `C-005` because primary action bar supports the core interaction pattern for notifications center.
- `S-029` uses `C-006` because section header supports the core interaction pattern for notifications center.
- `S-029` uses `C-007` because data table / stacked rows supports the core interaction pattern for notifications center.
- `S-029` uses `C-008` because timeline rail supports the core interaction pattern for notifications center.
- `S-029` uses `C-009` because evidence tile supports the core interaction pattern for notifications center.
- `S-029` uses `C-010` because citation tile supports the core interaction pattern for notifications center.
- `S-030` uses `C-001` because app shell supports the core interaction pattern for offline outbox.
- `S-030` uses `C-002` because action card supports the core interaction pattern for offline outbox.
- `S-030` uses `C-003` because trust row supports the core interaction pattern for offline outbox.
- `S-030` uses `C-004` because state banner supports the core interaction pattern for offline outbox.
- `S-030` uses `C-005` because primary action bar supports the core interaction pattern for offline outbox.
- `S-030` uses `C-006` because section header supports the core interaction pattern for offline outbox.
- `S-030` uses `C-007` because data table / stacked rows supports the core interaction pattern for offline outbox.
- `S-030` uses `C-008` because timeline rail supports the core interaction pattern for offline outbox.
- `S-030` uses `C-009` because evidence tile supports the core interaction pattern for offline outbox.
- `S-030` uses `C-010` because citation tile supports the core interaction pattern for offline outbox.
- `S-031` uses `C-001` because app shell supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-002` because action card supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-003` because trust row supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-004` because state banner supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-005` because primary action bar supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-006` because section header supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-007` because data table / stacked rows supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-008` because timeline rail supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-009` because evidence tile supports the core interaction pattern for conflict resolution detail.
- `S-031` uses `C-010` because citation tile supports the core interaction pattern for conflict resolution detail.
- `S-032` uses `C-001` because app shell supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-002` because action card supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-003` because trust row supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-004` because state banner supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-005` because primary action bar supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-006` because section header supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-007` because data table / stacked rows supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-008` because timeline rail supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-009` because evidence tile supports the core interaction pattern for profile and preferences.
- `S-032` uses `C-010` because citation tile supports the core interaction pattern for profile and preferences.
- `S-033` uses `C-001` because app shell supports the core interaction pattern for member roster.
- `S-033` uses `C-002` because action card supports the core interaction pattern for member roster.
- `S-033` uses `C-003` because trust row supports the core interaction pattern for member roster.
- `S-033` uses `C-004` because state banner supports the core interaction pattern for member roster.
- `S-033` uses `C-005` because primary action bar supports the core interaction pattern for member roster.
- `S-033` uses `C-006` because section header supports the core interaction pattern for member roster.
- `S-033` uses `C-007` because data table / stacked rows supports the core interaction pattern for member roster.
- `S-033` uses `C-008` because timeline rail supports the core interaction pattern for member roster.
- `S-033` uses `C-009` because evidence tile supports the core interaction pattern for member roster.
- `S-033` uses `C-010` because citation tile supports the core interaction pattern for member roster.
- `S-034` uses `C-001` because app shell supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-002` because action card supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-003` because trust row supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-004` because state banner supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-005` because primary action bar supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-006` because section header supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-007` because data table / stacked rows supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-008` because timeline rail supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-009` because evidence tile supports the core interaction pattern for bulk listing workspace.
- `S-034` uses `C-010` because citation tile supports the core interaction pattern for bulk listing workspace.
- `S-035` uses `C-001` because app shell supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-002` because action card supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-003` because trust row supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-004` because state banner supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-005` because primary action bar supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-006` because section header supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-007` because data table / stacked rows supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-008` because timeline rail supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-009` because evidence tile supports the core interaction pattern for quality verification queue.
- `S-035` uses `C-010` because citation tile supports the core interaction pattern for quality verification queue.
- `S-036` uses `C-001` because app shell supports the core interaction pattern for dispatch board.
- `S-036` uses `C-002` because action card supports the core interaction pattern for dispatch board.
- `S-036` uses `C-003` because trust row supports the core interaction pattern for dispatch board.
- `S-036` uses `C-004` because state banner supports the core interaction pattern for dispatch board.
- `S-036` uses `C-005` because primary action bar supports the core interaction pattern for dispatch board.
- `S-036` uses `C-006` because section header supports the core interaction pattern for dispatch board.
- `S-036` uses `C-007` because data table / stacked rows supports the core interaction pattern for dispatch board.
- `S-036` uses `C-008` because timeline rail supports the core interaction pattern for dispatch board.
- `S-036` uses `C-009` because evidence tile supports the core interaction pattern for dispatch board.
- `S-036` uses `C-010` because citation tile supports the core interaction pattern for dispatch board.
- `S-037` uses `C-001` because app shell supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-002` because action card supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-003` because trust row supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-004` because state banner supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-005` because primary action bar supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-006` because section header supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-007` because data table / stacked rows supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-008` because timeline rail supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-009` because evidence tile supports the core interaction pattern for advisor request queue.
- `S-037` uses `C-010` because citation tile supports the core interaction pattern for advisor request queue.
- `S-038` uses `C-001` because app shell supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-002` because action card supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-003` because trust row supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-004` because state banner supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-005` because primary action bar supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-006` because section header supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-007` because data table / stacked rows supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-008` because timeline rail supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-009` because evidence tile supports the core interaction pattern for intervention log detail.
- `S-038` uses `C-010` because citation tile supports the core interaction pattern for intervention log detail.
- `S-039` uses `C-001` because app shell supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-002` because action card supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-003` because trust row supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-004` because state banner supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-005` because primary action bar supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-006` because section header supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-007` because data table / stacked rows supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-008` because timeline rail supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-009` because evidence tile supports the core interaction pattern for analytics cockpit.
- `S-039` uses `C-010` because citation tile supports the core interaction pattern for analytics cockpit.
- `S-040` uses `C-001` because app shell supports the core interaction pattern for observability console.
- `S-040` uses `C-002` because action card supports the core interaction pattern for observability console.
- `S-040` uses `C-003` because trust row supports the core interaction pattern for observability console.
- `S-040` uses `C-004` because state banner supports the core interaction pattern for observability console.
- `S-040` uses `C-005` because primary action bar supports the core interaction pattern for observability console.
- `S-040` uses `C-006` because section header supports the core interaction pattern for observability console.
- `S-040` uses `C-007` because data table / stacked rows supports the core interaction pattern for observability console.
- `S-040` uses `C-008` because timeline rail supports the core interaction pattern for observability console.
- `S-040` uses `C-009` because evidence tile supports the core interaction pattern for observability console.
- `S-040` uses `C-010` because citation tile supports the core interaction pattern for observability console.
- `S-041` uses `C-001` because app shell supports the core interaction pattern for access and roles.
- `S-041` uses `C-002` because action card supports the core interaction pattern for access and roles.
- `S-041` uses `C-003` because trust row supports the core interaction pattern for access and roles.
- `S-041` uses `C-004` because state banner supports the core interaction pattern for access and roles.
- `S-041` uses `C-005` because primary action bar supports the core interaction pattern for access and roles.
- `S-041` uses `C-006` because section header supports the core interaction pattern for access and roles.
- `S-041` uses `C-007` because data table / stacked rows supports the core interaction pattern for access and roles.
- `S-041` uses `C-008` because timeline rail supports the core interaction pattern for access and roles.
- `S-041` uses `C-009` because evidence tile supports the core interaction pattern for access and roles.
- `S-041` uses `C-010` because citation tile supports the core interaction pattern for access and roles.
- `S-042` uses `C-001` because app shell supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-002` because action card supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-003` because trust row supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-004` because state banner supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-005` because primary action bar supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-006` because section header supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-007` because data table / stacked rows supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-008` because timeline rail supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-009` because evidence tile supports the core interaction pattern for country configuration summary.
- `S-042` uses `C-010` because citation tile supports the core interaction pattern for country configuration summary.

## Appendix D. Contract-to-Route Traceability
- `B-002` -> Identity and consent -> surfaces `onboarding, profile, consent review` -> implication: state transitions and revocation UX.
- `B-004` -> USSD adapter -> surfaces `future copy parity and session-safe summaries` -> implication: frontend content model for short labels and step compression.
- `B-005` -> WhatsApp adapter -> surfaces `message summaries and handoff receipts` -> implication: cross-channel status wording.
- `B-006` -> PWA offline queue -> surfaces `offline outbox, queued writes, retry banners` -> implication: must mirror queue semantics exactly.
- `B-013` -> Settlement notifications -> surfaces `notifications center and settlement timeline` -> implication: requires deterministic deep links.
- `B-016` -> Multilingual delivery -> surfaces `language switch, localized helper text` -> implication: translation slot architecture.
- `B-018` -> Climate alert rules -> surfaces `alerts center and detail` -> implication: must surface threshold and provenance.
- `B-019` -> MRV evidence -> surfaces `future climate proof views` -> implication: same evidence display primitives.
- `B-020` -> Finance partner adapter -> surfaces `finance detail and boundary UI` -> implication: must show partner ownership and rationale.
- `B-021` -> Insurance trigger registry -> surfaces `payout review and payout detail` -> implication: must show trigger basis and evidence references.
- `B-022` -> Finance HITL console -> surfaces `finance queue and review states` -> implication: filtered-empty and pending states are contractually meaningful.
- `B-023` -> Traceability event chain -> surfaces `traceability timeline` -> implication: immutable event order and continuity markers.
- `B-024` -> Quality evidence attachments -> surfaces `evidence gallery and capture` -> implication: checksum, size, and kind metadata surfaced.
- `B-025` -> Enterprise analytics mart -> surfaces `analytics cockpit` -> implication: anonymized-only display posture.
- `B-026` -> Partner API gateway -> surfaces `future partner-facing status and settings` -> implication: separate internal from external surfaces.
- `B-027` -> Observability -> surfaces `ops console and country health` -> implication: country/channel SLO visualization.
- `B-028` -> QA harness -> surfaces `test fixture alignment` -> implication: frontend IDs should align with journey coverage.
- `B-029` -> Plan review gate -> surfaces `delivery governance` -> implication: implementation backlog must preserve traceability.
- `B-030` -> Architecture review gate -> surfaces `release validation UI evidence` -> implication: frontend architecture invariants.
- `B-039` -> Mobile API profile -> surfaces `compact route data strategy` -> implication: payload discipline for mobile listing and offers.
- `B-040` -> Offline action queue -> surfaces `write queue UX` -> implication: must expose action token and replay status.
- `B-041` -> Sync conflict resolver -> surfaces `conflict detail UI` -> implication: explain resolution deterministically.
- `B-042` -> Device capability layer -> surfaces `camera, storage, location affordances` -> implication: capability state cannot be hidden.
- `B-043` -> Notification broker -> surfaces `notifications center` -> implication: delivery source attribution.
- `B-044` -> Android performance harness -> surfaces `performance budgets and test gates` -> implication: used as release thresholds.
- `B-045` -> Device registry -> surfaces `future device trust indicators` -> implication: deferred but should inform profile hooks.
- `B-046` -> Sensor event schema -> surfaces `future telemetry views` -> implication: not phase-1 blocking.
- `B-047` -> Telemetry ingestion API -> surfaces `future monitoring views` -> implication: not phase-1 blocking.
- `B-048` -> Event bus partitioning -> surfaces `future observability drill-down` -> implication: internal-only for now.
- `B-049` -> Digital twin governance -> surfaces `future advanced traceability and telemetry` -> implication: not phase-1 blocking.
- `B-050` -> Visual language system -> surfaces `design tokens and conformance` -> implication: frontend must implement directly.
- `B-051` -> Interaction feedback library -> surfaces `state library` -> implication: frontend state components map here exactly.
- `B-052` -> Accessibility readability pack -> surfaces `copy and component accessibility` -> implication: release gate dependency.
- `B-053` -> Android mobile UX harness -> surfaces `mobile acceptance tests` -> implication: route copy and step counts must comply.
- `B-054` -> UX excellence review gate -> surfaces `pre-build and pre-release signoff` -> implication: frontend design quality gate.
