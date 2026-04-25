from datetime import UTC, datetime
from typing import TypedDict
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.auth import AuthContext
from app.db.models.advisory import AdvisoryRequestRecord, ReviewerDecisionRecord
from app.db.models.climate import ClimateAlert, ClimateObservation, FarmProfile, MrvEvidenceRecord
from app.db.models.fund import FundingOpportunity, Investment
from app.db.models.ledger import EscrowRecord
from app.db.models.marketplace import (
    Listing,
    ListingRevision,
    NegotiationMessage,
    NegotiationThread,
)
from app.db.repositories.advisory import AdvisoryRepository
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.fund import FundRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.marketplace import MarketplaceRepository, NegotiationCheckpointProjection
from app.modules.advisory.runtime import AdvisoryRuntime
from app.modules.fund.runtime import FundRuntime
from app.db.repositories.workflow import WorkflowRepository
from app.services.commands.contracts import CommandEnvelope, validate_contract_payload
from app.services.commands.errors import CommandRejectedError


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat().replace("+00:00", "Z")


class _AlertCandidate(TypedDict):
    alert_type: str
    severity: str
    precedence_rank: int
    headline: str
    detail: str
    source_confidence: str


def _listing_to_payload(listing: Listing, schema_version: str) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "listing_id": listing.listing_id,
        "actor_id": listing.actor_id,
        "country_code": listing.country_code,
        "title": listing.title,
        "commodity": listing.commodity,
        "quantity_tons": listing.quantity_tons,
        "price_amount": listing.price_amount,
        "price_currency": listing.price_currency,
        "location": listing.location,
        "summary": listing.summary,
        "status": listing.status,
        "revision_number": listing.revision_number,
        "published_revision_number": listing.published_revision_number,
        "revision_count": listing.revision_count,
        "has_unpublished_changes": listing.published_revision_number != listing.revision_number,
        "view_scope": "owner",
        "published_at": listing.published_at.isoformat() if listing.published_at else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
    }


def _revision_to_payload(revision: ListingRevision, schema_version: str) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "listing_id": revision.listing_id,
        "revision_number": revision.revision_number,
        "change_type": revision.change_type,
        "actor_id": revision.actor_id,
        "country_code": revision.country_code,
        "status": revision.status,
        "title": revision.title,
        "commodity": revision.commodity,
        "quantity_tons": revision.quantity_tons,
        "price_amount": revision.price_amount,
        "price_currency": revision.price_currency,
        "location": revision.location,
        "summary": revision.summary,
        "changed_at": revision.changed_at.isoformat(),
    }


def _message_to_payload(message: NegotiationMessage, schema_version: str) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "actor_id": message.actor_id,
        "action": message.action,
        "amount": message.amount,
        "currency": message.currency,
        "note": message.note,
        "created_at": message.created_at.isoformat(),
    }


def _thread_to_payload(
    thread: NegotiationThread,
    schema_version: str,
    messages: list[NegotiationMessage],
    confirmation_checkpoint: NegotiationCheckpointProjection | None,
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "thread_id": thread.thread_id,
        "listing_id": thread.listing_id,
        "seller_actor_id": thread.seller_actor_id,
        "buyer_actor_id": thread.buyer_actor_id,
        "country_code": thread.country_code,
        "status": thread.status,
        "current_offer_amount": thread.current_offer_amount,
        "current_offer_currency": thread.current_offer_currency,
        "last_action_at": thread.last_action_at.isoformat(),
        "created_at": thread.created_at.isoformat(),
        "updated_at": thread.updated_at.isoformat(),
        "confirmation_checkpoint": (
            {
                "requested_by_actor_id": confirmation_checkpoint.requested_by_actor_id,
                "required_confirmer_actor_id": confirmation_checkpoint.required_confirmer_actor_id,
                "requested_at": confirmation_checkpoint.requested_at.isoformat(),
                "note": confirmation_checkpoint.note,
            }
            if confirmation_checkpoint is not None
            else None
        ),
        "messages": [_message_to_payload(message, schema_version) for message in messages],
    }


def _wallet_balance_to_payload(balance) -> dict[str, object]:
    return {
        "schema_version": balance.schema_version if hasattr(balance, "schema_version") else None,
        "wallet_id": balance.wallet_id,
        "wallet_actor_id": balance.wallet_actor_id,
        "country_code": balance.country_code,
        "currency": balance.currency,
        "available_balance": balance.available_balance,
        "held_balance": balance.held_balance,
        "total_balance": balance.total_balance,
        "balance_version": balance.balance_version,
        "last_entry_sequence": balance.last_entry_sequence,
        "last_reconciliation_marker": balance.last_reconciliation_marker,
        "updated_at": _isoformat(balance.updated_at),
    }


def _opportunity_to_payload(opportunity: FundingOpportunity, schema_version: str) -> dict[str, object]:
    percent_funded = (
        round(min(100.0, (opportunity.current_amount / opportunity.funding_goal) * 100), 2)
        if opportunity.funding_goal > 0
        else 0.0
    )
    return {
        "schema_version": schema_version,
        "opportunity_id": opportunity.opportunity_id,
        "farm_id": opportunity.farm_id,
        "actor_id": opportunity.actor_id,
        "country_code": opportunity.country_code,
        "currency": opportunity.currency,
        "title": opportunity.title,
        "description": opportunity.description,
        "funding_goal": opportunity.funding_goal,
        "current_amount": opportunity.current_amount,
        "expected_return_pct": opportunity.expected_return_pct,
        "timeline_months": opportunity.timeline_months,
        "status": opportunity.status,
        "min_investment": opportunity.min_investment,
        "max_investment": opportunity.max_investment,
        "percent_funded": percent_funded,
        "remaining_amount": round(max(0.0, opportunity.funding_goal - opportunity.current_amount), 2),
        "created_at": _isoformat(opportunity.created_at),
        "updated_at": _isoformat(opportunity.updated_at),
    }


def _investment_to_payload(
    investment: Investment,
    schema_version: str,
    opportunity: FundingOpportunity | None = None,
) -> dict[str, object]:
    penalty_amount = (
        round(investment.amount - investment.actual_return_amount, 2)
        if investment.actual_return_amount is not None
        else 0.0
    )
    expected_return_amount = (
        round(investment.amount * (1 + (opportunity.expected_return_pct / 100)), 2)
        if opportunity is not None
        else None
    )
    return {
        "schema_version": schema_version,
        "investment_id": investment.investment_id,
        "opportunity_id": investment.opportunity_id,
        "investor_actor_id": investment.investor_actor_id,
        "country_code": investment.country_code,
        "amount": investment.amount,
        "currency": investment.currency,
        "status": investment.status,
        "invested_at": _isoformat(investment.invested_at),
        "expected_return_date": _isoformat(investment.expected_return_date),
        "actual_return_amount": investment.actual_return_amount,
        "penalty_amount": penalty_amount,
        "expected_return_amount": expected_return_amount,
        "updated_at": _isoformat(investment.updated_at),
        "opportunity": (
            _opportunity_to_payload(opportunity, schema_version) if opportunity is not None else None
        ),
    }


def _farm_profile_to_payload(profile: FarmProfile, schema_version: str) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "farm_id": profile.farm_id,
        "actor_id": profile.actor_id,
        "country_code": profile.country_code,
        "farm_name": profile.farm_name,
        "district": profile.district,
        "crop_type": profile.crop_type,
        "hectares": profile.hectares,
        "latitude": profile.latitude,
        "longitude": profile.longitude,
        "metadata": profile.metadata_json,
        "created_at": _isoformat(profile.created_at),
        "updated_at": _isoformat(profile.updated_at),
    }


def _observation_to_payload(
    observation: ClimateObservation, schema_version: str, farm_profile: FarmProfile | None
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "observation_id": observation.observation_id,
        "farm_id": observation.farm_id,
        "actor_id": observation.actor_id,
        "country_code": observation.country_code,
        "source_id": observation.source_id,
        "source_type": observation.source_type,
        "observed_at": _isoformat(observation.observed_at),
        "source_window_start": _isoformat(observation.source_window_start),
        "source_window_end": _isoformat(observation.source_window_end),
        "rainfall_mm": observation.rainfall_mm,
        "temperature_c": observation.temperature_c,
        "soil_moisture_pct": observation.soil_moisture_pct,
        "anomaly_score": observation.anomaly_score,
        "ingestion_state": observation.ingestion_state,
        "degraded_mode": observation.degraded_mode,
        "degraded_reason_codes": observation.degraded_reason_codes,
        "assumptions": observation.assumptions,
        "provenance": observation.provenance,
        "normalized_payload": observation.normalized_payload,
        "farm_profile": (
            _farm_profile_to_payload(farm_profile, schema_version) if farm_profile is not None else None
        ),
        "created_at": _isoformat(observation.created_at),
    }


