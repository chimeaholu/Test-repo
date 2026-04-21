import logging

LOGGER = logging.getLogger("agrodomain.api.telemetry")


class TelemetryService:
    def record_command(
        self,
        *,
        command_name: str,
        status: str,
        duration_ms: float,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "command.metric",
            extra={
                "command_name": command_name,
                "status": status,
                "duration_ms": round(duration_ms, 2),
                "correlation_id": correlation_id,
            },
        )

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

    def record_finance_decision(
        self,
        *,
        finance_request_id: str,
        outcome: str,
        decision_source: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "finance.decision.metric",
            extra={
                "finance_request_id": finance_request_id,
                "outcome": outcome,
                "decision_source": decision_source,
                "correlation_id": correlation_id,
            },
        )

    def record_traceability_event(
        self,
        *,
        trace_event_id: str,
        consignment_id: str,
        milestone: str,
        attachment_ready: bool,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "traceability.event.metric",
            extra={
                "trace_event_id": trace_event_id,
                "consignment_id": consignment_id,
                "milestone": milestone,
                "attachment_ready": attachment_ready,
                "correlation_id": correlation_id,
            },
        )

    def record_finance_queue_state(
        self,
        *,
        finance_request_id: str,
        status: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "finance.queue.metric",
            extra={
                "finance_request_id": finance_request_id,
                "status": status,
                "correlation_id": correlation_id,
            },
        )

    def record_insurance_trigger_evaluation(
        self,
        *,
        trigger_id: str,
        evaluation_state: str,
        payout_dedupe_key: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "insurance.trigger.metric",
            extra={
                "trigger_id": trigger_id,
                "evaluation_state": evaluation_state,
                "payout_dedupe_key": payout_dedupe_key,
                "correlation_id": correlation_id,
            },
        )

    def record_traceability_continuity_failure(
        self,
        *,
        reason_code: str,
        correlation_id: str,
    ) -> None:
        LOGGER.info(
            "traceability.continuity_failure.metric",
            extra={
                "reason_code": reason_code,
                "correlation_id": correlation_id,
            },
        )
