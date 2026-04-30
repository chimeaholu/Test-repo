from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.contracts_catalog import get_envelope_schema_version


def build_copilot_dispatch_plan(
    *,
    notification_id: str,
    template_key: str,
    dedupe_key: str,
    summary: str,
    escalate_after_minutes: int = 30,
) -> dict[str, object]:
    now = datetime.now(tz=UTC)
    return {
        "schema_version": get_envelope_schema_version(),
        "notification_id": notification_id,
        "template_key": template_key,
        "dedupe_key": dedupe_key,
        "queue_state": "queued",
        "preferred_channels": ["in_app"],
        "fallback_channels": ["whatsapp", "sms"],
        "expires_at": (now + timedelta(hours=12)).isoformat().replace("+00:00", "Z"),
        "escalate_after": (now + timedelta(minutes=escalate_after_minutes))
        .isoformat()
        .replace("+00:00", "Z"),
        "payload": {
            "summary": summary,
            "source": "copilot",
        },
    }


def build_copilot_notification_result(
    *,
    notification_id: str,
    delivery_state: str,
    retryable: bool,
    fallback_channel: str | None = None,
    fallback_reason: str | None = None,
    error_code: str | None = None,
) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "notification_id": notification_id,
        "delivery_state": delivery_state,
        "retryable": retryable,
        "error_code": error_code,
        "fallback_channel": fallback_channel,
        "fallback_reason": fallback_reason,
    }
