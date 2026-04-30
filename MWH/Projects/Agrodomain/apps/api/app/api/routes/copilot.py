from __future__ import annotations

from datetime import UTC, datetime
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import (
    get_active_settings,
    get_correlation_id,
    get_request_id,
    get_session,
)
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.repositories.audit import AuditRepository
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.transport import TransportRepository
from app.modules.channels.copilot import (
    build_copilot_dispatch_plan,
    build_copilot_notification_result,
)
from app.modules.copilot.runtime import CopilotResolveRequest, CopilotRuntime
from app.modules.copilot.recommendations import CopilotRecommendationEngine
from app.modules.transport.runtime import TransportRuntime
from app.services.commands.bus import CommandBus
from app.services.commands.contracts import CommandEnvelope, validate_contract_payload
from app.services.commands.errors import CommandRejectedError
from app.services.outbox import OutboxService

router = APIRouter(prefix="/api/v1/copilot", tags=["copilot"])


def _payload_items(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _payload_context(value: object) -> dict[str, str | None]:
    if not isinstance(value, dict):
        return {}
    context: dict[str, str | None] = {}
    for key, item in value.items():
        context[str(key)] = None if item is None else str(item)
    return context


def _payload_mapping(value: object) -> dict[str, object]:
    return dict(value) if isinstance(value, dict) else {}


def _optional_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float, str)):
        return float(value)
    raise ValueError("expected_numeric_payload")


@router.get("/recommendations")
def list_copilot_recommendations(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.role is None or auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="actor_scope_incomplete")

    engine = CopilotRecommendationEngine(
        climate_repository=ClimateRepository(db_session),
        marketplace_repository=MarketplaceRepository(db_session),
        transport_repository=TransportRepository(db_session),
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "supports_non_web_delivery": True,
        "items": engine.list_recommendations(auth_context),
    }


def _require_auth(request: Request, settings: Settings, db_session: Session) -> AuthContext:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.role is None or auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="actor_scope_incomplete")
    return auth_context


def _copilot_runtime(db_session: Session) -> CopilotRuntime:
    return CopilotRuntime(
        climate_repository=ClimateRepository(db_session),
        marketplace_repository=MarketplaceRepository(db_session),
        transport_repository=TransportRepository(db_session),
    )


def _record_copilot_event(
    *,
    audit_repository: AuditRepository,
    request_id: str,
    correlation_id: str,
    actor_id: str,
    event_type: str,
    status: str,
    reason_code: str | None,
    payload: dict[str, object],
    idempotency_key: str | None = None,
) -> int:
    audit_event = audit_repository.record_event(
        request_id=request_id,
        actor_id=actor_id,
        event_type=event_type,
        command_name="copilot.execute" if event_type.startswith("copilot.execution") else "copilot.resolve",
        status=status,
        reason_code=reason_code,
        schema_version=get_envelope_schema_version(),
        idempotency_key=idempotency_key,
        payload=payload,
        correlation_id=correlation_id,
    )
    return audit_event.id


def _human_handoff(*, required: bool, reason_code: str, reviewer_roles: list[str]) -> dict[str, object]:
    return {
        "required": required,
        "queue_label": "AgroGuide operator queue",
        "reason_code": reason_code,
        "reviewer_roles": reviewer_roles,
    }


def _execution_summary(intent: str, status: str, decision: str) -> str:
    if status == "escalated":
        return "AgroGuide created a human handoff instead of executing the action."
    if status == "blocked":
        return f"AgroGuide could not complete the {intent} action safely."
    if decision == "confirm" and intent == "advisory.ask":
        return "AgroGuide submitted the advisory request."
    return f"AgroGuide completed the {intent} action."


def _dispatch_plan(
    *,
    resolution_id: str,
    intent: str,
    route_path: str,
    actor_id: str,
    summary: str,
) -> dict[str, object]:
    return build_copilot_dispatch_plan(
        notification_id=f"copilot-{resolution_id}",
        template_key=f"copilot.{intent}.execution",
        dedupe_key=f"{route_path}:{intent}:{actor_id}",
        summary=summary,
    )


def _command_descriptor_for_adapter(
    *,
    adapter: str,
    payload: dict[str, object],
) -> tuple[str, str]:
    if adapter == "advisory.requests.submit":
        return "advisory", "advisory.requests"
    if adapter == "market.listings.publish":
        return str(payload["listing_id"]), "marketplace.listings"
    if adapter in {
        "market.negotiations.confirm.approve",
        "market.negotiations.confirm.reject",
    }:
        return str(payload["thread_id"]), "marketplace.negotiations"
    if adapter == "climate.alerts.acknowledge":
        return str(payload["alert_id"]), "climate.alerts"
    raise ValueError(f"Unsupported copilot command adapter: {adapter}")


