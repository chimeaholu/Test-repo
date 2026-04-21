# AGRO-V2-NATIVE-APP-DECISION-MEMO

## 1) Decision Context
- Markets: West Africa + Caribbean.
- Current architecture direction: PWA + WhatsApp + USSD first.
- Decision question: start native iOS/Android now vs defer without creating future rework.
- Naming policy: `[[PRODUCT_NAME]]` remains canonical placeholder.

## 2) Multi-Architect Perspectives

### 2.1 `@architect` Lead Analysis
- Primary objective for 6-month MVP is adoption velocity across mixed-connectivity segments, not premium app-store UX.
- Channel mix in target markets favors:
  - USSD for low-data and feature-phone access.
  - WhatsApp for daily conversational interaction.
  - PWA for broad smartphone reach with one code surface.
- Native-from-start increases architecture/program risk by splitting frontend execution too early.

### 2.2 `@review-arch` Adversarial Challenge
- Risk in deferring native: latent coupling to web assumptions can create migration debt.
- Challenge conditions:
  - if API contracts are unstable, native later will be expensive.
  - if offline model is weak now, native later will duplicate sync logic.
- Conclusion from challenge: defer native is acceptable only if no-regret architecture constraints are enforced immediately.

### 2.3 Codex Competing Architect Opinion (external balance)
- Artifact source: Codex Step opinion run (2026-04-12).
- Core conclusion: recommend **Option B** for 6-month MVP; Option A too expensive/slow; Option C viable but still split-focus in MVP window.
- Key Codex no-regret points adopted:
  - API-first contracts
  - channel-agnostic domain logic
  - offline/sync-ready command model
  - notification/messaging abstraction
  - feature flags + market configuration

## 3) Option Analysis

## Option A: Native-from-start (iOS + Android)

### 3.1 6-Month MVP Feasibility Impact
- High schedule risk; likely compresses backend/agent-quality work.
- Delivery focus shifts to mobile platform parity instead of channel and policy robustness.

### 3.2 Team Composition Impact
- Requires dedicated iOS + Android + mobile QA + mobile release operations from month 1.
- Increased cross-team coordination overhead and release complexity.

### 3.3 Architecture Constraints (Now vs Later)
- Now: must harden mobile SDK/auth/push/offline stores immediately.
- Later advantage: less incremental native bootstrapping.
- Tradeoff: weakens early concentration on orchestration, verifier, policy, and compliance core.

### 3.4 UX/Channel Coverage in Target Markets
- Strong smartphone UX.
- Weak coverage for feature-phone and low-data contexts unless USSD/WhatsApp still fully funded.

### 3.5 Offline/Performance/Security
- Best offline performance potential.
- Strong device-level capabilities (secure keystore, richer background sync).
- But adds separate mobile security surface area and release compliance burden.

### 3.6 Cost Profile
- Highest build + ongoing maintenance cost (two native stacks + PWA/WA/USSD still needed).

### 3.7 Key Risks and Mitigations
- Risk: schedule slip -> Mitigation: reduce scope drastically (but hurts channel coverage).
- Risk: backend underinvestment -> Mitigation: ring-fence platform team (higher cost).

---

## Option B: PWA-first, native-later (current)

### 3.1 6-Month MVP Feasibility Impact
- Best chance to hit timeline with reliable multi-channel coverage.
- Preserves engineering capacity for core agent quality, policy gates, and integration resilience.

### 3.2 Team Composition Impact
- Core team can stay concentrated: platform/backend, channel UX, QA, policy/compliance, data.
- No immediate need for full native squads.

### 3.3 Architecture Constraints (Now vs Later)
- Must enforce no-regret constraints now (API contracts, offline command model, channel-agnostic domain logic).
- If done correctly, native later becomes additive, not a rewrite.

### 3.4 UX/Channel Coverage in Target Markets
- Strongest blended coverage:
  - USSD inclusion,
  - WhatsApp adoption fit,
  - PWA smartphone baseline.
- More aligned to mixed device realities in West Africa + Caribbean.

