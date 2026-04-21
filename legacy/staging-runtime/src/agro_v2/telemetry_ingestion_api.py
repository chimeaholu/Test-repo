"""B-047 telemetry ingestion API profile with idempotent resumable semantics."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .sensor_event_schema import SensorEventEnvelope
from .tool_contracts import ContractField, ContractValueType, ToolContract, ToolContractRegistry


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TelemetryIngestionApiError(ValueError):
    """Raised when telemetry ingestion inputs or state transitions are invalid."""


@dataclass(frozen=True)
class TelemetryResumeToken:
    session_id: str
    device_id: str
    farm_id: str
    api_version: str
    next_batch_index: int
    issued_at: str

    def __post_init__(self) -> None:
        if not self.session_id.strip():
            raise TelemetryIngestionApiError("session_id is required")
        if not self.device_id.strip():
            raise TelemetryIngestionApiError("device_id is required")
        if not self.farm_id.strip():
            raise TelemetryIngestionApiError("farm_id is required")
        if not self.api_version.strip():
            raise TelemetryIngestionApiError("api_version is required")
        if self.next_batch_index < 0:
            raise TelemetryIngestionApiError("next_batch_index must be >= 0")
        if not self.issued_at.strip():
            raise TelemetryIngestionApiError("issued_at is required")

    def as_payload(self) -> dict[str, object]:
        return {
            "session_id": self.session_id,
            "device_id": self.device_id,
            "farm_id": self.farm_id,
            "api_version": self.api_version,
            "next_batch_index": self.next_batch_index,
            "issued_at": self.issued_at,
        }


@dataclass(frozen=True)
class TelemetryIngestionBatch:
    api_version: str
    session_id: str
    batch_index: int
    idempotency_key: str
    received_at: str
    events: tuple[SensorEventEnvelope, ...]
    resume_token: TelemetryResumeToken | None = None
    final_batch: bool = False

    def __post_init__(self) -> None:
        if not self.api_version.strip():
            raise TelemetryIngestionApiError("api_version is required")
        if not self.session_id.strip():
            raise TelemetryIngestionApiError("session_id is required")
        if self.batch_index < 0:
            raise TelemetryIngestionApiError("batch_index must be >= 0")
        if not self.idempotency_key.strip():
            raise TelemetryIngestionApiError("idempotency_key is required")
        if not self.received_at.strip():
            raise TelemetryIngestionApiError("received_at is required")
        if not self.events:
            raise TelemetryIngestionApiError("events must not be empty")


@dataclass(frozen=True)
class TelemetryIngestionReceipt:
    session_id: str
    batch_index: int
    accepted_event_ids: tuple[str, ...]
    duplicate_event_ids: tuple[str, ...]
    effective_event_count: int
    session_status: str
    committed_at: str
    next_resume_token: TelemetryResumeToken | None = None

    def __post_init__(self) -> None:
        if not self.session_id.strip():
            raise TelemetryIngestionApiError("session_id is required")
        if self.batch_index < 0:
            raise TelemetryIngestionApiError("batch_index must be >= 0")
        if self.effective_event_count < 0:
            raise TelemetryIngestionApiError("effective_event_count must be >= 0")
        if self.session_status not in {"open", "complete"}:
            raise TelemetryIngestionApiError("session_status must be open or complete")
        if not self.committed_at.strip():
            raise TelemetryIngestionApiError("committed_at is required")
        if self.session_status == "complete" and self.next_resume_token is not None:
            raise TelemetryIngestionApiError("complete sessions cannot emit a resume token")

    def as_payload(self) -> dict[str, object]:
        return {
            "session_id": self.session_id,
            "batch_index": self.batch_index,
            "accepted_event_ids": list(self.accepted_event_ids),
            "duplicate_event_ids": list(self.duplicate_event_ids),
            "effective_event_count": self.effective_event_count,
            "session_status": self.session_status,
            "committed_at": self.committed_at,
            "next_resume_token": (
                self.next_resume_token.as_payload()
                if self.next_resume_token is not None
                else None
            ),
        }


@dataclass
class _TelemetrySessionState:
    session_id: str
    device_id: str
    farm_id: str
    api_version: str
    next_batch_index: int
    effective_event_count: int
    complete: bool


class TelemetryIngestionApiProfile:
    """Consumes versioned sensor envelopes with deterministic replay semantics."""

    def __init__(
        self,
        *,
        supported_versions: tuple[str, ...] = ("telemetry-ingest.v1",),
        contract_registry: ToolContractRegistry | None = None,
        clock=None,
    ) -> None:
        if not supported_versions:
            raise TelemetryIngestionApiError("supported_versions must not be empty")
        self._supported_versions = supported_versions
        self._contract_registry = contract_registry or ToolContractRegistry()
        self._clock = clock or _utc_now_iso
        self._sessions: dict[str, _TelemetrySessionState] = {}
        self._idempotency_index: dict[str, tuple[tuple[object, ...], TelemetryIngestionReceipt]] = {}
        self._seen_event_ids: set[str] = set()
        self._seen_dedupe_keys: set[str] = set()
        self._register_default_contracts()

    def ingest(self, batch: TelemetryIngestionBatch) -> TelemetryIngestionReceipt:
        if batch.api_version not in self._supported_versions:
            raise TelemetryIngestionApiError("unsupported api_version")

        self._validate_contract_input(batch)
        self._validate_batch_events(batch)

        fingerprint = self._batch_fingerprint(batch)
        cached = self._idempotency_index.get(batch.idempotency_key)
        if cached is not None:
            cached_fingerprint, receipt = cached
            if cached_fingerprint != fingerprint:
                raise TelemetryIngestionApiError(
                    "idempotency_key already bound to different ingestion payload"
                )
            return receipt

        session = self._sessions.get(batch.session_id)
        if session is None:
            session = self._start_session(batch)
            self._sessions[batch.session_id] = session
        else:
            self._validate_resume_token(batch, session)

        accepted_event_ids: list[str] = []
        duplicate_event_ids: list[str] = []
        for event in batch.events:
            dedupe_identity = f"{event.device_id}:{event.dedupe_key}"
            if event.event_id in self._seen_event_ids or dedupe_identity in self._seen_dedupe_keys:
                duplicate_event_ids.append(event.event_id)
                continue
            self._seen_event_ids.add(event.event_id)
            self._seen_dedupe_keys.add(dedupe_identity)
            accepted_event_ids.append(event.event_id)

        session.effective_event_count += len(accepted_event_ids)
        session.next_batch_index = batch.batch_index + 1
        session.complete = batch.final_batch

        receipt = TelemetryIngestionReceipt(
            session_id=batch.session_id,
            batch_index=batch.batch_index,
            accepted_event_ids=tuple(accepted_event_ids),
            duplicate_event_ids=tuple(duplicate_event_ids),
            effective_event_count=session.effective_event_count,
            session_status="complete" if batch.final_batch else "open",
            committed_at=self._clock(),
            next_resume_token=(
                None
                if batch.final_batch
                else TelemetryResumeToken(
                    session_id=batch.session_id,
                    device_id=session.device_id,
                    farm_id=session.farm_id,
                    api_version=session.api_version,
                    next_batch_index=session.next_batch_index,
                    issued_at=self._clock(),
                )
            ),
        )
        self._validate_contract_output(receipt, batch.api_version)
        self._idempotency_index[batch.idempotency_key] = (fingerprint, receipt)
        return receipt

    def _start_session(self, batch: TelemetryIngestionBatch) -> _TelemetrySessionState:
        if batch.batch_index != 0:
            raise TelemetryIngestionApiError("first batch must start at batch_index 0")
        if batch.resume_token is not None:
            raise TelemetryIngestionApiError("first batch must not include a resume_token")
        first_event = batch.events[0]
        return _TelemetrySessionState(
            session_id=batch.session_id,
            device_id=first_event.device_id,
            farm_id=first_event.farm_id,
            api_version=batch.api_version,
            next_batch_index=1,
            effective_event_count=0,
            complete=False,
        )

    def _validate_resume_token(
        self,
        batch: TelemetryIngestionBatch,
        session: _TelemetrySessionState,
    ) -> None:
        if session.complete:
            raise TelemetryIngestionApiError("session already completed")
        if batch.batch_index == 0:
            raise TelemetryIngestionApiError("session already exists for batch_index 0")
        if batch.resume_token is None:
            raise TelemetryIngestionApiError("resume_token is required for continuation batches")
        token = batch.resume_token
        if token.session_id != session.session_id:
            raise TelemetryIngestionApiError("resume_token session_id mismatch")
        if token.device_id != session.device_id:
            raise TelemetryIngestionApiError("resume_token device_id mismatch")
        if token.farm_id != session.farm_id:
            raise TelemetryIngestionApiError("resume_token farm_id mismatch")
        if token.api_version != session.api_version:
            raise TelemetryIngestionApiError("resume_token api_version mismatch")
        if token.next_batch_index != batch.batch_index:
            raise TelemetryIngestionApiError("resume_token next_batch_index mismatch")

    def _validate_batch_events(self, batch: TelemetryIngestionBatch) -> None:
        first_event = batch.events[0]
        for event in batch.events:
            if event.device_id != first_event.device_id:
                raise TelemetryIngestionApiError("all events in a batch must share device_id")
            if event.farm_id != first_event.farm_id:
                raise TelemetryIngestionApiError("all events in a batch must share farm_id")
            if not event.schema_version.startswith("sensor-event.v"):
                raise TelemetryIngestionApiError("unsupported sensor event schema_version")

    def _validate_contract_input(self, batch: TelemetryIngestionBatch) -> None:
        self._contract_registry.validate_input(
            tool_name="telemetry.ingest_batch",
            version=batch.api_version,
            payload={
                "session_id": batch.session_id,
                "batch_index": batch.batch_index,
                "idempotency_key": batch.idempotency_key,
                "received_at": batch.received_at,
                "event_ids": [event.event_id for event in batch.events],
                "event_count": len(batch.events),
                "device_id": batch.events[0].device_id,
                "farm_id": batch.events[0].farm_id,
                "resume_token": (
                    batch.resume_token.as_payload() if batch.resume_token is not None else None
                ),
                "final_batch": batch.final_batch,
            },
        )

    def _validate_contract_output(self, receipt: TelemetryIngestionReceipt, version: str) -> None:
        self._contract_registry.validate_output(
            tool_name="telemetry.ingest_batch",
            version=version,
            payload=receipt.as_payload(),
        )

    def _register_default_contracts(self) -> None:
        for version in self._supported_versions:
            try:
                self._contract_registry.register(
                    ToolContract(
                        tool_name="telemetry.ingest_batch",
                        version=version,
                        input_fields=(
                            ContractField("session_id", ContractValueType.STRING),
                            ContractField("batch_index", ContractValueType.INTEGER),
                            ContractField("idempotency_key", ContractValueType.STRING),
                            ContractField("received_at", ContractValueType.STRING),
                            ContractField("event_ids", ContractValueType.ARRAY),
                            ContractField("event_count", ContractValueType.INTEGER),
                            ContractField("device_id", ContractValueType.STRING),
                            ContractField("farm_id", ContractValueType.STRING),
                            ContractField(
                                "resume_token",
                                ContractValueType.OBJECT,
                                required=False,
                                allow_none=True,
                            ),
                            ContractField("final_batch", ContractValueType.BOOLEAN),
                        ),
                        output_fields=(
                            ContractField("session_id", ContractValueType.STRING),
                            ContractField("batch_index", ContractValueType.INTEGER),
                            ContractField("accepted_event_ids", ContractValueType.ARRAY),
                            ContractField("duplicate_event_ids", ContractValueType.ARRAY),
                            ContractField("effective_event_count", ContractValueType.INTEGER),
                            ContractField("session_status", ContractValueType.STRING),
                            ContractField("committed_at", ContractValueType.STRING),
                            ContractField(
                                "next_resume_token",
                                ContractValueType.OBJECT,
                                required=False,
                                allow_none=True,
                            ),
                        ),
                    )
                )
            except ValueError:
                continue

    @staticmethod
    def _batch_fingerprint(batch: TelemetryIngestionBatch) -> tuple[object, ...]:
        return (
            batch.api_version,
            batch.session_id,
            batch.batch_index,
            batch.received_at,
            batch.final_batch,
            tuple(event.event_id for event in batch.events),
            tuple(event.dedupe_key for event in batch.events),
            None if batch.resume_token is None else tuple(batch.resume_token.as_payload().items()),
        )
