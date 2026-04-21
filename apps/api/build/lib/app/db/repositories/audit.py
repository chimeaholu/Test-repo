from sqlalchemy.orm import Session

from app.db.models.audit import AuditEvent


class AuditRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def record_event(
        self,
        *,
        request_id: str,
        actor_id: str | None,
        event_type: str,
        command_name: str | None,
        status: str,
        reason_code: str | None,
        schema_version: str | None,
        idempotency_key: str | None,
        payload: dict[str, object],
        correlation_id: str,
    ) -> AuditEvent:
        event = AuditEvent(
            request_id=request_id,
            actor_id=actor_id,
            event_type=event_type,
            command_name=command_name,
            status=status,
            reason_code=reason_code,
            schema_version=schema_version,
            idempotency_key=idempotency_key,
            payload=payload,
            correlation_id=correlation_id,
        )
        self.session.add(event)
        self.session.flush()
        return event

    def record_unauthorized_attempt(
        self,
        *,
        request_id: str,
        command_name: str,
        idempotency_key: str,
        schema_version: str,
        payload: dict[str, object],
        correlation_id: str,
    ) -> AuditEvent:
        return self.record_event(
            request_id=request_id,
            actor_id=None,
            event_type="command.rejected",
            command_name=command_name,
            status="rejected",
            reason_code="unauthorized_mutation",
            schema_version=schema_version,
            idempotency_key=idempotency_key,
            payload=payload,
            correlation_id=correlation_id,
        )
