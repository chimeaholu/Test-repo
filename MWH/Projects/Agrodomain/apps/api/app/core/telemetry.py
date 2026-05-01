import logging
from typing import Final

from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram, generate_latest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings
from app.core.db import get_session_factory
from app.db.models.audit import OutboxMessage

LOGGER = logging.getLogger("agrodomain.api.telemetry")

REQUEST_BUCKETS: Final[tuple[float, ...]] = (
    0.01,
    0.025,
    0.05,
    0.1,
    0.2,
    0.35,
    0.5,
    0.75,
    1.0,
    1.5,
    2.0,
    3.0,
    5.0,
    10.0,
)


class TelemetryService:
    def __init__(self) -> None:
        self.registry = CollectorRegistry()
        self.http_requests_total = Counter(
            "agro_api_http_requests_total",
            "HTTP requests served by the API.",
            ("method", "path", "status_code"),
            registry=self.registry,
        )
        self.http_request_duration_seconds = Histogram(
            "agro_api_http_request_duration_seconds",
            "HTTP request duration by method, route, and status code.",
            ("method", "path", "status_code"),
            buckets=REQUEST_BUCKETS,
            registry=self.registry,
        )
        self.auth_flow_total = Counter(
            "agro_api_auth_flow_total",
            "Authentication and session flow attempts.",
            ("flow", "outcome"),
            registry=self.registry,
        )
        self.auth_flow_duration_seconds = Histogram(
            "agro_api_auth_flow_duration_seconds",
            "Authentication and session flow latency.",
            ("flow", "outcome"),
            buckets=REQUEST_BUCKETS,
            registry=self.registry,
        )
        self.command_duration_seconds = Histogram(
            "agro_api_command_duration_seconds",
            "Workflow command execution latency.",
            ("command_name", "status"),
            buckets=REQUEST_BUCKETS,
            registry=self.registry,
        )
        self.errors_total = Counter(
            "agro_api_errors_total",
            "Errors observed by surface and type.",
            ("surface", "error_type"),
            registry=self.registry,
        )
        self.outbox_queue_depth = Gauge(
            "agro_api_outbox_queue_depth",
            "Current unpublished outbox messages awaiting delivery.",
            registry=self.registry,
        )
        self.transport_shipment_transition_total = Counter(
            "agro_api_transport_shipment_transition_total",
            "Transport shipment transitions by action, status, country, and SLA state.",
            ("action", "shipment_status", "sla_state", "country_code"),
            registry=self.registry,
        )
        self.transport_exception_total = Counter(
            "agro_api_transport_exception_total",
            "Transport exceptions observed during shipment milestone updates.",
            ("exception_code", "severity", "country_code"),
            registry=self.registry,
        )

    @property
    def metrics_content_type(self) -> str:
        return CONTENT_TYPE_LATEST

    def render_metrics(self, settings: Settings) -> bytes:
        self.refresh_queue_depth(settings)
        return generate_latest(self.registry)

    def observe_request(
        self,
        *,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
    ) -> None:
        status_code_label = str(status_code)
        self.http_requests_total.labels(
            method=method,
            path=path,
            status_code=status_code_label,
        ).inc()
        self.http_request_duration_seconds.labels(
            method=method,
            path=path,
            status_code=status_code_label,
        ).observe(max(duration_ms, 0) / 1000)
        if status_code >= 400:
            self.errors_total.labels(
                surface="http",
                error_type=f"http_{status_code}",
            ).inc()

    def record_auth_flow(
        self,
        *,
        flow: str,
        outcome: str,
        duration_ms: float,
        correlation_id: str | None = None,
        request_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
    ) -> None:
        self.auth_flow_total.labels(flow=flow, outcome=outcome).inc()
        self.auth_flow_duration_seconds.labels(
            flow=flow,
            outcome=outcome,
        ).observe(max(duration_ms, 0) / 1000)
        if outcome not in {"accepted", "authenticated", "identified"}:
            self.errors_total.labels(
                surface="auth",
                error_type=outcome,
            ).inc()
        LOGGER.info(
            "auth.metric",
            extra={
                "flow": flow,
                "outcome": outcome,
                "duration_ms": round(duration_ms, 2),
                "correlation_id": correlation_id,
                "request_id": request_id,
                "trace_id": trace_id,
                "span_id": span_id,
            },
        )

    def record_command(
        self,
        *,
        command_name: str,
        status: str,
        duration_ms: float,
        correlation_id: str,
    ) -> None:
        self.command_duration_seconds.labels(
            command_name=command_name,
            status=status,
        ).observe(max(duration_ms, 0) / 1000)
        if status not in {"accepted", "replayed"}:
            self.errors_total.labels(
                surface="workflow",
                error_type=status,
            ).inc()
        LOGGER.info(
            "command.metric",
            extra={
                "command_name": command_name,
                "status": status,
                "duration_ms": round(duration_ms, 2),
                "correlation_id": correlation_id,
            },
        )

    def refresh_queue_depth(self, settings: Settings) -> None:
        try:
            with get_session_factory(settings.database_url)() as session:
                depth = session.execute(
                    select(func.count()).select_from(OutboxMessage).where(
                        OutboxMessage.published_at.is_(None)
                    )
                ).scalar_one()
        except SQLAlchemyError as exc:
            self.errors_total.labels(
                surface="metrics",
                error_type="queue_depth_refresh_failed",
            ).inc()
            LOGGER.warning(
                "queue.depth.refresh_failed",
                extra={"error": str(exc)},
            )
            return
        self.outbox_queue_depth.set(depth)
        LOGGER.info("queue.depth", extra={"depth": depth})

    def record_listing_publish_transition(
        self,
        *,
        listing_id: str,
        transition: str,
        revision_count: int,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "listing.publish_transition",
            extra={
                "listing_id": listing_id,
                "transition": transition,
                "revision_count": revision_count,
                "correlation_id": correlation_id,
            },
        )

    def record_negotiation_transition(
        self,
        *,
        thread_id: str,
        listing_id: str,
        transition: str,
        status: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "negotiation.transition",
            extra={
                "thread_id": thread_id,
                "listing_id": listing_id,
                "transition": transition,
                "status": status,
                "correlation_id": correlation_id,
            },
        )

    def record_escrow_transition(
        self,
        *,
        escrow_id: str,
        thread_id: str,
        transition: str,
        state: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "escrow.transition",
            extra={
                "escrow_id": escrow_id,
                "thread_id": thread_id,
                "transition": transition,
                "state": state,
                "correlation_id": correlation_id,
            },
        )

    def record_advisory_retrieval(
        self,
        *,
        advisory_request_id: str,
        source_count: int,
        confidence_band: str,
        citation_count: int,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "advisory.retrieval",
            extra={
                "advisory_request_id": advisory_request_id,
                "source_count": source_count,
                "confidence_band": confidence_band,
                "citation_count": citation_count,
                "correlation_id": correlation_id,
            },
        )

    def record_reviewer_decision(
        self,
        *,
        advisory_request_id: str,
        outcome: str,
        reason_code: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "advisory.reviewer_decision",
            extra={
                "advisory_request_id": advisory_request_id,
                "outcome": outcome,
                "reason_code": reason_code,
                "correlation_id": correlation_id,
            },
        )

    def record_climate_alert(
        self,
        *,
        alert_id: str,
        severity: str,
        status: str,
        degraded_mode: bool,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "climate.alert.metric",
            extra={
                "alert_id": alert_id,
                "severity": severity,
                "status": status,
                "degraded_mode": degraded_mode,
                "correlation_id": correlation_id,
            },
        )

    def record_mrv_evidence(
        self,
        *,
        evidence_id: str,
        source_completeness_state: str,
        degraded_mode: bool,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "mrv.evidence.metric",
            extra={
                "evidence_id": evidence_id,
                "source_completeness_state": source_completeness_state,
                "degraded_mode": degraded_mode,
                "correlation_id": correlation_id,
            },
        )

    def record_transport_shipment_transition(
        self,
        *,
        action: str,
        shipment_status: str,
        sla_state: str,
        country_code: str,
        correlation_id: str,
    ) -> None:
        self.transport_shipment_transition_total.labels(
            action=action,
            shipment_status=shipment_status,
            sla_state=sla_state,
            country_code=country_code,
        ).inc()
        LOGGER.info(
            "transport.shipment.transition.metric",
            extra={
                "action": action,
                "shipment_status": shipment_status,
                "sla_state": sla_state,
                "country_code": country_code,
                "correlation_id": correlation_id,
            },
        )

    def record_transport_exception(
        self,
        *,
        exception_code: str,
        severity: str,
        country_code: str,
        correlation_id: str,
    ) -> None:
        self.transport_exception_total.labels(
            exception_code=exception_code,
            severity=severity,
            country_code=country_code,
        ).inc()
        self.errors_total.labels(
            surface="transport",
            error_type=f"exception_{exception_code}",
        ).inc()
        LOGGER.info(
            "transport.shipment.exception.metric",
            extra={
                "exception_code": exception_code,
                "severity": severity,
                "country_code": country_code,
                "correlation_id": correlation_id,
            },
        )