@router.post("/resolve")
def resolve_copilot_request(
    payload: dict[str, object],
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    validate_contract_payload("copilot.resolve_input", payload)
    runtime = _copilot_runtime(db_session)
    resolution = runtime.resolve(
        auth_context=auth_context,
        request_id=request_id,
        request=CopilotResolveRequest(
            route_path=str(payload["route_path"]),
            locale=str(payload["locale"]),
            message=str(payload["message"]),
            transcript_entries=_payload_items(payload.get("transcript_entries")),
            context=_payload_context(payload.get("context")),
        ),
    )
    human_handoff = resolution.get("human_handoff")
    handoff_required = isinstance(human_handoff, dict) and bool(human_handoff.get("required"))
    handoff_reason_code = (
        str(human_handoff.get("reason_code")) if isinstance(human_handoff, dict) and handoff_required else None
    )
    outbox = OutboxService(db_session)
    outbox.enqueue(
        aggregate_type="copilot_resolution",
        aggregate_id=str(resolution["resolution_id"]),
        event_type="copilot.resolution.created",
        payload={
            "intent": resolution["intent"],
            "status": resolution["status"],
            "route_path": resolution["route_path"],
        },
    )
    _record_copilot_event(
        audit_repository=AuditRepository(db_session),
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="copilot.resolution.created",
        status=str(resolution["status"]),
        reason_code=handoff_reason_code,
        payload={
            "resolution_id": resolution["resolution_id"],
            "intent": resolution["intent"],
            "route_path": resolution["route_path"],
            "status": resolution["status"],
        },
    )
    db_session.commit()
    return resolution


@router.post("/execute")
def execute_copilot_action(
    payload: dict[str, object],
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    validate_contract_payload("copilot.execution_input", payload)

    resolution_id = str(payload["resolution_id"])
    intent = str(payload["intent"])
    adapter = str(payload["adapter"])
    decision = str(payload["decision"])
    route_path = str(payload["route_path"])
    action_payload = _payload_mapping(payload.get("payload"))
    note = str(payload.get("note")) if payload.get("note") is not None else None
    summary = _execution_summary(intent=intent, status="completed", decision=decision)
    dispatch_plan = _dispatch_plan(
        resolution_id=resolution_id,
        intent=intent,
        route_path=route_path,
        actor_id=auth_context.actor_subject,
        summary=summary,
    )

    audit_repository = AuditRepository(db_session)
    outbox = OutboxService(db_session)

    if decision == "escalate":
        outbox.enqueue(
            aggregate_type="copilot_resolution",
            aggregate_id=resolution_id,
            event_type="copilot.handoff.requested",
            payload={"intent": intent, "adapter": adapter, "note": note},
        )
        audit_event_id = _record_copilot_event(
            audit_repository=audit_repository,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            event_type="copilot.execution.escalated",
            status="escalated",
            reason_code="human_handoff_requested",
            payload={
                "resolution_id": resolution_id,
                "intent": intent,
                "adapter": adapter,
                "note": note,
            },
            idempotency_key=resolution_id,
        )
        db_session.commit()
        return {
            "schema_version": get_envelope_schema_version(),
            "resolution_id": resolution_id,
            "intent": intent,
            "adapter": adapter,
            "status": "escalated",
            "summary": _execution_summary(intent=intent, status="escalated", decision=decision),
            "audit_event_id": audit_event_id,
            "result": {"handoff_requested": True, "note": note},
            "notification": build_copilot_notification_result(
                notification_id=f"copilot-{resolution_id}",
                delivery_state="action_required",
                retryable=False,
                fallback_channel="whatsapp",
                fallback_reason="manual_escalation",
            ),
            "channel_dispatch": dispatch_plan,
            "human_handoff": _human_handoff(
                required=True,
                reason_code="human_handoff_requested",
                reviewer_roles=["advisor", "ops"],
            ),
            "completed_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        }

    started_at = perf_counter()
    try:
        if adapter == "transport.shipments.events.create":
            transport_repository = TransportRepository(db_session)
            transport_runtime = TransportRuntime(transport_repository)
            shipment_id = str(action_payload["shipment_id"])
            shipment = transport_repository.get_shipment(
                shipment_id=shipment_id,
                country_code=auth_context.country_code or "",
            )
            if shipment is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="transport_shipment_not_found",
                    reason_code="transport_shipment_not_found",
                    payload={"shipment_id": shipment_id},
                )
            load = transport_repository.get_load(
                load_id=shipment.load_id,
                country_code=auth_context.country_code or "",
            )
            if load is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="transport_load_not_found",
                    reason_code="transport_load_not_found",
                    payload={"load_id": shipment.load_id},
                )
            mutation_result = transport_runtime.log_operational_event(
                actor_id=auth_context.actor_subject,
                actor_role=auth_context.role,
                load=load,
                shipment=shipment,
                event_type=str(action_payload["event_type"]),
                location_lat=_optional_float(action_payload.get("location_lat")),
                location_lng=_optional_float(action_payload.get("location_lng")),
                notes=note or (str(action_payload["notes"]) if action_payload.get("notes") else None),
            )
            transport_audit_event = audit_repository.record_event(
                request_id=request_id,
                actor_id=auth_context.actor_subject,
                event_type="transport.shipment.event_logged",
                command_name="transport.shipments.events.create",
                status="completed",
                reason_code=None,
                schema_version=get_envelope_schema_version(),
                idempotency_key=resolution_id,
                payload={
                    "shipment_id": mutation_result.shipment.shipment_id,
                    "event_id": mutation_result.event.event_id,
                    "event_type": mutation_result.event.event_type,
                },
                correlation_id=correlation_id,
            )
            result_payload = {
                "shipment_id": mutation_result.shipment.shipment_id,
                "load_id": mutation_result.load.load_id,
                "event_id": mutation_result.event.event_id,
                "event_type": mutation_result.event.event_type,
                "shipment_status": mutation_result.shipment.status,
                "transport_audit_event_id": transport_audit_event.id,
            }
        else:
            aggregate_ref, mutation_scope = _command_descriptor_for_adapter(
                adapter=adapter,
                payload=action_payload,
            )
            command_payload = dict(action_payload)
            if note is not None:
                command_payload["note"] = note
            bus = CommandBus(
                session=db_session,
                telemetry=request.app.state.telemetry,
                correlation_id=correlation_id,
                settings=settings,
            )
            envelope = CommandEnvelope.model_validate(
                {
                    "metadata": {
                        "schema_version": get_envelope_schema_version(),
                        "request_id": request_id,
                        "idempotency_key": resolution_id,
                        "actor_id": auth_context.actor_subject,
                        "country_code": auth_context.country_code,
                        "channel": "pwa",
                        "correlation_id": correlation_id,
                        "occurred_at": datetime.now(tz=UTC).isoformat(),
                        "traceability": {
                            "journey_ids": ["CJ-010"],
                            "data_check_ids": [],
                        },
                    },
                    "command": {
                        "name": adapter,
                        "aggregate_ref": aggregate_ref,
                        "mutation_scope": mutation_scope,
                        "payload": command_payload,
                    },
                }
            )
            command_result = bus.dispatch(envelope, auth_context)
            result_payload = {
                **command_result.result,
                "downstream_audit_event_id": command_result.audit_event_id,
                "downstream_status": command_result.status,
            }
    except CommandRejectedError as exc:
        audit_event_id = _record_copilot_event(
            audit_repository=audit_repository,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            event_type="copilot.execution.blocked",
            status="blocked",
            reason_code=exc.reason_code,
            payload={
                "resolution_id": resolution_id,
                "intent": intent,
                "adapter": adapter,
                "error_code": exc.error_code,
                "details": exc.payload,
            },
            idempotency_key=resolution_id,
        )
        outbox.enqueue(
            aggregate_type="copilot_resolution",
            aggregate_id=resolution_id,
            event_type="copilot.action.blocked",
            payload={
                "intent": intent,
                "adapter": adapter,
                "reason_code": exc.reason_code,
            },
        )
        request.app.state.telemetry.record_command(
            command_name=f"copilot:{adapter}",
            status="blocked",
            duration_ms=(perf_counter() - started_at) * 1000,
            correlation_id=correlation_id,
        )
        db_session.commit()
        return {
            "schema_version": get_envelope_schema_version(),
            "resolution_id": resolution_id,
            "intent": intent,
            "adapter": adapter,
            "status": "blocked",
            "summary": _execution_summary(intent=intent, status="blocked", decision=decision),
            "audit_event_id": audit_event_id,
            "result": {"error_code": exc.error_code, **exc.payload},
            "notification": build_copilot_notification_result(
                notification_id=f"copilot-{resolution_id}",
                delivery_state="failed",
                retryable=exc.status_code >= 500,
                error_code=exc.reason_code,
            ),
            "channel_dispatch": dispatch_plan,
            "human_handoff": _human_handoff(
                required=exc.status_code in {403, 409},
                reason_code=exc.reason_code,
                reviewer_roles=["ops", "support"],
            ),
            "completed_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        }
    except Exception:
        db_session.rollback()
        raise

    outbox.enqueue(
        aggregate_type="copilot_resolution",
        aggregate_id=resolution_id,
        event_type="copilot.action.completed",
        payload={"intent": intent, "adapter": adapter},
    )
    audit_event_id = _record_copilot_event(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="copilot.execution.completed",
        status="completed",
        reason_code=None,
        payload={"resolution_id": resolution_id, "intent": intent, "adapter": adapter},
        idempotency_key=resolution_id,
    )
    request.app.state.telemetry.record_command(
        command_name=f"copilot:{adapter}",
        status="completed",
        duration_ms=(perf_counter() - started_at) * 1000,
        correlation_id=correlation_id,
    )
    db_session.commit()
    return {
        "schema_version": get_envelope_schema_version(),
        "resolution_id": resolution_id,
        "intent": intent,
        "adapter": adapter,
        "status": "completed",
        "summary": summary,
        "audit_event_id": audit_event_id,
        "result": result_payload,
        "notification": build_copilot_notification_result(
            notification_id=f"copilot-{resolution_id}",
            delivery_state="sent",
            retryable=False,
        ),
        "channel_dispatch": dispatch_plan,
        "human_handoff": _human_handoff(
            required=False,
            reason_code="copilot_self_service",
            reviewer_roles=["advisor"],
        ),
        "completed_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
    }
