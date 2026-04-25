# AGRO-V2-IOT-READINESS-SPEC

## 1) Purpose
Define IoT readiness interfaces now so future hardware/sensor integration can be added without domain rewrites, while keeping hardware execution out of MVP scope.

## 2) Explicit Scope Boundary
- In MVP now:
  - device registry schema
  - sensor event contract
  - ingestion contract semantics
  - telemetry topic taxonomy
  - digital twin readiness model
  - governance boundaries
- Not in MVP now:
  - device onboarding workflows with real hardware
  - field sensor procurement/deployment
  - hardware calibration/firmware operations.

## 3) Device Registry Model
- Core fields:
  - `device_id`
  - `farm_id`
  - `country_pack`
  - `device_type`
  - `firmware_version`
  - `status` (`provisioned`, `active`, `inactive`, `retired`)
  - `last_seen_at`
  - `provenance_class`
- Identity rules:
  - immutable `device_id`
  - farm-level binding with transfer history support.

## 4) Sensor Event Contract + Provenance
- Required event fields:
  - `event_id`
  - `source_device_id`
  - `event_time`
  - `ingest_time`
  - `metric_type`
  - `metric_value`
  - `unit`
  - `confidence`
  - `signature_state`
  - `schema_version`
- Provenance guarantees:
  - source identity traceable
  - transformation lineage logged
  - integrity check state persisted.

## 5) Ingestion API Contract
- Versioned endpoint profile for telemetry ingestion.
- Required semantics:
  - idempotency key required
  - resumable batch token support
  - deterministic duplicate detection
  - explicit reject/error codes

## 6) Event Bus Topic and Partitioning Model
- Topic taxonomy:
  - `iot.telemetry.raw`
  - `iot.telemetry.normalized`
  - `iot.telemetry.anomaly`
  - `iot.digital_twin.updates`
- Partition keys:
  - `country_pack`
  - `farm_id`
  - `stream_type`

## 7) Data Governance Boundaries
- Sensor-origin data tagged separately from user-entered data.
- Access control:
  - role-scoped read/write
  - retention policies by country pack
  - audit trail for downstream model usage.

## 8) Digital Twin Readiness Model
- Twin fields (readiness):
  - `farm_node_id`
  - `state_snapshot_version`
  - `sensor_state_refs[]`
  - `derived_health_score`
  - `last_reconciled_at`
- Requirement: twin schema additive evolution only; no breaking changes.

## 9) Test and Bead Traceability
- Requirements: `FR-100..FR-105`, `NFR-013..NFR-015`.
- Beads: `B-045..B-049`.
- Tests: `IOTJ-*`, `IOTDI-*`.

## 10) Definition of Done (Readiness Layer)
- Contracts documented and versioned.
- Governance and telemetry boundaries codified.
- Backlog/test mappings complete.
- MVP scope-protection statement retained (hardware deferred).
