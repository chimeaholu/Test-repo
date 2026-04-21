from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.finance import (
    FinanceDecisionRecord,
    FinanceRequestRecord,
    InsuranceEvaluationRecord,
    InsurancePayoutEventRecord,
    InsuranceTriggerRecord,
)


class FinanceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_request(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        channel: str,
        correlation_id: str,
        case_reference: str,
        product_type: str,
        requested_amount: float,
        currency: str,
        partner_id: str,
        partner_reference_id: str | None,
        responsibility_boundary: dict[str, object],
        policy_context: dict[str, object],
        transcript_entries: list[dict[str, object]],
        status: str,
    ) -> FinanceRequestRecord:
        record = FinanceRequestRecord(
            finance_request_id=f"finance-{uuid4().hex[:12]}",
            request_id=request_id,
            idempotency_key=idempotency_key,
            actor_id=actor_id,
            actor_role=actor_role,
            country_code=country_code,
            channel=channel,
            correlation_id=correlation_id,
            case_reference=case_reference,
            product_type=product_type,
            requested_amount=requested_amount,
            currency=currency,
            partner_id=partner_id,
            partner_reference_id=partner_reference_id,
            status=status,
            responsibility_boundary=responsibility_boundary,
            policy_context=policy_context,
            transcript_entries=transcript_entries,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_request(self, *, finance_request_id: str) -> FinanceRequestRecord | None:
        statement = select(FinanceRequestRecord).where(
            FinanceRequestRecord.finance_request_id == finance_request_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_request_status(self, *, record: FinanceRequestRecord, status: str) -> FinanceRequestRecord:
        record.status = status
        self.session.flush()
        return record

    def create_decision(
        self,
        *,
        finance_request_id: str,
        request_id: str,
        actor_id: str,
        actor_role: str,
        decision_source: str,
        outcome: str,
        reason_code: str,
        note: str | None,
        partner_reference_id: str | None,
        responsibility_boundary: dict[str, object],
        policy_context: dict[str, object],
        transcript_link: str | None,
    ) -> FinanceDecisionRecord:
        decision = FinanceDecisionRecord(
            decision_id=f"decision-{uuid4().hex[:12]}",
            finance_request_id=finance_request_id,
            request_id=request_id,
            actor_id=actor_id,
            actor_role=actor_role,
            decision_source=decision_source,
            outcome=outcome,
            reason_code=reason_code,
            note=note,
            partner_reference_id=partner_reference_id,
            responsibility_boundary=responsibility_boundary,
            policy_context=policy_context,
            transcript_link=transcript_link,
        )
        self.session.add(decision)
        self.session.flush()
        return decision

    def list_decisions(self, *, finance_request_id: str) -> list[FinanceDecisionRecord]:
        statement = (
            select(FinanceDecisionRecord)
            .where(FinanceDecisionRecord.finance_request_id == finance_request_id)
            .order_by(FinanceDecisionRecord.created_at.asc(), FinanceDecisionRecord.id.asc())
        )
        return list(self.session.execute(statement).scalars().all())

    def upsert_trigger(
        self,
        *,
        trigger_id: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        partner_id: str,
        partner_reference_id: str | None,
        product_code: str,
        climate_signal: str,
        comparator: str,
        threshold_value: float,
        threshold_unit: str,
        evaluation_window_hours: int,
        threshold_source_id: str,
        threshold_source_type: str,
        threshold_source_reference: dict[str, object],
        payout_amount: float,
        payout_currency: str,
        policy_context: dict[str, object],
    ) -> InsuranceTriggerRecord:
        statement = select(InsuranceTriggerRecord).where(InsuranceTriggerRecord.trigger_id == trigger_id)
        record = self.session.execute(statement).scalar_one_or_none()
        if record is None:
            record = InsuranceTriggerRecord(
                trigger_id=trigger_id,
                actor_id=actor_id,
                actor_role=actor_role,
                country_code=country_code,
                partner_id=partner_id,
                partner_reference_id=partner_reference_id,
                product_code=product_code,
                climate_signal=climate_signal,
                comparator=comparator,
                threshold_value=threshold_value,
                threshold_unit=threshold_unit,
                evaluation_window_hours=evaluation_window_hours,
                threshold_source_id=threshold_source_id,
                threshold_source_type=threshold_source_type,
                threshold_source_reference=threshold_source_reference,
                payout_amount=payout_amount,
                payout_currency=payout_currency,
                policy_context=policy_context,
            )
            self.session.add(record)
            self.session.flush()
            return record

        record.actor_id = actor_id
        record.actor_role = actor_role
        record.country_code = country_code
        record.partner_id = partner_id
        record.partner_reference_id = partner_reference_id
        record.product_code = product_code
        record.climate_signal = climate_signal
        record.comparator = comparator
        record.threshold_value = threshold_value
        record.threshold_unit = threshold_unit
        record.evaluation_window_hours = evaluation_window_hours
        record.threshold_source_id = threshold_source_id
        record.threshold_source_type = threshold_source_type
        record.threshold_source_reference = threshold_source_reference
        record.payout_amount = payout_amount
        record.payout_currency = payout_currency
        record.policy_context = policy_context
        self.session.flush()
        return record

    def find_payout_event(self, *, payout_dedupe_key: str) -> InsurancePayoutEventRecord | None:
        statement = select(InsurancePayoutEventRecord).where(
            InsurancePayoutEventRecord.payout_dedupe_key == payout_dedupe_key
        )
        return self.session.execute(statement).scalar_one_or_none()

    def record_evaluation(
        self,
        *,
        trigger: InsuranceTriggerRecord,
        request_id: str,
        idempotency_key: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        source_event_id: str,
        source_observation_id: str | None,
        observed_value: float,
        payout_dedupe_key: str,
        climate_source_reference: dict[str, object],
        partner_reference_id: str | None,
        evaluation_state: str,
        triggered: bool,
        payout_event_id: str | None = None,
    ) -> InsuranceEvaluationRecord:
        record = InsuranceEvaluationRecord(
            evaluation_id=f"evaluation-{uuid4().hex[:12]}",
            trigger_id=trigger.trigger_id,
            request_id=request_id,
            idempotency_key=idempotency_key,
            actor_id=actor_id,
            actor_role=actor_role,
            country_code=country_code,
            source_event_id=source_event_id,
            source_observation_id=source_observation_id,
            observed_value=observed_value,
            threshold_value=trigger.threshold_value,
            evaluation_state=evaluation_state,
            triggered=triggered,
            payout_dedupe_key=payout_dedupe_key,
            partner_reference_id=partner_reference_id,
            climate_source_reference=climate_source_reference,
            payout_event_id=payout_event_id,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def create_payout_event(
        self,
        *,
        trigger: InsuranceTriggerRecord,
        evaluation_id: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        partner_reference_id: str | None,
        payout_dedupe_key: str,
        climate_source_reference: dict[str, object],
    ) -> InsurancePayoutEventRecord:
        record = InsurancePayoutEventRecord(
            payout_event_id=f"payout-{uuid4().hex[:12]}",
            trigger_id=trigger.trigger_id,
            evaluation_id=evaluation_id,
            actor_id=actor_id,
            actor_role=actor_role,
            country_code=country_code,
            partner_id=trigger.partner_id,
            partner_reference_id=partner_reference_id,
            payout_dedupe_key=payout_dedupe_key,
            payout_amount=trigger.payout_amount,
            payout_currency=trigger.payout_currency,
            climate_source_reference=climate_source_reference,
        )
        self.session.add(record)
        self.session.flush()
        return record
