from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts import validate_contract_payload
from app.models import AuditEvent, OfflineReplayRecord, OutboxMessage
from app.runtime_config import RuntimeEnvironment, resolve_country_pack_runtime

SCHEMA_VERSION = "2026-04-18.wave1"


@dataclass
class WorkerRunSummary:
    processed_count: int
    notification_count: int
    replay_record_count: int


def utc_now() -> datetime:
    return datetime.now(tz=UTC)


class WorkerRuntime:
    def __init__(self, session: Session, *, environment: RuntimeEnvironment) -> None:
        self.session = session
        self.environment = environment

    def process_available(self, limit: int = 100) -> WorkerRunSummary:
        messages = list(
            self.session.execute(
                select(OutboxMessage)
                .where(OutboxMessage.published_at.is_(None))
                .order_by(OutboxMessage.id.asc())
                .limit(limit)
            ).scalars()
        )
        processed_count = 0
        notification_count = 0
        replay_record_count = 0
        for message in messages:
            processed_count += 1
            if message.event_type in {
                "admin.telemetry.ingested",
                "admin.rollouts.freeze",
                "admin.rollouts.canary",
                "admin.rollouts.promote",
                "admin.rollouts.rollback",
            }:
                self._queue_operator_notification(message)
                notification_count += 1
            if message.event_type == "workflow.command.accepted":
                if self._create_offline_replay_record(message):
                    replay_record_count += 1
            message.published_at = utc_now()
        self.session.commit()
        return WorkerRunSummary(
            processed_count=processed_count,
            notification_count=notification_count,
            replay_record_count=replay_record_count,
        )

    def _queue_operator_notification(self, message: OutboxMessage) -> None:
        payload = dict(message.payload)
        country_code = str(payload.get("country_code", "GH"))
        runtime = resolve_country_pack_runtime(
            environment=self.environment,
            country_code=country_code,
        )
        supported_channels = runtime["country_pack"]["supported_channels"]
        attempted_channels = [
            channel for channel in ["whatsapp", "sms"] if channel in supported_channels
        ]
        if not attempted_channels:
            attempted_channels = ["sms"]
        notification_payload = {
            "schema_version": SCHEMA_VERSION,
            "notification_id": f"notify-{message.id}",
            "intent_type": "system_alert",
            "recipient": {
                "contact_id": f"operator:{country_code}:{payload.get('service_name', message.aggregate_id)}",
                "locale": runtime["country_pack"]["default_locale"],
                "phone_number": None,
                "device_token": None,
            },
            "attempted_channels": attempted_channels,
            "final_channel": attempted_channels[0],
            "final_state": "action_required",
            "fallback_triggered": False,
            "fallback_reason": None,
            "parity_key": str(payload.get("idempotency_key", message.id)),
            "attempted_at": utc_now().isoformat().replace("+00:00", "Z"),
        }
        validate_contract_payload("notifications.attempt", notification_payload)
        self.session.add(
            AuditEvent(
                request_id=str(payload.get("request_id", f"worker-{message.id}")),
                actor_id="worker:system",
                event_type="worker.notification.queued",
                command_name=message.event_type,
                status="queued",
                reason_code="operator_notification_required",
                schema_version=SCHEMA_VERSION,
                idempotency_key=str(payload.get("idempotency_key", f"worker-{message.id}")),
                correlation_id=str(payload.get("request_id", f"worker-{message.id}")),
                payload=notification_payload,
            )
        )
        self.session.add(
            OutboxMessage(
                aggregate_type="notification_attempt",
                aggregate_id=notification_payload["notification_id"],
                event_type="notifications.dispatch.requested",
                payload=notification_payload,
            )
        )

    def _create_offline_replay_record(self, message: OutboxMessage) -> bool:
        payload = dict(message.payload)
        journey_ids = payload.get("journey_ids") or []
        if not isinstance(journey_ids, list) or not any(
            isinstance(item, str) and item.startswith("offline:")
            for item in journey_ids
        ):
            return False
        if payload.get("offline_queue_item_id") in {None, ""}:
            return False
        idempotency_key = str(payload["idempotency_key"])
        existing = self.session.execute(
            select(OfflineReplayRecord).where(OfflineReplayRecord.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing is not None:
            return False
        record_payload = {
            "schema_version": SCHEMA_VERSION,
            "item_id": str(payload["offline_queue_item_id"]),
            "disposition": "applied",
            "result_ref": f"{message.aggregate_type}:{message.aggregate_id}",
            "error_code": None,
            "retry_after_ms": None,
            "conflict": {
                "state": "none",
                "reason_code": None,
                "conflict_ref": None,
            },
        }
        validate_contract_payload("channels.offline_queue_result", record_payload)
        self.session.add(
            OfflineReplayRecord(
                item_id=str(payload["offline_queue_item_id"]),
                idempotency_key=idempotency_key,
                command_name=str(payload["command_name"]),
                actor_id=str(payload.get("actor_id", "unknown")),
                country_code=str(payload.get("country_code", "GH")),
                disposition="applied",
                result_ref=f"{message.aggregate_type}:{message.aggregate_id}",
                error_code=None,
                conflict_state="none",
                conflict_ref=None,
            )
        )
        self.session.add(
            AuditEvent(
                request_id=str(payload.get("request_id", f"worker-{message.id}")),
                actor_id=str(payload.get("actor_id", "unknown")),
                event_type="worker.offline.replay_recorded",
                command_name=str(payload["command_name"]),
                status="applied",
                reason_code="offline_replay_applied",
                schema_version=SCHEMA_VERSION,
                idempotency_key=idempotency_key,
                correlation_id=str(payload.get("request_id", f"worker-{message.id}")),
                payload=record_payload,
            )
        )
        return True
