# AGRO-V2-ANDROID-READINESS-SPEC

## 1) Purpose
Define Android-native readiness components that must be implemented now at planning/design level while continuing PWA + WhatsApp + USSD as build baseline.

## 2) Scope Boundaries
- In scope now:
  - API/mobile contract hardening
  - offline/sync semantics
  - queue/retry/background compatibility
  - auth/session parity model
  - notification broker abstraction
  - Android telemetry-ready observability schema
- Out of scope now:
  - full Android app implementation
  - app-store release pipeline
  - native UI feature delivery.

## 3) Android-Ready Architecture Requirements

### 3.1 Mobile API Profile
- Versioned API profile (`mobile_profile_version`) for Android-ready clients.
- Payload budget definitions per endpoint class:
  - `critical_txn`: strict payload cap
  - `list/search`: paginated payload cap
  - `advisory`: response-size cap with citation compression
- Required mutation envelope:
  - `request_id`
  - `idempotency_key`
  - `operation_token` (for resumable execution)
  - `schema_version`

### 3.2 Offline Action Queue Model
- Queue states:
  - `queued`
  - `replaying`
  - `applied`
  - `failed_retryable`
  - `failed_terminal`
- Replay rules:
  - dedupe by `idempotency_key`
  - bounded retry with jitter
  - final terminal-state persistence with reason code

### 3.3 Sync Conflict Resolution Policy
- Conflict classes:
  - stale version write
  - concurrent user updates
  - policy state drift (consent/session)
- Resolution precedence:
  1. policy/safety invariants
  2. financial integrity constraints
  3. latest valid user intent with explicit override path
- Must return deterministic `conflict_type` and `resolution_state`.

### 3.4 Auth/Session Parity
- Shared auth/session semantics across PWA and future Android:
  - OTP/session issuance
  - refresh and revocation
  - device binding optionality
- Native parity requirement:
  - no endpoint behavior divergence by client type for auth-protected flows.

### 3.5 Notification Broker Abstraction
- Unified notification intent model:
  - `transaction_update`
  - `advisory_alert`
  - `policy_action_required`
- Delivery channels:
  - WhatsApp, SMS, Push (future Android)
- Delivery state contract:
  - `pending`, `sent`, `delivered`, `failed`, `fallback_sent`.

### 3.6 Android Telemetry-Ready Fields
- Required fields:
  - `device_class`
  - `network_quality`
  - `queue_depth`
  - `replay_attempt_count`
  - `sync_outcome`
  - `conflict_type`
  - `notification_channel`
  - `notification_delivery_state`

## 4) Reliability Semantics for Future Android Compatibility
- Queue and retries must remain backend-authoritative.
- All replay outcomes must be idempotent.
- Background-compatible timing assumptions:
  - replay can be delayed/interrupted
  - operation tokens remain valid for resumable periods.

## 5) Security and Compliance Semantics
- Mutation contracts require schema + policy validation before execution.
- Session and queue metadata treated as sensitive operational data.
- Audit logging required for:
  - replay failures
  - conflict resolutions
  - policy challenges in resumable operations.

## 6) Bead Mapping (Implementation Path)
- `B-039` Mobile API profile + payload budgets.
- `B-040` Offline action queue contract.
- `B-041` Sync conflict resolver policy.
- `B-042` Device capability abstraction layer.
- `B-043` Notification broker abstraction.
- `B-044` Low-end Android performance budget harness.

## 7) Test Mapping
- Android matrix: `ARM-001..ARM-004`
- Journey tests: `ARJ-001..ARJ-006`
- Data integrity: `ARDI-001..ARDI-005`

## 8) Trigger Policy for Native Android Build Start
Native Android build begins when **3 or more** triggers breach for two consecutive review periods:
1. Android cohort conversion degradation >= 12% on core flows.
2. Android cohort p95 latency breach >= 25% on critical journeys.
3. Offline replay failure rate > 3% on priority actions.
4. Android cohort retention gap > 10% versus target benchmark.
5. Capability-demand blockers cannot be solved in PWA channel.

## 9) 90-Day Adjustments
1. Finalize mobile API profile and payload budgets in design reviews.
2. Land queue/replay and conflict policy contracts in backend specs.
3. Add Android-profile QA harness for low RAM + unstable 3G simulation.
4. Add readiness dashboard slices for trigger monitoring.
5. Run architecture gate checkpoint at day 90 for native-start decision.

## 10) Definition of Done (Readiness Layer)
- Requirements codified in PRD (`FR-090..FR-096`, `NFR-009..NFR-012`).
- Beads (`B-039..B-044`) approved with dependencies and tests.
- Test plan contains Android matrix + parity + trigger acceptance criteria.
- Master plan includes trigger policy and no-dead-end 90-day adjustments.