### 3.5 Offline/Performance/Security
- PWA offline is adequate for MVP with queued command model.
- Security remains centralized in backend/policy layers.
- Native-only performance optimizations deferred.

### 3.6 Cost Profile
- Lowest near-term build cost and maintenance load.
- Better unit economics for experimentation and rapid iteration.

### 3.7 Key Risks and Mitigations
- Risk: future native backlog accumulates.
  - Mitigation: define trigger conditions and native-readiness gates now.
- Risk: PWA UX ceilings for heavy workflows.
  - Mitigation: prioritize performance-critical flows and collect telemetry for native trigger.

---

## Option C: Android-first + PWA baseline, iOS deferred

### 3.1 6-Month MVP Feasibility Impact
- Moderate timeline risk; better than A, worse than B.
- Adds native complexity while still requiring PWA + WA + USSD.

### 3.2 Team Composition Impact
- Requires Android squad early plus shared backend/channel teams.
- iOS deferred, but parity debt starts accumulating.

### 3.3 Architecture Constraints (Now vs Later)
- Android-first can validate field/offline needs faster.
- But introduces two UX paradigms in MVP and future parity decisions for iOS.

### 3.4 UX/Channel Coverage in Target Markets
- Strong for Android-heavy segments.
- Still requires PWA for broad smartphone baseline and iOS users.

### 3.5 Offline/Performance/Security
- Better offline depth for Android users than Option B.
- Additional mobile security and release pipeline complexity.

### 3.6 Cost Profile
- Mid-to-high cost; cheaper than A but significantly above B.

### 3.7 Key Risks and Mitigations
- Risk: product inconsistency across Android/PWA.
  - Mitigation: shared design tokens, shared contract-driven flows.
- Risk: iOS backlog pressure.
  - Mitigation: clear trigger policy for iOS start.

## 4) Recommendation
**Recommend Option B: PWA-first + WhatsApp + USSD, with explicit native-readiness architecture from day one.**

Rationale:
1. Highest probability of 6-month MVP success.
2. Best immediate channel fit for target market connectivity realities.
3. Preserves focus on core trust layers (policy/verifier/auditability) that are harder to retrofit than UI shells.
4. Lowest cost and operational burden in initial rollout.
5. Keeps native path open if no-regret constraints are enforced now.

## 5) No-Regret Architecture Requirements Now (to keep native path open)
1. API-first domain contracts with strict versioning and compatibility policy.
2. Channel-agnostic business logic in backend services (no channel-specific domain rules).
3. Command-based offline/sync model with idempotency and conflict resolution.
4. Unified identity and device/session abstraction supporting future native auth.
5. Notification abstraction layer for WhatsApp/SMS/push parity.
6. Shared schema-driven form/validation contracts usable by PWA and future native clients.
7. Feature-flag and country-pack configuration model independent of client type.
8. Channel-by-channel observability and funnel analytics.

## 6) 90-Day Implementation Adjustments (Immediate)
1. Add native-readiness NFRs to master plan and PRD acceptance criteria.
2. Lock API versioning and backward-compatibility policy before Wave 2.
3. Add explicit offline command queue contract tests in QA harness.
4. Expand telemetry to capture UX/performance deltas by channel and device class.
5. Create a Native Readiness backlog epic with contract, security, and sync prerequisites.

## 7) Trigger Conditions to Start Native Tracks
Start Android and/or iOS tracks when **at least 3** of the following are true for two consecutive reporting periods:
1. PWA performance SLO misses materially affect conversion in core flows.
2. Offline failure rates remain above target despite backend/sync improvements.
3. Device-capability demand (camera, background processing, secure storage) blocks priority workflows.
4. Partner/compliance requirements explicitly require app-store-native controls.
5. Regional growth requires richer retention mechanics better delivered natively.

## 8) Final Decision Statement
For `[[PRODUCT_NAME]]`, choose **Option B now**, enforce no-regret architecture immediately, and gate native start by defined trigger conditions rather than calendar date.