def _alert_to_payload(
    alert: ClimateAlert, schema_version: str, farm_profile: FarmProfile | None
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "alert_id": alert.alert_id,
        "farm_id": alert.farm_id,
        "actor_id": alert.actor_id,
        "country_code": alert.country_code,
        "observation_id": alert.observation_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "precedence_rank": alert.precedence_rank,
        "headline": alert.headline,
        "detail": alert.detail,
        "status": alert.status,
        "source_confidence": alert.source_confidence,
        "degraded_mode": alert.degraded_mode,
        "degraded_reason_codes": alert.degraded_reason_codes,
        "farm_context": alert.farm_context,
        "farm_profile": (
            _farm_profile_to_payload(farm_profile, schema_version) if farm_profile is not None else None
        ),
        "acknowledged_at": _isoformat(alert.acknowledged_at),
        "acknowledged_by_actor_id": alert.acknowledged_by_actor_id,
        "acknowledgement_note": alert.acknowledgement_note,
        "created_at": _isoformat(alert.created_at),
        "updated_at": _isoformat(alert.updated_at),
    }


def _mrv_evidence_to_payload(
    record: MrvEvidenceRecord, schema_version: str, farm_profile: FarmProfile | None
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "evidence_id": record.evidence_id,
        "farm_id": record.farm_id,
        "actor_id": record.actor_id,
        "country_code": record.country_code,
        "evidence_type": record.evidence_type,
        "method_tag": record.method_tag,
        "method_references": record.method_references,
        "source_window_start": _isoformat(record.source_window_start),
        "source_window_end": _isoformat(record.source_window_end),
        "source_observation_ids": record.source_observation_ids,
        "alert_ids": record.alert_ids,
        "assumptions": record.assumptions,
        "provenance": record.provenance,
        "source_completeness_state": record.source_completeness_state,
        "degraded_mode": record.degraded_mode,
        "degraded_reason_codes": record.degraded_reason_codes,
        "summary": record.summary,
        "farm_profile": (
            _farm_profile_to_payload(farm_profile, schema_version) if farm_profile is not None else None
        ),
        "created_at": _isoformat(record.created_at),
    }


def _reviewer_decision_to_payload(
    decision: ReviewerDecisionRecord, schema_version: str
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "advisory_request_id": decision.advisory_request_id,
        "decision_id": decision.decision_id,
        "actor_id": decision.actor_id,
        "actor_role": decision.actor_role,
        "outcome": decision.outcome,
        "reason_code": decision.reason_code,
        "note": decision.note,
        "transcript_link": decision.transcript_link,
        "policy_context": decision.policy_context,
        "created_at": _isoformat(decision.created_at),
    }


def _advisory_request_to_payload(
    advisory_request: AdvisoryRequestRecord,
    *,
    schema_version: str,
    citations: list[dict[str, object]],
    reviewer_decision: ReviewerDecisionRecord,
) -> dict[str, object]:
    return {
        "schema_version": schema_version,
        "advisory_request_id": advisory_request.advisory_request_id,
        "advisory_conversation_id": advisory_request.advisory_conversation_id,
        "actor_id": advisory_request.actor_id,
        "country_code": advisory_request.country_code,
        "locale": advisory_request.locale,
        "topic": advisory_request.topic,
        "question_text": advisory_request.question_text,
        "response_text": advisory_request.response_text,
        "status": advisory_request.status,
        "confidence_band": advisory_request.confidence_band,
        "confidence_score": advisory_request.confidence_score,
        "grounded": advisory_request.grounded,
        "citations": citations,
        "transcript_entries": advisory_request.transcript_entries,
        "reviewer_decision": _reviewer_decision_to_payload(reviewer_decision, schema_version),
        "source_ids": advisory_request.source_ids,
        "model_name": advisory_request.model_name,
        "model_version": advisory_request.model_version,
        "correlation_id": advisory_request.correlation_id,
        "request_id": advisory_request.request_id,
        "delivered_at": _isoformat(advisory_request.delivered_at),
        "created_at": _isoformat(advisory_request.created_at),
    }


