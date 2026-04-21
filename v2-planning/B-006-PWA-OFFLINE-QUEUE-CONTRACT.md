# B-006 PWA Offline Queue Contract

This artifact defines the executable contract for `B-006` PWA shell offline behavior.
It is intentionally implementation-oriented so the unit suite can verify the same rules.

## Scope

- Enqueue user mutations while the PWA is offline or degraded.
- Replay queued mutations through command APIs only.
- Prevent duplicate effective mutations through idempotency reconciliation.
- Surface deterministic retry and channel handoff behavior.

## Contract

### Queue entry fields

Each queued command must carry:

- `operation_id`: client-side unique identifier for this queued action.
- `command_name`: command API target, never a direct domain mutation.
- `payload`: serialized command payload.
- `idempotency_key`: stable dedupe key reused across retries and reconnects.
- `created_at`: enqueue timestamp.
- `status`: one of `queued`, `syncing`, `synced`, `failed_retryable`, `failed_terminal`.
- `replay_attempt_count`: increments once per replay attempt.
- `available_at_epoch_ms`: next eligible replay time after backoff.
- `last_error_code`: last failure code if replay failed.
- `result_ref`: backend mutation or reconciliation reference when known.

### Replay decision outcomes

Replay executor responses must collapse into one of:

- `applied`: mutation accepted and queue item becomes `synced`.
- `duplicate`: backend confirms equivalent mutation already exists; queue item becomes `synced`.
- `retry`: transient failure; queue item becomes `failed_retryable` until backoff expires.
- `terminal_failure`: deterministic failure; queue item becomes `failed_terminal`.

### Invariants

1. `FR-092`: queue supports enqueue, replay, dedupe, and replay-result reconciliation.
2. `DI-002`: replay must not create duplicate effective mutations after reconnect.
3. Retryable failures use bounded backoff and eventually become terminal when the retry budget is exhausted.
4. Terminal failures are never replayed automatically.
5. Telemetry must expose `queue_depth`, `replay_attempt_count`, `sync_outcome`, and `conflict_type`.
6. `FR-111`: degraded connectivity can trigger a handoff prompt:
   - offline -> suggest `whatsapp`
   - degraded with queue backlog >= 3 -> suggest `ussd`
   - online -> no prompt

## Executable reference

The placeholder executable model for this contract lives in:

- `src/agro_v2/offline_queue.py`
- `tests/test_offline_queue.py`

The placeholder is intentionally non-UI and in-memory. It exists to lock the contract before frontend shell work lands.
