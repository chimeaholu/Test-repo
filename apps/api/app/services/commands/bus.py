from typing import cast

from sqlalchemy.orm import Session

from app.core.auth import AuthContext
from app.core.config import Settings
from app.db.repositories.audit import AuditRepository
from app.db.repositories.advisory import AdvisoryRepository
from app.db.repositories.finance import FinanceRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.traceability import TraceabilityRepository
from app.db.repositories.workflow import WorkflowRepository
from app.services.commands.contracts import CommandEnvelope, CommandResultEnvelope
from app.services.commands.errors import CommandRejectedError
from app.services.commands.handlers import WorkflowCommandHandler
from app.services.idempotency import IdempotencyService
from app.services.outbox import OutboxService


class CommandBus:
    def __init__(
        self,
        *,
        session: Session,
        telemetry,
        correlation_id: str,
        settings: Settings,
    ) -> None:
        self.session = session
        self.telemetry = telemetry
        self.correlation_id = correlation_id
        self.settings = settings
        self.workflow_repository = WorkflowRepository(session)
        self.marketplace_repository = MarketplaceRepository(session)
        self.ledger_repository = LedgerRepository(session)
        self.escrow_repository = EscrowRepository(session)
        self.finance_repository = FinanceRepository(session)
        self.traceability_repository = TraceabilityRepository(session)
        self.advisory_repository = AdvisoryRepository(session)
        self.audit_repository = AuditRepository(session)
        self.idempotency = IdempotencyService(self.workflow_repository)
        self.outbox = OutboxService(session)
        self.handler = WorkflowCommandHandler(
            session,
            self.workflow_repository,
            self.marketplace_repository,
            self.ledger_repository,
            self.escrow_repository,
            self.finance_repository,
            self.traceability_repository,
            self.advisory_repository,
        )

    def dispatch(
        self,
        envelope: CommandEnvelope,
        auth_context: AuthContext,
        *,
        offline_queue_item_id: str | None = None,
    ) -> CommandResultEnvelope:
        if auth_context.actor_subject != envelope.metadata.actor_id:
            self._reject(
                status_code=403,
                error_code="actor_scope_mismatch",
                reason_code="actor_scope_mismatch",
                envelope=envelope,
                actor_id=auth_context.actor_subject,
            )

        if auth_context.country_code and auth_context.country_code != envelope.metadata.country_code:
            self._reject(
                status_code=403,
                error_code="country_scope_mismatch",
                reason_code="country_scope_mismatch",
                envelope=envelope,
                actor_id=auth_context.actor_subject,
            )

        receipt = self.idempotency.get_receipt(envelope.metadata.idempotency_key)
        if receipt is not None:
            if receipt.actor_id != auth_context.actor_subject or receipt.command_name != envelope.command_name:
                self._reject(
                    status_code=409,
                    error_code="idempotency_conflict",
                    reason_code="idempotency_conflict",
                    envelope=envelope,
                    actor_id=auth_context.actor_subject,
                )

            audit_event = self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="command.replayed",
                command_name=envelope.command_name,
                status="replayed",
                reason_code="idempotent_replay",
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=envelope.payload,
                correlation_id=self.correlation_id,
            )
            self.session.flush()
            return CommandResultEnvelope(
                status="replayed",
                request_id=envelope.metadata.request_id,
                idempotency_key=envelope.metadata.idempotency_key,
                result=receipt.response_body,
                audit_event_id=audit_event.id,
                replayed=True,
            )

        if (
            envelope.command_name.startswith("market.")
            or envelope.command_name.startswith("wallets.")
            or envelope.command_name.startswith("climate.")
            or envelope.command_name.startswith("finance.")
            or envelope.command_name.startswith("insurance.")
            or envelope.command_name.startswith("traceability.")
            or envelope.command_name == "advisory.requests.submit"
        ) and not auth_context.consent_granted:
            self._reject(
                status_code=403,
                error_code="missing_consent",
                reason_code="missing_consent",
                envelope=envelope,
                actor_id=auth_context.actor_subject,
            )

        if envelope.metadata.schema_version not in self.settings.allowed_schema_versions:
            self._reject(
                status_code=422,
                error_code="invalid_schema_version",
                reason_code="invalid_schema_version",
                envelope=envelope,
                actor_id=auth_context.actor_subject,
            )

        try:
            result = self.handler.handle(envelope, auth_context)
        except ValueError as exc:
            self._reject(
                status_code=422,
                error_code="invalid_schema",
                reason_code="invalid_payload",
                envelope=envelope,
                actor_id=auth_context.actor_subject,
                extra_payload={"validation_error": str(exc)},
            )
        except CommandRejectedError as exc:
            if exc.reason_code in {
                "traceability_missing_predecessor",
                "traceability_out_of_order",
                "traceability_initial_milestone_required",
            }:
                self.telemetry.record_traceability_continuity_failure(
                    reason_code=exc.reason_code,
                    correlation_id=self.correlation_id,
                )
            self._reject(
                status_code=exc.status_code,
                error_code=exc.error_code,
                reason_code=exc.reason_code,
                envelope=envelope,
                actor_id=auth_context.actor_subject,
                extra_payload=exc.payload,
            )

        listing_payload = cast(dict[str, object] | None, result.get("listing"))
        thread_payload = cast(dict[str, object] | None, result.get("thread"))
        escrow_payload = cast(dict[str, object] | None, result.get("escrow"))
        finance_request = cast(dict[str, object] | None, result.get("finance_request"))
        insurance_payout_event = cast(dict[str, object] | None, result.get("insurance_payout_event"))
        consignment_payload = cast(dict[str, object] | None, result.get("consignment"))
        traceability_event = cast(dict[str, object] | None, result.get("traceability_event"))
        if "execution_id" in result:
            aggregate_id = str(result["execution_id"])
            aggregate_type = "workflow_execution"
        elif insurance_payout_event is not None:
            aggregate_id = str(insurance_payout_event["payout_event_id"])
            aggregate_type = "insurance_payout"
        elif finance_request is not None:
            aggregate_id = str(finance_request["finance_request_id"])
            aggregate_type = "finance_request"
        elif traceability_event is not None:
            aggregate_id = str(traceability_event["trace_event_id"])
            aggregate_type = "traceability_event"
        elif consignment_payload is not None:
            aggregate_id = str(consignment_payload["consignment_id"])
            aggregate_type = "consignment"
        elif escrow_payload is not None:
            aggregate_id = str(escrow_payload["escrow_id"])
            aggregate_type = "escrow"
        elif thread_payload is not None:
            aggregate_id = str(thread_payload["thread_id"])
            aggregate_type = "negotiation_thread"
        elif listing_payload is not None:
            aggregate_id = str(listing_payload["listing_id"])
            aggregate_type = "listing"
        else:
            aggregate_id = envelope.command.aggregate_ref
            aggregate_type = "workflow_execution"
        outbox_message = self.outbox.enqueue(
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type="workflow.command.accepted",
            payload={
                "command_name": envelope.command_name,
                "request_id": str(envelope.metadata.request_id),
                "idempotency_key": envelope.metadata.idempotency_key,
                "actor_id": auth_context.actor_subject,
                "country_code": envelope.metadata.country_code,
                "channel": envelope.metadata.channel,
                "journey_ids": list(envelope.metadata.traceability.journey_ids),
                "offline_queue_item_id": offline_queue_item_id,
            },
        )
        audit_event = self.audit_repository.record_event(
            request_id=str(envelope.metadata.request_id),
            actor_id=auth_context.actor_subject,
            event_type="command.accepted",
            command_name=envelope.command_name,
            status="accepted",
            reason_code=None,
            schema_version=envelope.metadata.schema_version,
            idempotency_key=envelope.metadata.idempotency_key,
            payload={
                **envelope.payload,
                "outbox_message_id": outbox_message.id,
            },
            correlation_id=self.correlation_id,
        )
        self.workflow_repository.create_receipt(
            idempotency_key=envelope.metadata.idempotency_key,
            request_id=str(envelope.metadata.request_id),
            actor_id=auth_context.actor_subject,
            command_name=envelope.command_name,
            status="accepted",
            response_code="accepted",
            response_body=result,
        )
        thread_transition = cast(dict[str, object] | None, result.get("thread_transition"))
        if thread_transition is not None:
            self.outbox.enqueue(
                aggregate_type="negotiation_thread",
                aggregate_id=str(thread_transition["thread_id"]),
                event_type="negotiation.thread.transitioned",
                payload=thread_transition,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="negotiation.thread.transitioned",
                command_name=envelope.command_name,
                status=str(thread_transition["status"]),
                reason_code=str(thread_transition["transition"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=thread_transition,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_negotiation_transition(
                thread_id=str(thread_transition["thread_id"]),
                listing_id=str(thread_transition["listing_id"]),
                transition=str(thread_transition["transition"]),
                status=str(thread_transition["status"]),
                correlation_id=self.correlation_id,
            )
        escrow_transition = cast(dict[str, object] | None, result.get("escrow_transition"))
        if escrow_transition is not None:
            self.outbox.enqueue(
                aggregate_type="escrow",
                aggregate_id=str(escrow_transition["escrow_id"]),
                event_type="escrow.transitioned",
                payload=escrow_transition,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="escrow.transitioned",
                command_name=envelope.command_name,
                status=str(escrow_transition["state"]),
                reason_code=str(escrow_transition["transition"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=escrow_transition,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_escrow_transition(
                escrow_id=str(escrow_transition["escrow_id"]),
                thread_id=str(escrow_transition["thread_id"]),
                transition=str(escrow_transition["transition"]),
                state=str(escrow_transition["state"]),
                correlation_id=self.correlation_id,
            )
        settlement_notifications = cast(
            list[dict[str, object]] | None, result.get("settlement_notifications")
        )
        if settlement_notifications is not None:
            for notification in settlement_notifications:
                self.outbox.enqueue(
                    aggregate_type="escrow",
                    aggregate_id=str(notification["escrow_id"]),
                    event_type="settlement.notification.queued",
                    payload=notification,
                )
                self.audit_repository.record_event(
                    request_id=str(envelope.metadata.request_id),
                    actor_id=str(notification["recipient_actor_id"]),
                    event_type="settlement.notification.queued",
                    command_name=envelope.command_name,
                    status=str(notification["delivery_state"]),
                    reason_code=cast(str | None, notification.get("fallback_reason")),
                    schema_version=envelope.metadata.schema_version,
                    idempotency_key=envelope.metadata.idempotency_key,
                    payload=notification,
                    correlation_id=self.correlation_id,
                )
        climate_alert_transition = cast(
            dict[str, object] | None, result.get("climate_alert_transition")
        )
        if climate_alert_transition is not None:
            self.outbox.enqueue(
                aggregate_type="climate_alert",
                aggregate_id=str(climate_alert_transition["alert_id"]),
                event_type="climate.alert.transitioned",
                payload=climate_alert_transition,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="climate.alert.transitioned",
                command_name=envelope.command_name,
                status=str(climate_alert_transition["status"]),
                reason_code=None,
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=climate_alert_transition,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_climate_alert(
                alert_id=str(climate_alert_transition["alert_id"]),
                severity=str(climate_alert_transition["severity"]),
                status=str(climate_alert_transition["status"]),
                degraded_mode=bool(climate_alert_transition["degraded_mode"]),
                correlation_id=self.correlation_id,
            )
        mrv_evidence = cast(dict[str, object] | None, result.get("mrv_evidence"))
        if mrv_evidence is not None:
            degraded_reason_codes = cast(list[object], mrv_evidence.get("degraded_reason_codes") or [])
            self.outbox.enqueue(
                aggregate_type="mrv_evidence",
                aggregate_id=str(mrv_evidence["evidence_id"]),
                event_type="mrv.evidence.created",
                payload=mrv_evidence,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="mrv.evidence.created",
                command_name=envelope.command_name,
                status=str(mrv_evidence["source_completeness_state"]),
                reason_code=str(degraded_reason_codes[0]) if degraded_reason_codes else None,
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=mrv_evidence,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_mrv_evidence(
                evidence_id=str(mrv_evidence["evidence_id"]),
                source_completeness_state=str(mrv_evidence["source_completeness_state"]),
                degraded_mode=bool(mrv_evidence["degraded_mode"]),
                correlation_id=self.correlation_id,
            )
        reviewer_decision = cast(dict[str, object] | None, result.get("reviewer_decision"))
        if reviewer_decision is not None:
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=str(reviewer_decision["actor_id"]),
                event_type="advisory.reviewer.decisioned",
                command_name=envelope.command_name,
                status=str(reviewer_decision["outcome"]),
                reason_code=str(reviewer_decision["reason_code"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=reviewer_decision,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_reviewer_decision(
                advisory_request_id=str(reviewer_decision["advisory_request_id"]),
                outcome=str(reviewer_decision["outcome"]),
                reason_code=str(reviewer_decision["reason_code"]),
                correlation_id=self.correlation_id,
            )
        advisory_request = cast(dict[str, object] | None, result.get("advisory_request"))
        if advisory_request is not None:
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="advisory.response.generated",
                command_name=envelope.command_name,
                status=str(advisory_request["status"]),
                reason_code=(
                    str(reviewer_decision["reason_code"]) if reviewer_decision is not None else None
                ),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload={
                    "advisory_request_id": advisory_request["advisory_request_id"],
                    "source_ids": advisory_request["source_ids"],
                    "confidence_band": advisory_request["confidence_band"],
                    "model_name": advisory_request["model_name"],
                    "model_version": advisory_request["model_version"],
                },
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_advisory_retrieval(
                advisory_request_id=str(advisory_request["advisory_request_id"]),
                source_count=len(cast(list[object], advisory_request["source_ids"])),
                confidence_band=str(advisory_request["confidence_band"]),
                citation_count=len(cast(list[object], advisory_request["citations"])),
                correlation_id=self.correlation_id,
            )
        if finance_request is not None:
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="finance.request.created",
                command_name=envelope.command_name,
                status=str(finance_request["status"]),
                reason_code=None,
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=finance_request,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_finance_queue_state(
                finance_request_id=str(finance_request["finance_request_id"]),
                status=str(finance_request["status"]),
                correlation_id=self.correlation_id,
            )
        finance_decision = cast(dict[str, object] | None, result.get("finance_decision"))
        if finance_decision is not None:
            self.outbox.enqueue(
                aggregate_type="finance_request",
                aggregate_id=str(finance_decision["finance_request_id"]),
                event_type="finance.decision.recorded",
                payload=finance_decision,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=str(finance_decision["actor_id"]),
                event_type="finance.decision.recorded",
                command_name=envelope.command_name,
                status=str(finance_decision["outcome"]),
                reason_code=str(finance_decision["reason_code"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=finance_decision,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_finance_decision(
                finance_request_id=str(finance_decision["finance_request_id"]),
                outcome=str(finance_decision["outcome"]),
                decision_source=str(finance_decision["decision_source"]),
                correlation_id=self.correlation_id,
            )
        insurance_evaluation = cast(dict[str, object] | None, result.get("insurance_evaluation"))
        if insurance_evaluation is not None:
            self.outbox.enqueue(
                aggregate_type="insurance_trigger",
                aggregate_id=str(insurance_evaluation["trigger_id"]),
                event_type="insurance.trigger.evaluated",
                payload=insurance_evaluation,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=str(insurance_evaluation["actor_id"]),
                event_type="insurance.trigger.evaluated",
                command_name=envelope.command_name,
                status=str(insurance_evaluation["evaluation_state"]),
                reason_code=str(insurance_evaluation["payout_dedupe_key"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=insurance_evaluation,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_insurance_trigger_evaluation(
                trigger_id=str(insurance_evaluation["trigger_id"]),
                evaluation_state=str(insurance_evaluation["evaluation_state"]),
                payout_dedupe_key=str(insurance_evaluation["payout_dedupe_key"]),
                correlation_id=self.correlation_id,
            )
        if insurance_payout_event is not None:
            self.outbox.enqueue(
                aggregate_type="insurance_payout",
                aggregate_id=str(insurance_payout_event["payout_event_id"]),
                event_type="insurance.payout.recorded",
                payload=insurance_payout_event,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=str(insurance_payout_event["actor_id"]),
                event_type="insurance.payout.recorded",
                command_name=envelope.command_name,
                status="payout_emitted",
                reason_code=str(insurance_payout_event["payout_dedupe_key"]),
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=insurance_payout_event,
                correlation_id=self.correlation_id,
            )
        if consignment_payload is not None:
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="traceability.consignment.updated",
                command_name=envelope.command_name,
                status=str(consignment_payload["status"]),
                reason_code=None,
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=consignment_payload,
                correlation_id=self.correlation_id,
            )
        if traceability_event is not None:
            self.outbox.enqueue(
                aggregate_type="traceability_event",
                aggregate_id=str(traceability_event["trace_event_id"]),
                event_type="traceability.event.appended",
                payload=traceability_event,
            )
            self.audit_repository.record_event(
                request_id=str(envelope.metadata.request_id),
                actor_id=auth_context.actor_subject,
                event_type="traceability.event.appended",
                command_name=envelope.command_name,
                status=str(traceability_event["milestone"]),
                reason_code=None,
                schema_version=envelope.metadata.schema_version,
                idempotency_key=envelope.metadata.idempotency_key,
                payload=traceability_event,
                correlation_id=self.correlation_id,
            )
            self.telemetry.record_traceability_event(
                trace_event_id=str(traceability_event["trace_event_id"]),
                consignment_id=str(traceability_event["consignment_id"]),
                milestone=str(traceability_event["milestone"]),
                attachment_ready=bool(result.get("attachment_ready", False)),
                correlation_id=self.correlation_id,
            )
        return CommandResultEnvelope(
            status="accepted",
            request_id=envelope.metadata.request_id,
            idempotency_key=envelope.metadata.idempotency_key,
            result=result,
            audit_event_id=audit_event.id,
            replayed=False,
        )

    def _reject(
        self,
        *,
        status_code: int,
        error_code: str,
        reason_code: str,
        envelope: CommandEnvelope,
        actor_id: str | None,
        extra_payload: dict[str, object] | None = None,
    ) -> None:
        audit_event = self.audit_repository.record_event(
            request_id=str(envelope.metadata.request_id),
            actor_id=actor_id,
            event_type="command.rejected",
            command_name=envelope.command_name,
            status="rejected",
            reason_code=reason_code,
            schema_version=envelope.metadata.schema_version,
            idempotency_key=envelope.metadata.idempotency_key,
            payload={**envelope.payload, **(extra_payload or {})},
            correlation_id=self.correlation_id,
        )
        self.session.flush()
        raise CommandRejectedError(
            status_code=status_code,
            error_code=error_code,
            reason_code=reason_code,
            payload={"audit_event_id": audit_event.id},
        )