class WorkflowCommandHandler:
    def __init__(
        self,
        session: Session,
        workflow_repository: WorkflowRepository,
        marketplace_repository: MarketplaceRepository,
        ledger_repository: LedgerRepository,
        escrow_repository: EscrowRepository,
        fund_repository: FundRepository,
        advisory_repository: AdvisoryRepository,
    ) -> None:
        self.session = session
        self.workflow_repository = workflow_repository
        self.marketplace_repository = marketplace_repository
        self.ledger_repository = ledger_repository
        self.escrow_repository = escrow_repository
        self.fund_repository = fund_repository
        self.climate_repository = ClimateRepository(session)
        self.advisory_runtime = AdvisoryRuntime(advisory_repository)
        self.fund_runtime = FundRuntime(fund_repository, ledger_repository)

    @staticmethod
    def _ensure_open_thread(thread: NegotiationThread, *, thread_id: str) -> None:
        if thread.status in {"accepted", "rejected"}:
            raise CommandRejectedError(
                status_code=409,
                error_code="thread_closed",
                reason_code="thread_closed",
                payload={"thread_id": thread_id},
            )
        if thread.status != "open":
            raise CommandRejectedError(
                status_code=409,
                error_code="thread_pending_confirmation",
                reason_code="thread_pending_confirmation",
                payload={"thread_id": thread_id},
            )

    @staticmethod
    def _participant_ids(thread: NegotiationThread) -> set[str]:
        return {thread.seller_actor_id, thread.buyer_actor_id}

    @staticmethod
    def _participant_ids_for_escrow(escrow: EscrowRecord) -> set[str]:
        return {escrow.seller_actor_id, escrow.buyer_actor_id}

    @staticmethod
    def _listing_seed_value(source: str) -> int:
        return sum(ord(char) * (index + 1) for index, char in enumerate(source))

    @classmethod
    def _fund_terms_for_listing(cls, listing: Listing) -> dict[str, float | int]:
        seed = cls._listing_seed_value(f"{listing.listing_id}-{listing.title}")
        funding_goal = max(1800.0, round(listing.quantity_tons * listing.price_amount * 2.4, 2))
        expected_return_pct = float(12 + (seed % 7))
        timeline_months = 6 + (seed % 4) * 3
        min_investment = max(100.0, round(funding_goal * 0.05))
        max_investment = max(min_investment, round(funding_goal * 0.35))
        return {
            "expected_return_pct": expected_return_pct,
            "funding_goal": funding_goal,
            "max_investment": max_investment,
            "min_investment": min_investment,
            "timeline_months": timeline_months,
        }

    def _ensure_listing_fund_opportunity(
        self,
        *,
        auth_context: AuthContext,
        listing: Listing,
    ) -> FundingOpportunity | None:
        if auth_context.role not in {"farmer", "cooperative", "admin"}:
            return None

        existing = self.fund_repository.get_opportunity_for_farm(
            farm_id=listing.listing_id,
            actor_id=listing.actor_id,
            country_code=listing.country_code,
        )
        if existing is not None:
            return existing

        terms = self._fund_terms_for_listing(listing)
        return self.fund_runtime.create_opportunity(
            actor_id=listing.actor_id,
            actor_role=auth_context.role,
            country_code=listing.country_code,
            farm_id=listing.listing_id,
            currency=listing.price_currency,
            title=listing.title,
            description=listing.summary,
            funding_goal=float(terms["funding_goal"]),
            expected_return_pct=float(terms["expected_return_pct"]),
            timeline_months=int(terms["timeline_months"]),
            min_investment=float(terms["min_investment"]),
            max_investment=float(terms["max_investment"]),
        )

    @staticmethod
    def _settlement_notification_payload(
        *,
        envelope: CommandEnvelope,
        escrow: EscrowRecord,
        recipient_actor_id: str,
        state: str,
        delivery_state: str,
        message_key: str,
        fallback_channel: str | None = None,
        fallback_reason: str | None = None,
    ) -> dict[str, object]:
        return {
            "schema_version": envelope.metadata.schema_version,
            "escrow_id": escrow.escrow_id,
            "settlement_state": state,
            "recipient_actor_id": recipient_actor_id,
            "channel": "push",
            "channel_origin": envelope.metadata.channel,
            "delivery_state": delivery_state,
            "fallback_channel": fallback_channel,
            "fallback_reason": fallback_reason,
            "message_key": message_key,
            "correlation_id": envelope.metadata.correlation_id,
            "created_at": _isoformat(datetime.now(tz=UTC)),
        }

    def _timeline_to_payload(self, *, escrow: EscrowRecord) -> list[dict[str, object]]:
        return [
            {
                "schema_version": "unused",
                "escrow_id": item.escrow_id,
                "transition": item.transition,
                "state": item.state,
                "actor_id": item.actor_id,
                "note": item.note,
                "request_id": item.request_id,
                "idempotency_key": item.idempotency_key,
                "correlation_id": item.correlation_id,
                "created_at": _isoformat(item.created_at),
                "notification": item.notification_payload,
            }
            for item in self.escrow_repository.list_timeline(escrow_id=escrow.escrow_id)
        ]

    def _escrow_to_payload(
        self,
        *,
        escrow: EscrowRecord,
        schema_version: str,
    ) -> dict[str, object]:
        return {
            "schema_version": schema_version,
            "escrow_id": escrow.escrow_id,
            "thread_id": escrow.thread_id,
            "listing_id": escrow.listing_id,
            "buyer_actor_id": escrow.buyer_actor_id,
            "seller_actor_id": escrow.seller_actor_id,
            "country_code": escrow.country_code,
            "currency": escrow.currency,
            "amount": escrow.amount,
            "state": escrow.state,
            "partner_reference": escrow.partner_reference,
            "partner_reason_code": escrow.partner_reason_code,
            "funded_at": _isoformat(escrow.funded_at),
            "released_at": _isoformat(escrow.released_at),
            "reversed_at": _isoformat(escrow.reversed_at),
            "disputed_at": _isoformat(escrow.disputed_at),
            "created_at": _isoformat(escrow.created_at),
            "updated_at": _isoformat(escrow.updated_at),
            "timeline": [
                {**item, "schema_version": schema_version}
                for item in self._timeline_to_payload(escrow=escrow)
            ],
        }

    @staticmethod
    def _reject_for_state(*, escrow_id: str, reason_code: str) -> None:
        raise CommandRejectedError(
            status_code=409,
            error_code="invalid_escrow_state",
            reason_code=reason_code,
            payload={"escrow_id": escrow_id},
        )

    def _thread_result(
        self,
        *,
        envelope: CommandEnvelope,
        thread: NegotiationThread,
        transition: str,
    ) -> dict[str, object]:
        messages = self.marketplace_repository.list_negotiation_messages(thread_id=thread.thread_id)
        checkpoint_note = next(
            (
                message.note
                for message in reversed(messages)
                if message.action == "confirmation_requested"
            ),
            None,
        )
        confirmation_checkpoint = self.marketplace_repository.build_confirmation_checkpoint(
            thread=thread,
            note=checkpoint_note,
        )
        return {
            "thread": _thread_to_payload(
                thread,
                envelope.metadata.schema_version,
                messages,
                confirmation_checkpoint,
            ),
            "thread_transition": {
                "thread_id": thread.thread_id,
                "listing_id": thread.listing_id,
                "transition": transition,
                "status": thread.status,
            },
            "schema_version": envelope.metadata.schema_version,
        }

    @staticmethod
    def _normalize_observation_value(value: object | None) -> float | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return round(float(int(value)), 2)
        if isinstance(value, (int, float)):
            return round(float(value), 2)
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            return round(float(stripped), 2)
        raise CommandRejectedError(
            status_code=422,
            error_code="invalid_observation_payload",
            reason_code="observation_numeric_value_invalid",
            payload={},
        )

    @staticmethod
    def _dedupe_reason_codes(values: list[str]) -> list[str]:
        result: list[str] = []
        for item in values:
            if item not in result:
                result.append(item)
        return result

    def _build_alert_from_observation(
        self,
        *,
        observation: ClimateObservation,
        farm_profile: FarmProfile,
        schema_version: str,
    ) -> ClimateAlert:
        candidates: list[_AlertCandidate] = []
        if observation.degraded_mode:
            candidates.append(
                {
                    "alert_type": "source_gap",
                    "severity": "medium",
                    "precedence_rank": 40,
                    "headline": "Climate source window degraded",
                    "detail": "Source windows are incomplete or inconsistent. Treat this alert as advisory only until fresh data arrives.",
                    "source_confidence": "low",
                }
            )
        if observation.rainfall_mm is not None and observation.rainfall_mm >= 80:
            candidates.append(
                {
                    "alert_type": "flood_risk",
                    "severity": "critical",
                    "precedence_rank": 10,
                    "headline": f"Flood risk for {farm_profile.farm_name}",
                    "detail": "Rainfall intensity exceeds the farm-context flood threshold. Inspect drainage and field access immediately.",
                    "source_confidence": "medium" if observation.degraded_mode else "high",
                }
            )
        if (
            observation.temperature_c is not None
            and observation.temperature_c >= 35
            and not any(item["alert_type"] == "flood_risk" for item in candidates)
        ):
            candidates.append(
                {
                    "alert_type": "heat_stress",
                    "severity": "high",
                    "precedence_rank": 20,
                    "headline": f"Heat stress risk for {farm_profile.crop_type}",
                    "detail": "Observed temperature exceeds the crop heat threshold. Check irrigation and labor scheduling.",
                    "source_confidence": "medium" if observation.degraded_mode else "high",
                }
            )
        if (
            (
                observation.rainfall_mm is not None
                and observation.rainfall_mm < 15
                and observation.soil_moisture_pct is not None
                and observation.soil_moisture_pct < 20
            )
            or (observation.anomaly_score is not None and observation.anomaly_score >= 0.8)
        ):
            candidates.append(
                {
                    "alert_type": "drought_stress",
                    "severity": "critical",
                    "precedence_rank": 15,
                    "headline": f"Drought stress risk for {farm_profile.farm_name}",
                    "detail": "Low rainfall or anomaly pressure indicates crop stress in the current farm context.",
                    "source_confidence": "medium" if observation.degraded_mode else "high",
                }
            )
        if not candidates:
            candidates.append(
                {
                    "alert_type": "watch",
                    "severity": "low",
                    "precedence_rank": 50,
                    "headline": f"Climate watch for {farm_profile.farm_name}",
                    "detail": "Observation ingested successfully. Continue monitoring farm conditions for escalation.",
                    "source_confidence": "medium" if observation.degraded_mode else "high",
                }
            )

        selected = sorted(candidates, key=lambda item: item["precedence_rank"])[0]
        return self.climate_repository.create_alert(
            alert_id=f"alert-{uuid4().hex[:12]}",
            farm_id=observation.farm_id,
            actor_id=observation.actor_id,
            country_code=observation.country_code,
            observation_id=observation.observation_id,
            alert_type=str(selected["alert_type"]),
            severity=str(selected["severity"]),
            precedence_rank=selected["precedence_rank"],
            headline=str(selected["headline"]),
            detail=str(selected["detail"]),
            source_confidence=str(selected["source_confidence"]),
            degraded_mode=observation.degraded_mode,
            degraded_reason_codes=observation.degraded_reason_codes,
            farm_context={
                "farm_name": farm_profile.farm_name,
                "district": farm_profile.district,
                "crop_type": farm_profile.crop_type,
                "hectares": farm_profile.hectares,
            },
        )

    def handle(self, envelope: CommandEnvelope, auth_context: AuthContext) -> dict[str, object]:
        if envelope.command_name == "advisory.requests.submit":
            validate_contract_payload("advisory.advisory_request_input", envelope.payload)
            runtime_result = self.advisory_runtime.submit_request(
                request_id=str(envelope.metadata.request_id),
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                locale=str(envelope.payload["locale"]),
                channel=envelope.metadata.channel,
                correlation_id=envelope.metadata.correlation_id,
                topic=str(envelope.payload["topic"]),
                question_text=str(envelope.payload["question_text"]),
                transcript_entries=list(envelope.payload.get("transcript_entries", [])),
                policy_context=dict(envelope.payload.get("policy_context", {})),
            )
            response_payload = _advisory_request_to_payload(
                runtime_result.advisory_request,
                schema_version=envelope.metadata.schema_version,
                citations=runtime_result.citations,
                reviewer_decision=runtime_result.reviewer_decision,
            )
            return {
                "advisory_request": response_payload,
                "reviewer_decision": _reviewer_decision_to_payload(
                    runtime_result.reviewer_decision, envelope.metadata.schema_version
                ),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "advisory.reviewer.decide":
            validate_contract_payload("advisory.reviewer_decision_input", envelope.payload)
            runtime_result = self.advisory_runtime.apply_reviewer_decision(
                request_id=str(envelope.metadata.request_id),
                advisory_request_id=str(envelope.payload["advisory_request_id"]),
                actor_id=envelope.metadata.actor_id,
                actor_role=auth_context.role,
                outcome=str(envelope.payload["outcome"]),
                reason_code=str(envelope.payload["reason_code"]),
                note=(
                    str(envelope.payload["note"])
                    if envelope.payload.get("note") is not None
                    else None
                ),
                transcript_link=(
                    str(envelope.payload["transcript_link"])
                    if envelope.payload.get("transcript_link") is not None
                    else None
                ),
            )
            response_payload = _advisory_request_to_payload(
                runtime_result.advisory_request,
                schema_version=envelope.metadata.schema_version,
                citations=runtime_result.citations,
                reviewer_decision=runtime_result.reviewer_decision,
            )
            return {
                "advisory_request": response_payload,
                "reviewer_decision": _reviewer_decision_to_payload(
                    runtime_result.reviewer_decision, envelope.metadata.schema_version
                ),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "fund.opportunities.create":
            validate_contract_payload("finance.funding_opportunity_create_input", envelope.payload)
            opportunity = self.fund_runtime.create_opportunity(
                actor_id=envelope.metadata.actor_id,
                actor_role=auth_context.role,
                country_code=envelope.metadata.country_code,
                farm_id=str(envelope.payload["farm_id"]),
                currency=str(envelope.payload["currency"]),
                title=str(envelope.payload["title"]),
                description=str(envelope.payload["description"]),
                funding_goal=float(envelope.payload["funding_goal"]),
                expected_return_pct=float(envelope.payload["expected_return_pct"]),
                timeline_months=int(envelope.payload["timeline_months"]),
                min_investment=float(envelope.payload["min_investment"]),
                max_investment=float(envelope.payload["max_investment"]),
            )
            return {
                "opportunity": _opportunity_to_payload(opportunity, envelope.metadata.schema_version),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "fund.investments.create":
            validate_contract_payload("finance.investment_create_input", envelope.payload)
            runtime_result = self.fund_runtime.create_investment(
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                actor_id=envelope.metadata.actor_id,
                actor_role=auth_context.role,
                opportunity_id=str(envelope.payload["opportunity_id"]),
                amount=float(envelope.payload["amount"]),
                currency=str(envelope.payload["currency"]),
            )
            wallet_payload = _wallet_balance_to_payload(runtime_result.wallet_balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            return {
                "opportunity": _opportunity_to_payload(
                    runtime_result.opportunity, envelope.metadata.schema_version
                ),
                "investment": _investment_to_payload(
                    runtime_result.investment,
                    envelope.metadata.schema_version,
                    runtime_result.opportunity,
                ),
                "wallet": wallet_payload,
                "ledger_entry": {
                    "entry_id": runtime_result.ledger_entry.entry_id,
                    "wallet_id": runtime_result.ledger_entry.wallet_id,
                    "entry_sequence": runtime_result.ledger_entry.entry_sequence,
                    "balance_version": runtime_result.ledger_entry.balance_version,
                },
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "fund.investments.withdraw":
            validate_contract_payload("finance.investment_withdraw_input", envelope.payload)
            runtime_result = self.fund_runtime.withdraw_investment(
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                actor_id=envelope.metadata.actor_id,
                investment_id=str(envelope.payload["investment_id"]),
            )
            wallet_payload = _wallet_balance_to_payload(runtime_result.wallet_balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            return {
                "opportunity": _opportunity_to_payload(
                    runtime_result.opportunity, envelope.metadata.schema_version
                ),
                "investment": _investment_to_payload(
                    runtime_result.investment,
                    envelope.metadata.schema_version,
                    runtime_result.opportunity,
                ),
                "wallet": wallet_payload,
                "ledger_entry": {
                    "entry_id": runtime_result.ledger_entry.entry_id,
                    "wallet_id": runtime_result.ledger_entry.wallet_id,
                    "entry_sequence": runtime_result.ledger_entry.entry_sequence,
                    "balance_version": runtime_result.ledger_entry.balance_version,
                },
                "penalty_amount": runtime_result.penalty_amount,
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "wallets.fund":
            validate_contract_payload("ledger.wallet_funding_input", envelope.payload)
            wallet_actor_id = str(envelope.payload["wallet_actor_id"])
            if wallet_actor_id != envelope.metadata.actor_id and envelope.metadata.actor_id != "system:test":
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="wallet_actor_forbidden",
                    payload={"wallet_actor_id": wallet_actor_id},
                )
            entry = self.ledger_repository.append_entry(
                actor_id=wallet_actor_id,
                country_code=str(envelope.payload["country_code"]),
                currency=str(envelope.payload["currency"]),
                direction="credit",
                reason="wallet_funded",
                amount=float(envelope.payload["amount"]),
                available_delta=float(envelope.payload["amount"]),
                held_delta=0.0,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                reconciliation_marker=(
                    str(envelope.payload["reconciliation_marker"])
                    if envelope.payload.get("reconciliation_marker")
                    else None
                ),
                entry_metadata={
                    "reference_type": str(envelope.payload["reference_type"]),
                    "reference_id": str(envelope.payload["reference_id"]),
                },
            )
            balance = self.ledger_repository.get_wallet_balance(
                actor_id=wallet_actor_id,
                country_code=str(envelope.payload["country_code"]),
                currency=str(envelope.payload["currency"]),
            )
            wallet_payload = _wallet_balance_to_payload(balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            return {
                "wallet": wallet_payload,
                "ledger_entry": {
                    "entry_id": entry.entry_id,
                    "wallet_id": entry.wallet_id,
                    "entry_sequence": entry.entry_sequence,
                    "balance_version": entry.balance_version,
                },
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "market.listings.create":
            validate_contract_payload("marketplace.listing_create_input", envelope.payload)
            listing = self.marketplace_repository.create_listing(
                listing_id=f"listing-{uuid4().hex[:12]}",
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                title=str(envelope.payload["title"]),
                commodity=str(envelope.payload["commodity"]),
                quantity_tons=float(envelope.payload["quantity_tons"]),
                price_amount=float(envelope.payload["price_amount"]),
                price_currency=str(envelope.payload["price_currency"]),
                location=str(envelope.payload["location"]),
                summary=str(envelope.payload["summary"]),
            )
            return {
                "listing": _listing_to_payload(listing, envelope.metadata.schema_version),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "market.listings.update":
            validate_contract_payload("marketplace.listing_update_input", envelope.payload)
            listing_id = str(envelope.payload["listing_id"])
            existing_listing = self.marketplace_repository.find_listing(listing_id=listing_id)
            if existing_listing is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="listing_not_found",
                    reason_code="listing_not_found",
                    payload={"listing_id": listing_id},
                )
            if (
                existing_listing.actor_id != envelope.metadata.actor_id
                or existing_listing.country_code != envelope.metadata.country_code
            ):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="listing_edit_forbidden",
                    payload={"listing_id": listing_id},
                )

            updated_listing = self.marketplace_repository.update_listing(
                listing=existing_listing,
                title=str(envelope.payload["title"]),
                commodity=str(envelope.payload["commodity"]),
                quantity_tons=float(envelope.payload["quantity_tons"]),
                price_amount=float(envelope.payload["price_amount"]),
                price_currency=str(envelope.payload["price_currency"]),
                location=str(envelope.payload["location"]),
                summary=str(envelope.payload["summary"]),
            )
            return {
                "listing": _listing_to_payload(updated_listing, envelope.metadata.schema_version),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "market.listings.publish":
            validate_contract_payload("marketplace.listing_publish_input", envelope.payload)
            listing_id = str(envelope.payload["listing_id"])
            existing_listing = self.marketplace_repository.find_listing(listing_id=listing_id)
            if existing_listing is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="listing_not_found",
                    reason_code="listing_not_found",
                    payload={"listing_id": listing_id},
                )
            if (
                existing_listing.actor_id != envelope.metadata.actor_id
                or existing_listing.country_code != envelope.metadata.country_code
            ):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="listing_publish_forbidden",
                    payload={"listing_id": listing_id},
                )
            if (
                existing_listing.status == "published"
                and existing_listing.published_revision_number == existing_listing.revision_number
            ):
                raise CommandRejectedError(
                    status_code=409,
                    error_code="listing_already_published",
                    reason_code="listing_already_published",
                    payload={"listing_id": listing_id},
                )

            published_listing = self.marketplace_repository.publish_listing(listing=existing_listing)
            self._ensure_listing_fund_opportunity(
                auth_context=auth_context,
                listing=published_listing,
            )
            latest_revision = self.marketplace_repository.list_revisions(listing_id=listing_id)[0]
            return {
                "listing": _listing_to_payload(published_listing, envelope.metadata.schema_version),
                "revision_summary": _revision_to_payload(
                    latest_revision, envelope.metadata.schema_version
                ),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "market.listings.unpublish":
            validate_contract_payload("marketplace.listing_unpublish_input", envelope.payload)
            listing_id = str(envelope.payload["listing_id"])
            existing_listing = self.marketplace_repository.find_listing(listing_id=listing_id)
            if existing_listing is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="listing_not_found",
                    reason_code="listing_not_found",
                    payload={"listing_id": listing_id},
                )
            if (
                existing_listing.actor_id != envelope.metadata.actor_id
                or existing_listing.country_code != envelope.metadata.country_code
            ):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="listing_publish_forbidden",
                    payload={"listing_id": listing_id},
                )
            if existing_listing.published_revision_number is None:
                raise CommandRejectedError(
                    status_code=409,
                    error_code="listing_already_unpublished",
                    reason_code="listing_already_unpublished",
                    payload={"listing_id": listing_id},
                )

            unpublished_listing = self.marketplace_repository.unpublish_listing(listing=existing_listing)
            latest_revision = self.marketplace_repository.list_revisions(listing_id=listing_id)[0]
            return {
                "listing": _listing_to_payload(unpublished_listing, envelope.metadata.schema_version),
                "revision_summary": _revision_to_payload(
                    latest_revision, envelope.metadata.schema_version
                ),
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "market.negotiations.create":
            validate_contract_payload("negotiation.negotiation_create_input", envelope.payload)
            listing_id = str(envelope.payload["listing_id"])
            listing_for_thread = self.marketplace_repository.get_published_listing(
                listing_id=listing_id,
                country_code=envelope.metadata.country_code,
            )
            if listing_for_thread is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="listing_not_found",
                    reason_code="listing_not_found",
                    payload={"listing_id": listing_id},
                )
            if listing_for_thread.actor_id == envelope.metadata.actor_id:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="negotiation_actor_forbidden",
                    payload={"listing_id": listing_id},
                )
            thread = self.marketplace_repository.create_negotiation_thread(
                thread_id=f"thread-{uuid4().hex[:12]}",
                listing_id=listing_id,
                seller_actor_id=listing_for_thread.actor_id,
                buyer_actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                offer_amount=float(envelope.payload["offer_amount"]),
                offer_currency=str(envelope.payload["offer_currency"]),
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                actor_id=envelope.metadata.actor_id,
            )
            return self._thread_result(envelope=envelope, thread=thread, transition="offer_created")

        if envelope.command_name == "market.negotiations.counter":
            validate_contract_payload("negotiation.negotiation_counter_input", envelope.payload)
            thread_id = str(envelope.payload["thread_id"])
            thread_record = self.marketplace_repository.get_negotiation_thread(thread_id=thread_id)
            if thread_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="thread_not_found",
                    reason_code="thread_not_found",
                    payload={"thread_id": thread_id},
                )
            if (
                thread_record.seller_actor_id != envelope.metadata.actor_id
                or thread_record.country_code != envelope.metadata.country_code
            ):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="thread_access_forbidden",
                    payload={"thread_id": thread_id},
                )
            self._ensure_open_thread(thread_record, thread_id=thread_id)
            thread = self.marketplace_repository.update_negotiation_thread(
                thread=thread_record,
                status="open",
                actor_id=envelope.metadata.actor_id,
                action="offer_countered",
                amount=float(envelope.payload["offer_amount"]),
                currency=str(envelope.payload["offer_currency"]),
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
            )
            return self._thread_result(envelope=envelope, thread=thread, transition="offer_countered")

        if envelope.command_name == "market.negotiations.confirm.request":
            validate_contract_payload(
                "negotiation.negotiation_confirmation_request_input", envelope.payload
            )
            thread_id = str(envelope.payload["thread_id"])
            thread_record = self.marketplace_repository.get_negotiation_thread(thread_id=thread_id)
            if thread_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="thread_not_found",
                    reason_code="thread_not_found",
                    payload={"thread_id": thread_id},
                )
            if (
                envelope.metadata.actor_id not in self._participant_ids(thread_record)
                or thread_record.country_code != envelope.metadata.country_code
            ):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="thread_access_forbidden",
                    payload={"thread_id": thread_id},
                )
            self._ensure_open_thread(thread_record, thread_id=thread_id)
            required_confirmer_actor_id = str(envelope.payload["required_confirmer_actor_id"])
            if required_confirmer_actor_id not in self._participant_ids(thread_record):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="unauthorized_confirmer",
                    payload={"thread_id": thread_id},
                )
            if required_confirmer_actor_id == envelope.metadata.actor_id:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="self_confirmation_forbidden",
                    payload={"thread_id": thread_id},
                )
            thread = self.marketplace_repository.update_negotiation_thread(
                thread=thread_record,
                status="pending_confirmation",
                actor_id=envelope.metadata.actor_id,
                action="confirmation_requested",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                confirmation_requested_by_actor_id=envelope.metadata.actor_id,
                required_confirmer_actor_id=required_confirmer_actor_id,
            )
            return self._thread_result(
                envelope=envelope, thread=thread, transition="confirmation_requested"
            )

        if envelope.command_name == "market.negotiations.confirm.approve":
            validate_contract_payload(
                "negotiation.negotiation_confirmation_approve_input", envelope.payload
            )
            thread_id = str(envelope.payload["thread_id"])
            thread_record = self.marketplace_repository.get_negotiation_thread(thread_id=thread_id)
            if thread_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="thread_not_found",
                    reason_code="thread_not_found",
                    payload={"thread_id": thread_id},
                )
            if thread_record.country_code != envelope.metadata.country_code:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="thread_access_forbidden",
                    payload={"thread_id": thread_id},
                )
            if thread_record.status != "pending_confirmation":
                raise CommandRejectedError(
                    status_code=409,
                    error_code="confirmation_checkpoint_missing",
                    reason_code="confirmation_checkpoint_missing",
                    payload={"thread_id": thread_id},
                )
            if thread_record.required_confirmer_actor_id != envelope.metadata.actor_id:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="unauthorized_confirmer",
                    payload={"thread_id": thread_id},
                )
            thread = self.marketplace_repository.update_negotiation_thread(
                thread=thread_record,
                status="accepted",
                actor_id=envelope.metadata.actor_id,
                action="confirmation_approved",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                clear_confirmation_checkpoint=True,
            )
            return self._thread_result(
                envelope=envelope, thread=thread, transition="confirmation_approved"
            )

        if envelope.command_name == "market.negotiations.confirm.reject":
            validate_contract_payload(
                "negotiation.negotiation_confirmation_reject_input", envelope.payload
            )
            thread_id = str(envelope.payload["thread_id"])
            thread_record = self.marketplace_repository.get_negotiation_thread(thread_id=thread_id)
            if thread_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="thread_not_found",
                    reason_code="thread_not_found",
                    payload={"thread_id": thread_id},
                )
            if thread_record.country_code != envelope.metadata.country_code:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="thread_access_forbidden",
                    payload={"thread_id": thread_id},
                )
            if thread_record.status != "pending_confirmation":
                raise CommandRejectedError(
                    status_code=409,
                    error_code="confirmation_checkpoint_missing",
                    reason_code="confirmation_checkpoint_missing",
                    payload={"thread_id": thread_id},
                )
            if thread_record.required_confirmer_actor_id != envelope.metadata.actor_id:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="unauthorized_confirmer",
                    payload={"thread_id": thread_id},
                )
            thread = self.marketplace_repository.update_negotiation_thread(
                thread=thread_record,
                status="rejected",
                actor_id=envelope.metadata.actor_id,
                action="confirmation_rejected",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                clear_confirmation_checkpoint=True,
            )
            return self._thread_result(
                envelope=envelope, thread=thread, transition="confirmation_rejected"
            )

        if envelope.command_name.startswith("market.negotiation") or envelope.command_name.startswith(
            "market.negotiations"
        ):
            raise CommandRejectedError(
                status_code=422,
                error_code="unsupported_negotiation_command",
                reason_code="unsupported_negotiation_command",
                payload={"command_name": envelope.command_name},
            )

        if envelope.command_name == "wallets.escrows.initiate":
            validate_contract_payload("escrow.escrow_initiate_input", envelope.payload)
            thread_id = str(envelope.payload["thread_id"])
            thread_record = self.marketplace_repository.get_negotiation_thread(thread_id=thread_id)
            if thread_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="thread_not_found",
                    reason_code="thread_not_found",
                    payload={"thread_id": thread_id},
                )
            if thread_record.status != "accepted":
                raise CommandRejectedError(
                    status_code=409,
                    error_code="thread_not_accepted",
                    reason_code="thread_not_accepted",
                    payload={"thread_id": thread_id},
                )
            if envelope.metadata.actor_id not in self._participant_ids(thread_record):
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="thread_access_forbidden",
                    payload={"thread_id": thread_id},
                )
            existing_escrow = self.escrow_repository.get_escrow_by_thread(thread_id=thread_id)
            if existing_escrow is None:
                escrow = self.escrow_repository.create_escrow(
                    escrow_id=f"escrow-{uuid4().hex[:12]}",
                    thread_id=thread_record.thread_id,
                    listing_id=thread_record.listing_id,
                    buyer_actor_id=thread_record.buyer_actor_id,
                    seller_actor_id=thread_record.seller_actor_id,
                    country_code=thread_record.country_code,
                    currency=thread_record.current_offer_currency,
                    amount=thread_record.current_offer_amount,
                    initiated_by_actor_id=envelope.metadata.actor_id,
                )
                self.escrow_repository.append_timeline_entry(
                    escrow_id=escrow.escrow_id,
                    actor_id=envelope.metadata.actor_id,
                    transition="initiated",
                    state="initiated",
                    note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                    request_id=str(envelope.metadata.request_id),
                    idempotency_key=envelope.metadata.idempotency_key,
                    correlation_id=envelope.metadata.correlation_id,
                )
            else:
                escrow = existing_escrow
            return {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "initiated",
                    "state": escrow.state,
                    "notification_count": 0,
                },
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "wallets.escrows.mark_partner_pending":
            validate_contract_payload("escrow.escrow_mark_partner_pending_input", envelope.payload)
            escrow_id = str(envelope.payload["escrow_id"])
            escrow_record = self.escrow_repository.get_escrow(escrow_id=escrow_id)
            if escrow_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="escrow_not_found",
                    reason_code="escrow_not_found",
                    payload={"escrow_id": escrow_id},
                )
            if envelope.metadata.actor_id not in {
                escrow_record.buyer_actor_id,
                escrow_record.seller_actor_id,
                "system:test",
            }:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="escrow_access_forbidden",
                    payload={"escrow_id": escrow_id},
                )
            if escrow_record.state in {"released", "reversed"}:
                self._reject_for_state(escrow_id=escrow_id, reason_code="escrow_terminal_state")
            escrow = self.escrow_repository.transition_escrow(
                escrow=escrow_record,
                state="partner_pending",
                partner_reason_code=str(envelope.payload["pending_reason_code"]),
            )
            notifications = [
                self._settlement_notification_payload(
                    envelope=envelope,
                    escrow=escrow,
                    recipient_actor_id=recipient_actor_id,
                    state="partner_pending",
                    delivery_state="fallback_sent",
                    fallback_channel="sms",
                    fallback_reason="delivery_failed",
                    message_key="escrow.partner_pending",
                )
                for recipient_actor_id in self._participant_ids_for_escrow(escrow)
            ]
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="partner_pending",
                state="partner_pending",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                notification_payload=notifications[0],
            )
            return {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "partner_pending",
                    "state": escrow.state,
                    "notification_count": len(notifications),
                },
                "settlement_notifications": notifications,
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "wallets.escrows.fund":
            validate_contract_payload("escrow.escrow_fund_input", envelope.payload)
            escrow_id = str(envelope.payload["escrow_id"])
            escrow_record = self.escrow_repository.get_escrow(escrow_id=escrow_id)
            if escrow_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="escrow_not_found",
                    reason_code="escrow_not_found",
                    payload={"escrow_id": escrow_id},
                )
            if envelope.metadata.actor_id not in {escrow_record.buyer_actor_id, "system:test"}:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="escrow_fund_forbidden",
                    payload={"escrow_id": escrow_id},
                )
            if escrow_record.state == "funded":
                return {
                    "escrow": self._escrow_to_payload(
                        escrow=escrow_record, schema_version=envelope.metadata.schema_version
                    ),
                    "escrow_transition": {
                        "escrow_id": escrow_record.escrow_id,
                        "thread_id": escrow_record.thread_id,
                        "transition": "funded",
                        "state": escrow_record.state,
                        "notification_count": 0,
                    },
                    "schema_version": envelope.metadata.schema_version,
                }
            if escrow_record.state not in {"initiated", "partner_pending"}:
                self._reject_for_state(escrow_id=escrow_id, reason_code="escrow_not_fundable")
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow_record.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="funding_requested",
                state="pending_funds",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
            )
            partner_outcome = str(envelope.payload.get("partner_outcome", "funded"))
            if partner_outcome == "timeout":
                escrow = self.escrow_repository.transition_escrow(
                    escrow=escrow_record,
                    state="partner_pending",
                    partner_reason_code="delivery_failed",
                )
                notifications = [
                    self._settlement_notification_payload(
                        envelope=envelope,
                        escrow=escrow,
                        recipient_actor_id=recipient_actor_id,
                        state="partner_pending",
                        delivery_state="fallback_sent",
                        fallback_channel="sms",
                        fallback_reason="delivery_failed",
                        message_key="escrow.partner_pending",
                    )
                    for recipient_actor_id in self._participant_ids_for_escrow(escrow)
                ]
                self.escrow_repository.append_timeline_entry(
                    escrow_id=escrow.escrow_id,
                    actor_id=envelope.metadata.actor_id,
                    transition="partner_pending",
                    state="partner_pending",
                    note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                    request_id=str(envelope.metadata.request_id),
                    idempotency_key=envelope.metadata.idempotency_key,
                    correlation_id=envelope.metadata.correlation_id,
                    notification_payload=notifications[0],
                )
                return {
                    "escrow": self._escrow_to_payload(
                        escrow=escrow, schema_version=envelope.metadata.schema_version
                    ),
                    "escrow_transition": {
                        "escrow_id": escrow.escrow_id,
                        "thread_id": escrow.thread_id,
                        "transition": "partner_pending",
                        "state": escrow.state,
                        "notification_count": len(notifications),
                    },
                    "settlement_notifications": notifications,
                    "schema_version": envelope.metadata.schema_version,
                }
            try:
                buyer_entry = self.ledger_repository.append_entry(
                    actor_id=escrow_record.buyer_actor_id,
                    country_code=escrow_record.country_code,
                    currency=escrow_record.currency,
                    direction="debit",
                    reason="escrow_funded",
                    amount=escrow_record.amount,
                    available_delta=-escrow_record.amount,
                    held_delta=escrow_record.amount,
                    request_id=str(envelope.metadata.request_id),
                    idempotency_key=envelope.metadata.idempotency_key,
                    correlation_id=envelope.metadata.correlation_id,
                    counterparty_actor_id=escrow_record.seller_actor_id,
                    escrow_id=escrow_record.escrow_id,
                )
            except ValueError as exc:
                raise CommandRejectedError(
                    status_code=409,
                    error_code="policy_denied",
                    reason_code=str(exc),
                    payload={"escrow_id": escrow_id},
                ) from exc
            escrow = self.escrow_repository.transition_escrow(escrow=escrow_record, state="funded")
            notifications = [
                self._settlement_notification_payload(
                    envelope=envelope,
                    escrow=escrow,
                    recipient_actor_id=recipient_actor_id,
                    state="funded",
                    delivery_state="sent",
                    message_key="escrow.funded",
                )
                for recipient_actor_id in self._participant_ids_for_escrow(escrow)
            ]
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="funded",
                state="funded",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                notification_payload=notifications[0],
            )
            buyer_balance = self.ledger_repository.get_wallet_balance(
                actor_id=escrow.buyer_actor_id,
                country_code=escrow.country_code,
                currency=escrow.currency,
            )
            wallet_payload = _wallet_balance_to_payload(buyer_balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            return {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "wallet": wallet_payload,
                "ledger_entry": {
                    "entry_id": buyer_entry.entry_id,
                    "wallet_id": buyer_entry.wallet_id,
                    "entry_sequence": buyer_entry.entry_sequence,
                    "balance_version": buyer_entry.balance_version,
                },
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "funded",
                    "state": escrow.state,
                    "notification_count": len(notifications),
                },
                "settlement_notifications": notifications,
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "wallets.escrows.release":
            validate_contract_payload("escrow.escrow_release_input", envelope.payload)
            escrow_id = str(envelope.payload["escrow_id"])
            escrow_record = self.escrow_repository.get_escrow(escrow_id=escrow_id)
            if escrow_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="escrow_not_found",
                    reason_code="escrow_not_found",
                    payload={"escrow_id": escrow_id},
                )
            if envelope.metadata.actor_id not in {escrow_record.seller_actor_id, "system:test"}:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="unauthorized_release",
                    payload={"escrow_id": escrow_id},
                )
            if escrow_record.state == "released":
                seller_balance = self.ledger_repository.get_wallet_balance(
                    actor_id=escrow_record.seller_actor_id,
                    country_code=escrow_record.country_code,
                    currency=escrow_record.currency,
                )
                wallet_payload = _wallet_balance_to_payload(seller_balance)
                wallet_payload["schema_version"] = envelope.metadata.schema_version
                return {
                    "escrow": self._escrow_to_payload(
                        escrow=escrow_record, schema_version=envelope.metadata.schema_version
                    ),
                    "wallet": wallet_payload,
                    "escrow_transition": {
                        "escrow_id": escrow_record.escrow_id,
                        "thread_id": escrow_record.thread_id,
                        "transition": "released",
                        "state": escrow_record.state,
                        "notification_count": 0,
                    },
                    "schema_version": envelope.metadata.schema_version,
                }
            if escrow_record.state != "funded":
                self._reject_for_state(escrow_id=escrow_id, reason_code="escrow_not_releasable")
            buyer_release_entry = self.ledger_repository.append_entry(
                actor_id=escrow_record.buyer_actor_id,
                country_code=escrow_record.country_code,
                currency=escrow_record.currency,
                direction="debit",
                reason="escrow_released",
                amount=escrow_record.amount,
                available_delta=0.0,
                held_delta=-escrow_record.amount,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                counterparty_actor_id=escrow_record.seller_actor_id,
                escrow_id=escrow_record.escrow_id,
            )
            seller_release_entry = self.ledger_repository.append_entry(
                actor_id=escrow_record.seller_actor_id,
                country_code=escrow_record.country_code,
                currency=escrow_record.currency,
                direction="credit",
                reason="escrow_released",
                amount=escrow_record.amount,
                available_delta=escrow_record.amount,
                held_delta=0.0,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                counterparty_actor_id=escrow_record.buyer_actor_id,
                escrow_id=escrow_record.escrow_id,
            )
            escrow = self.escrow_repository.transition_escrow(escrow=escrow_record, state="released")
            notifications = [
                self._settlement_notification_payload(
                    envelope=envelope,
                    escrow=escrow,
                    recipient_actor_id=recipient_actor_id,
                    state="released",
                    delivery_state="sent",
                    message_key="escrow.released",
                )
                for recipient_actor_id in self._participant_ids_for_escrow(escrow)
            ]
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="released",
                state="released",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                notification_payload=notifications[0],
            )
            seller_balance = self.ledger_repository.get_wallet_balance(
                actor_id=escrow.seller_actor_id,
                country_code=escrow.country_code,
                currency=escrow.currency,
            )
            wallet_payload = _wallet_balance_to_payload(seller_balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            return {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "wallet": wallet_payload,
                "ledger_entry": {
                    "entry_id": seller_release_entry.entry_id,
                    "wallet_id": seller_release_entry.wallet_id,
                    "entry_sequence": seller_release_entry.entry_sequence,
                    "balance_version": seller_release_entry.balance_version,
                    "counter_entry_id": buyer_release_entry.entry_id,
                },
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "released",
                    "state": escrow.state,
                    "notification_count": len(notifications),
                },
                "settlement_notifications": notifications,
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "wallets.escrows.reverse":
            validate_contract_payload("escrow.escrow_reverse_input", envelope.payload)
            escrow_id = str(envelope.payload["escrow_id"])
            escrow_record = self.escrow_repository.get_escrow(escrow_id=escrow_id)
            if escrow_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="escrow_not_found",
                    reason_code="escrow_not_found",
                    payload={"escrow_id": escrow_id},
                )
            if envelope.metadata.actor_id not in {escrow_record.buyer_actor_id, "system:test"}:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="unauthorized_reversal",
                    payload={"escrow_id": escrow_id},
                )
            if escrow_record.state == "reversed":
                buyer_balance = self.ledger_repository.get_wallet_balance(
                    actor_id=escrow_record.buyer_actor_id,
                    country_code=escrow_record.country_code,
                    currency=escrow_record.currency,
                )
                wallet_payload = _wallet_balance_to_payload(buyer_balance)
                wallet_payload["schema_version"] = envelope.metadata.schema_version
                return {
                    "escrow": self._escrow_to_payload(
                        escrow=escrow_record, schema_version=envelope.metadata.schema_version
                    ),
                    "wallet": wallet_payload,
                    "escrow_transition": {
                        "escrow_id": escrow_record.escrow_id,
                        "thread_id": escrow_record.thread_id,
                        "transition": "reversed",
                        "state": escrow_record.state,
                        "notification_count": 0,
                    },
                    "schema_version": envelope.metadata.schema_version,
                }
            if escrow_record.state not in {"funded", "partner_pending", "disputed"}:
                self._reject_for_state(escrow_id=escrow_id, reason_code="escrow_not_reversible")
            ledger_entry = None
            if escrow_record.state in {"funded", "disputed"}:
                ledger_entry = self.ledger_repository.append_entry(
                    actor_id=escrow_record.buyer_actor_id,
                    country_code=escrow_record.country_code,
                    currency=escrow_record.currency,
                    direction="credit",
                    reason="escrow_reversed",
                    amount=escrow_record.amount,
                    available_delta=escrow_record.amount,
                    held_delta=-escrow_record.amount,
                    request_id=str(envelope.metadata.request_id),
                    idempotency_key=envelope.metadata.idempotency_key,
                    correlation_id=envelope.metadata.correlation_id,
                    counterparty_actor_id=escrow_record.seller_actor_id,
                    escrow_id=escrow_record.escrow_id,
                )
            escrow = self.escrow_repository.transition_escrow(escrow=escrow_record, state="reversed")
            notifications = [
                self._settlement_notification_payload(
                    envelope=envelope,
                    escrow=escrow,
                    recipient_actor_id=recipient_actor_id,
                    state="reversed",
                    delivery_state="sent",
                    message_key="escrow.reversed",
                )
                for recipient_actor_id in self._participant_ids_for_escrow(escrow)
            ]
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="reversed",
                state="reversed",
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                notification_payload=notifications[0],
            )
            buyer_balance = self.ledger_repository.get_wallet_balance(
                actor_id=escrow.buyer_actor_id,
                country_code=escrow.country_code,
                currency=escrow.currency,
            )
            wallet_payload = _wallet_balance_to_payload(buyer_balance)
            wallet_payload["schema_version"] = envelope.metadata.schema_version
            result: dict[str, object] = {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "wallet": wallet_payload,
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "reversed",
                    "state": escrow.state,
                    "notification_count": len(notifications),
                },
                "settlement_notifications": notifications,
                "schema_version": envelope.metadata.schema_version,
            }
            if ledger_entry is not None:
                result["ledger_entry"] = {
                    "entry_id": ledger_entry.entry_id,
                    "wallet_id": ledger_entry.wallet_id,
                    "entry_sequence": ledger_entry.entry_sequence,
                    "balance_version": ledger_entry.balance_version,
                }
            return result

        if envelope.command_name == "wallets.escrows.dispute_open":
            validate_contract_payload("escrow.escrow_dispute_open_input", envelope.payload)
            escrow_id = str(envelope.payload["escrow_id"])
            escrow_record = self.escrow_repository.get_escrow(escrow_id=escrow_id)
            if escrow_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="escrow_not_found",
                    reason_code="escrow_not_found",
                    payload={"escrow_id": escrow_id},
                )
            if envelope.metadata.actor_id not in self._participant_ids_for_escrow(escrow_record) | {
                "system:test"
            }:
                raise CommandRejectedError(
                    status_code=403,
                    error_code="policy_denied",
                    reason_code="escrow_access_forbidden",
                    payload={"escrow_id": escrow_id},
                )
            if escrow_record.state != "funded":
                self._reject_for_state(escrow_id=escrow_id, reason_code="escrow_not_disputable")
            escrow = self.escrow_repository.transition_escrow(escrow=escrow_record, state="disputed")
            notifications = [
                self._settlement_notification_payload(
                    envelope=envelope,
                    escrow=escrow,
                    recipient_actor_id=recipient_actor_id,
                    state="disputed",
                    delivery_state="action_required",
                    message_key="escrow.disputed",
                )
                for recipient_actor_id in self._participant_ids_for_escrow(escrow)
            ]
            self.escrow_repository.append_timeline_entry(
                escrow_id=escrow.escrow_id,
                actor_id=envelope.metadata.actor_id,
                transition="dispute_opened",
                state="disputed",
                note=str(envelope.payload["note"]),
                request_id=str(envelope.metadata.request_id),
                idempotency_key=envelope.metadata.idempotency_key,
                correlation_id=envelope.metadata.correlation_id,
                notification_payload=notifications[0],
            )
            return {
                "escrow": self._escrow_to_payload(
                    escrow=escrow, schema_version=envelope.metadata.schema_version
                ),
                "escrow_transition": {
                    "escrow_id": escrow.escrow_id,
                    "thread_id": escrow.thread_id,
                    "transition": "dispute_opened",
                    "state": escrow.state,
                    "notification_count": len(notifications),
                },
                "settlement_notifications": notifications,
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "climate.observations.ingest":
            farm_payload = envelope.payload.get("farm_profile")
            if not isinstance(farm_payload, dict):
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_climate_payload",
                    reason_code="farm_context_missing",
                    payload={"field": "farm_profile"},
                )
            source_window_start = datetime.fromisoformat(
                str(envelope.payload["source_window_start"]).replace("Z", "+00:00")
            )
            source_window_end = datetime.fromisoformat(
                str(envelope.payload["source_window_end"]).replace("Z", "+00:00")
            )
            observed_at = datetime.fromisoformat(
                str(envelope.payload["observed_at"]).replace("Z", "+00:00")
            )
            if source_window_end < source_window_start:
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_climate_window",
                    reason_code="source_window_invalid",
                    payload={"field": "source_window_end"},
                )
            assumptions = [str(item) for item in envelope.payload.get("assumptions", [])]
            degraded_reason_codes = [
                str(item) for item in envelope.payload.get("degraded_reason_codes", [])
            ]
            rainfall_mm = self._normalize_observation_value(envelope.payload.get("rainfall_mm"))
            temperature_c = self._normalize_observation_value(envelope.payload.get("temperature_c"))
            soil_moisture_pct = self._normalize_observation_value(
                envelope.payload.get("soil_moisture_pct")
            )
            anomaly_score = self._normalize_observation_value(envelope.payload.get("anomaly_score"))
            if (
                rainfall_mm is None
                and temperature_c is None
                and soil_moisture_pct is None
                and anomaly_score is None
            ):
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_climate_payload",
                    reason_code="observation_metrics_missing",
                    payload={},
                )
            source_window_complete = bool(envelope.payload.get("source_window_complete", True))
            source_window_consistent = bool(
                envelope.payload.get("source_window_consistent", True)
            )
            degraded_mode = not source_window_complete or not source_window_consistent
            if not source_window_complete:
                degraded_reason_codes.append("source_window_unavailable")
            if not source_window_consistent:
                degraded_reason_codes.append("source_window_inconsistent")
            degraded_reason_codes = self._dedupe_reason_codes(degraded_reason_codes)

            farm_id = str(envelope.payload["farm_id"])
            farm_profile = self.climate_repository.upsert_farm_profile(
                farm_id=farm_id,
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                farm_name=str(farm_payload["farm_name"]),
                district=str(farm_payload["district"]),
                crop_type=str(farm_payload["crop_type"]),
                hectares=float(farm_payload["hectares"]),
                latitude=(
                    self._normalize_observation_value(farm_payload.get("latitude"))
                    if farm_payload.get("latitude") is not None
                    else None
                ),
                longitude=(
                    self._normalize_observation_value(farm_payload.get("longitude"))
                    if farm_payload.get("longitude") is not None
                    else None
                ),
                metadata_json=(
                    farm_payload.get("metadata")
                    if isinstance(farm_payload.get("metadata"), dict)
                    else {}
                ),
            )
            observation = self.climate_repository.create_observation(
                observation_id=f"obs-{uuid4().hex[:12]}",
                farm_id=farm_id,
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                source_id=str(envelope.payload["source_id"]),
                source_type=str(envelope.payload["source_type"]),
                observed_at=observed_at,
                source_window_start=source_window_start,
                source_window_end=source_window_end,
                rainfall_mm=rainfall_mm,
                temperature_c=temperature_c,
                soil_moisture_pct=soil_moisture_pct,
                anomaly_score=anomaly_score,
                ingestion_state="degraded" if degraded_mode else "normalized",
                degraded_mode=degraded_mode,
                degraded_reason_codes=degraded_reason_codes,
                assumptions=assumptions,
                provenance=(
                    [
                        item
                        for item in envelope.payload.get("provenance", [])
                        if isinstance(item, dict)
                    ]
                    or [
                        {
                            "source_id": str(envelope.payload["source_id"]),
                            "source_type": str(envelope.payload["source_type"]),
                            "observed_at": _isoformat(observed_at),
                        }
                    ]
                ),
                normalized_payload={
                    "rainfall_mm": rainfall_mm,
                    "temperature_c": temperature_c,
                    "soil_moisture_pct": soil_moisture_pct,
                    "anomaly_score": anomaly_score,
                },
            )
            alert = self._build_alert_from_observation(
                observation=observation,
                farm_profile=farm_profile,
                schema_version=envelope.metadata.schema_version,
            )
            return {
                "farm_profile": _farm_profile_to_payload(
                    farm_profile, envelope.metadata.schema_version
                ),
                "observation": _observation_to_payload(
                    observation, envelope.metadata.schema_version, farm_profile
                ),
                "climate_alert": _alert_to_payload(
                    alert, envelope.metadata.schema_version, farm_profile
                ),
                "climate_alert_transition": {
                    "alert_id": alert.alert_id,
                    "farm_id": alert.farm_id,
                    "severity": alert.severity,
                    "status": alert.status,
                    "degraded_mode": alert.degraded_mode,
                },
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "climate.alerts.acknowledge":
            alert_id = str(envelope.payload["alert_id"])
            alert_record = self.climate_repository.get_alert_for_actor(
                alert_id=alert_id,
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
            )
            if alert_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="climate_alert_not_found",
                    reason_code="climate_alert_not_found",
                    payload={"alert_id": alert_id},
                )
            if alert_record.status == "acknowledged":
                raise CommandRejectedError(
                    status_code=409,
                    error_code="climate_alert_already_acknowledged",
                    reason_code="climate_alert_already_acknowledged",
                    payload={"alert_id": alert_id},
                )
            alert_farm_profile = self.climate_repository.get_farm_profile(farm_id=alert_record.farm_id)
            acknowledged = self.climate_repository.acknowledge_alert(
                alert=alert_record,
                actor_id=envelope.metadata.actor_id,
                acknowledged_at=datetime.now(tz=UTC),
                note=str(envelope.payload.get("note")) if envelope.payload.get("note") else None,
            )
            return {
                "climate_alert": _alert_to_payload(
                    acknowledged, envelope.metadata.schema_version, alert_farm_profile
                ),
                "climate_alert_transition": {
                    "alert_id": acknowledged.alert_id,
                    "farm_id": acknowledged.farm_id,
                    "severity": acknowledged.severity,
                    "status": acknowledged.status,
                    "degraded_mode": acknowledged.degraded_mode,
                },
                "schema_version": envelope.metadata.schema_version,
            }

        if envelope.command_name == "climate.mrv.create":
            assumptions = [str(item) for item in envelope.payload.get("assumptions", [])]
            method_references = [
                str(item) for item in envelope.payload.get("method_references", [])
            ]
            if not assumptions:
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_mrv_payload",
                    reason_code="assumptions_missing",
                    payload={},
                )
            if not method_references:
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_mrv_payload",
                    reason_code="method_reference_missing",
                    payload={},
                )
            farm_id = str(envelope.payload["farm_id"])
            farm_profile_record = self.climate_repository.get_farm_profile_for_actor(
                farm_id=farm_id,
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
            )
            if farm_profile_record is None:
                raise CommandRejectedError(
                    status_code=404,
                    error_code="farm_profile_not_found",
                    reason_code="farm_context_missing",
                    payload={"farm_id": farm_id},
                )
            source_window_start = datetime.fromisoformat(
                str(envelope.payload["source_window_start"]).replace("Z", "+00:00")
            )
            source_window_end = datetime.fromisoformat(
                str(envelope.payload["source_window_end"]).replace("Z", "+00:00")
            )
            observations = self.climate_repository.list_observations_for_window(
                farm_id=farm_id,
                window_start=source_window_start,
                window_end=source_window_end,
            )
            coverage = self.climate_repository.evaluate_source_window_coverage(
                observations=observations,
                source_window_start=source_window_start,
                source_window_end=source_window_end,
            )
            alert_ids = [str(item) for item in envelope.payload.get("alert_ids", [])]
            if not alert_ids:
                alert_ids = [
                    item.alert_id
                    for item in self.climate_repository.get_alerts_for_farm(
                        farm_id=farm_id,
                        actor_id=envelope.metadata.actor_id,
                        country_code=envelope.metadata.country_code,
                    )[:3]
                ]
            degraded_reason_codes = list(coverage.reason_codes)
            source_completeness_state = "complete"
            if coverage.degraded:
                source_completeness_state = (
                    "missing_window"
                    if "source_window_unavailable" in coverage.reason_codes
                    else "inconsistent"
                )
            provenance: list[dict[str, object]] = [
                {
                    "observation_id": item.observation_id,
                    "source_id": item.source_id,
                    "source_type": item.source_type,
                    "source_window_start": _isoformat(item.source_window_start),
                    "source_window_end": _isoformat(item.source_window_end),
                    "degraded_mode": item.degraded_mode,
                }
                for item in observations
            ]
            record = self.climate_repository.create_mrv_evidence_record(
                evidence_id=f"mrv-{uuid4().hex[:12]}",
                farm_id=farm_id,
                actor_id=envelope.metadata.actor_id,
                country_code=envelope.metadata.country_code,
                evidence_type=str(envelope.payload.get("evidence_type", "climate_risk_baseline")),
                method_tag=str(envelope.payload["method_tag"]),
                method_references=method_references,
                source_window_start=source_window_start,
                source_window_end=source_window_end,
                source_observation_ids=[item.observation_id for item in observations],
                alert_ids=alert_ids,
                assumptions=assumptions,
                provenance=provenance,
                source_completeness_state=source_completeness_state,
                degraded_mode=coverage.degraded,
                degraded_reason_codes=degraded_reason_codes,
                summary={
                    "farm_name": farm_profile_record.farm_name,
                    "crop_type": farm_profile_record.crop_type,
                    "observation_count": len(observations),
                    "alert_count": len(alert_ids),
                    "assumption_count": len(assumptions),
                },
            )
            return {
                "mrv_evidence": _mrv_evidence_to_payload(
                    record, envelope.metadata.schema_version, farm_profile_record
                ),
                "schema_version": envelope.metadata.schema_version,
            }

        execution = self.workflow_repository.create_execution(
            request_id=str(envelope.metadata.request_id),
            command_name=envelope.command_name,
            actor_id=envelope.metadata.actor_id,
            country_code=envelope.metadata.country_code,
            channel=envelope.metadata.channel,
            schema_version=envelope.metadata.schema_version,
            payload=envelope.payload,
            status="accepted",
        )
        return {
            "execution_id": execution.id,
            "command_name": envelope.command_name,
            "accepted": True,
        }
from sqlalchemy.orm import Session
