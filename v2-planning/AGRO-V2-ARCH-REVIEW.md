# AGRO-V2-ARCH-REVIEW

## 1) Review Scope
- Review type: adversarial architecture validation (SOP 15 Step 5b)
- Artifacts inspected:
  - `AGRO-V2-PROJECT-PLAN.md`
  - `AGRO-V2-PRD.md`
  - `AGRO-V2-TEST-PLAN.md`
  - `AGRO-V2-BEAD-BACKLOG.md`

## 2) Architecture Findings and Resolutions

### Critical Findings

#### `AR-CRIT-01` Cross-channel state consistency could fail without canonical event boundary
- Concern: USSD and WhatsApp sessions may mutate workflow state differently.
- Resolution:
  - Introduce canonical state store (`B-003`) with idempotency keys.
  - Require channel adapters (`B-004`/`B-005`) to use domain commands only.
  - Add integrity checks `DI-001`, `DI-002`.
- Status: Resolved by architecture pattern and tests.

#### `AR-CRIT-02` High-stakes AI actions insufficiently bounded in early architecture draft
- Concern: finance and settlement outputs could bypass human review.
- Resolution:
  - Agent policy guardrail framework (`B-008`) + reviewer workflow (`B-015`).
  - Mandatory HITL console for finance/insurance (`B-022`).
  - Policy requirement links: `FR-032`, `SEC-005`, `COMP-005`.
- Status: Resolved.

### High Findings

#### `AR-HIGH-01` Multi-region data/compliance separation needed stronger first-wave priority
- Resolution:
  - Country-pack config framework moved to first bead (`B-001`) with downstream dependency.
  - Compliance tests added (`SC-003`).
- Status: Resolved.

#### `AR-HIGH-02` MRV credibility depends on source provenance rigor
- Resolution:
  - MRV service (`B-019`) now requires provenance completeness checks.
  - Advisory and MRV outputs must include assumption labels.
- Status: Resolved.

#### `AR-HIGH-03` Operational observability was not explicit for swarm-era operations
- Resolution:
  - Added observability/SLO bead (`B-027`) and performance checks (`PF-*`).
- Status: Resolved.

### Medium Findings

#### `AR-MED-01` Potential runtime cost pressure from LLM-heavy orchestration
- Resolution:
  - Add tiered model routing and budget guardrails in operations section.
- Status: Partially resolved (exact budgets pending approval).

#### `AR-MED-02` API partner variability across countries may cause deployment skew
- Resolution:
  - Adapter abstraction and country launch gates; unresolved partner commitment details flagged.
- Status: Open decision.

## 3) Architecture Soundness Verdict
- Component boundaries: acceptable.
- Data flow and state management: acceptable with canonical state store enforced.
- API contract posture: acceptable, partner variability remains managed risk.
- Security architecture: acceptable with HITL and audit requirements.
- Infrastructure feasibility: acceptable for phased rollout.

## 4) Required Architectural Invariants (Non-Negotiable)
1. Channel adapters must never bypass domain state boundaries.
2. High-stakes AI outputs require policy review and HITL where defined.
3. Country pack must remain configuration-driven, not fork-driven.
4. Audit event logging is mandatory for consent, finance, and AI decision events.
5. Any new bead touching regulated data must include `COMP-*` traceability.

## 5) Remaining Open Architectural Decisions
1. Final partner abstraction for payments and insurance by launch country.
2. Exact model routing policy tiers and budget enforcement thresholds.
3. Country launch sequence when partner readiness diverges.
