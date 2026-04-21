# B-006 PWA Offline Queue Contract

- Bead: `B-006`
- Version: `1.0.0`
- Status: `draft`
- Canonical artifact: `execution/contracts/b006_pwa_offline_queue_contract.json`

## Purpose
Define queue semantics for degraded PWA connectivity with deterministic replay,
deduplication by idempotency key, and explicit channel handoff prompts.

## Required Behaviors
- Enqueue action intents while offline.
- Replay in ascending creation order when connectivity recovers.
- Deduplicate by `idempotency_key`.
- Reconcile replay result into terminal queue state.
- Prompt channel fallback in priority order: WhatsApp -> USSD -> SMS.

## Validation Stub
Executable checks live in:
- `tests/test_pwa_offline_queue_contract_stub.py`

The stub validates:
- top-level contract keys exist,
- queue state-machine transitions are well-formed,
- replay + dedupe defaults match baseline policy.
