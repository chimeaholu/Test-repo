"""B-020 finance partner decision adapter and responsibility boundary."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .country_pack import resolve_country_policy
from .tool_contracts import ContractField, ContractValueType, ToolContract, ToolContractRegistry


class FinancePartnerAdapterError(ValueError):
    """Raised when finance partner adapter inputs or state are invalid."""


class FinanceDecisionType(str, Enum):
    CREDIT = "credit"
    INSURANCE = "insurance"


class FinanceDecisionOutcome(str, Enum):
    APPROVED = "approved"
    MANUAL_REVIEW = "manual_review"
    DECLINED = "declined"


@dataclass(frozen=True)
class ResponsibilityBoundary:
    platform_responsibilities: tuple[str, ...]
    partner_responsibilities: tuple[str, ...]
    liability_owner: str
    dispute_path: str

    def __post_init__(self) -> None:
        if not self.platform_responsibilities:
            raise FinancePartnerAdapterError("platform_responsibilities must not be empty")
        if not self.partner_responsibilities:
            raise FinancePartnerAdapterError("partner_responsibilities must not be empty")
        if not self.liability_owner.strip():
            raise FinancePartnerAdapterError("liability_owner is required")
        if not self.dispute_path.strip():
            raise FinancePartnerAdapterError("dispute_path is required")


@dataclass(frozen=True)
class FinancePartnerConfig:
    partner_id: str
    decision_types: tuple[FinanceDecisionType, ...]
    supported_countries: tuple[str, ...]
    max_amount_minor: int
    manual_review_amount_minor: int
    manual_review_risk_score: float
    decline_risk_score: float
    responsibility_boundary: ResponsibilityBoundary

    def __post_init__(self) -> None:
        if not self.partner_id.strip():
            raise FinancePartnerAdapterError("partner_id is required")
        if not self.decision_types:
            raise FinancePartnerAdapterError("decision_types must not be empty")
        if not self.supported_countries:
            raise FinancePartnerAdapterError("supported_countries must not be empty")
        if self.max_amount_minor <= 0:
            raise FinancePartnerAdapterError("max_amount_minor must be > 0")
        if self.manual_review_amount_minor <= 0:
            raise FinancePartnerAdapterError("manual_review_amount_minor must be > 0")
        if self.manual_review_amount_minor > self.max_amount_minor:
            raise FinancePartnerAdapterError(
                "manual_review_amount_minor must be <= max_amount_minor"
            )
        if not 0 <= self.manual_review_risk_score <= 1:
            raise FinancePartnerAdapterError("manual_review_risk_score must be between 0 and 1")
        if not 0 <= self.decline_risk_score <= 1:
            raise FinancePartnerAdapterError("decline_risk_score must be between 0 and 1")
        if self.manual_review_risk_score > self.decline_risk_score:
            raise FinancePartnerAdapterError(
                "manual_review_risk_score must be <= decline_risk_score"
            )
        for country_code in self.supported_countries:
            resolve_country_policy(country_code)


@dataclass(frozen=True)
class FinancePartnerDecisionRequest:
    request_id: str
    idempotency_key: str
    schema_version: str
    decision_type: FinanceDecisionType
    partner_id: str
    country_code: str
    applicant_id: str
    product_code: str
    amount_minor: int
    currency: str
    risk_score: float
    actor_id: str
    policy_context: dict[str, object]
    evidence_reference_ids: tuple[str, ...] = ()
    metadata: dict[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.request_id.strip():
            raise FinancePartnerAdapterError("request_id is required")
        if not self.idempotency_key.strip():
            raise FinancePartnerAdapterError("idempotency_key is required")
        if not self.schema_version.strip():
            raise FinancePartnerAdapterError("schema_version is required")
        if not self.partner_id.strip():
            raise FinancePartnerAdapterError("partner_id is required")
        if not self.country_code.strip():
            raise FinancePartnerAdapterError("country_code is required")
        if not self.applicant_id.strip():
            raise FinancePartnerAdapterError("applicant_id is required")
        if not self.product_code.strip():
            raise FinancePartnerAdapterError("product_code is required")
        if self.amount_minor <= 0:
            raise FinancePartnerAdapterError("amount_minor must be > 0")
        if not self.currency.strip():
            raise FinancePartnerAdapterError("currency is required")
        if not 0 <= self.risk_score <= 1:
            raise FinancePartnerAdapterError("risk_score must be between 0 and 1")
        if not self.actor_id.strip():
            raise FinancePartnerAdapterError("actor_id is required")
        if not isinstance(self.policy_context, dict) or not self.policy_context:
            raise FinancePartnerAdapterError("policy_context must be a non-empty object")


@dataclass(frozen=True)
class FinancePartnerDecisionResponse:
    request_id: str
    partner_id: str
    decision_type: FinanceDecisionType
    product_code: str
    outcome: FinanceDecisionOutcome
    partner_reference_id: str
    responsibility_boundary: ResponsibilityBoundary
    rationale_summary: str
    requires_hitl: bool
    data_check_id: str
    metadata: dict[str, object]

    def __post_init__(self) -> None:
        if not self.request_id.strip():
            raise FinancePartnerAdapterError("request_id is required")
        if not self.partner_id.strip():
            raise FinancePartnerAdapterError("partner_id is required")
        if not self.product_code.strip():
            raise FinancePartnerAdapterError("product_code is required")
        if not self.partner_reference_id.strip():
            raise FinancePartnerAdapterError("partner_reference_id is required")
        if not self.rationale_summary.strip():
            raise FinancePartnerAdapterError("rationale_summary is required")
        if not self.data_check_id.strip():
            raise FinancePartnerAdapterError("data_check_id is required")

    def as_payload(self) -> dict[str, object]:
        return {
            "request_id": self.request_id,
            "partner_id": self.partner_id,
            "decision_type": self.decision_type.value,
            "product_code": self.product_code,
            "outcome": self.outcome.value,
            "partner_reference_id": self.partner_reference_id,
            "responsibility_boundary": {
                "platform_responsibilities": list(
                    self.responsibility_boundary.platform_responsibilities
                ),
                "partner_responsibilities": list(
                    self.responsibility_boundary.partner_responsibilities
                ),
                "liability_owner": self.responsibility_boundary.liability_owner,
                "dispute_path": self.responsibility_boundary.dispute_path,
            },
            "rationale_summary": self.rationale_summary,
            "requires_hitl": self.requires_hitl,
            "data_check_id": self.data_check_id,
            "metadata": dict(self.metadata),
        }


class FinancePartnerDecisionAdapter:
    """Deterministic partner boundary for credit and insurance decision routing."""

    def __init__(self, *, contract_registry: ToolContractRegistry | None = None) -> None:
        self._contract_registry = contract_registry or ToolContractRegistry()
        self._partners: dict[str, FinancePartnerConfig] = {}
        self._idempotency_index: dict[
            str, tuple[tuple[object, ...], FinancePartnerDecisionResponse]
        ] = {}
        self._register_default_contract()

    def register_partner(self, config: FinancePartnerConfig) -> None:
        if config.partner_id in self._partners:
            raise FinancePartnerAdapterError("partner_id already registered")
        self._partners[config.partner_id] = config

    def submit(self, request: FinancePartnerDecisionRequest) -> FinancePartnerDecisionResponse:
        self._contract_registry.validate_input(
            tool_name="finance.partner_decision.submit",
            version=request.schema_version,
            payload={
                "request_id": request.request_id,
                "idempotency_key": request.idempotency_key,
                "decision_type": request.decision_type.value,
                "partner_id": request.partner_id,
                "country_code": request.country_code,
                "applicant_id": request.applicant_id,
                "product_code": request.product_code,
                "amount_minor": request.amount_minor,
                "currency": request.currency,
                "risk_score": request.risk_score,
                "actor_id": request.actor_id,
                "policy_context": dict(request.policy_context),
                "evidence_reference_ids": list(request.evidence_reference_ids),
            },
        )

        fingerprint = self._request_fingerprint(request)
        cached = self._idempotency_index.get(request.idempotency_key)
        if cached is not None:
            cached_fingerprint, response = cached
            if cached_fingerprint != fingerprint:
                raise FinancePartnerAdapterError(
                    "idempotency_key already bound to different partner request"
                )
            return response

        partner = self._get_partner(request.partner_id)
        self._validate_request_against_partner(request, partner)

        if request.amount_minor > partner.max_amount_minor:
            raise FinancePartnerAdapterError("request amount exceeds partner max_amount_minor")

        if request.risk_score >= partner.decline_risk_score:
            outcome = FinanceDecisionOutcome.DECLINED
            requires_hitl = False
            rationale = "partner threshold exceeded; partner retains decline authority"
        elif (
            request.amount_minor >= partner.manual_review_amount_minor
            or request.risk_score >= partner.manual_review_risk_score
        ):
            outcome = FinanceDecisionOutcome.MANUAL_REVIEW
            requires_hitl = True
            rationale = "partner review required due to amount or risk threshold"
        else:
            outcome = FinanceDecisionOutcome.APPROVED
            requires_hitl = False
            rationale = "request fits registered partner policy envelope"

        response = FinancePartnerDecisionResponse(
            request_id=request.request_id,
            partner_id=request.partner_id,
            decision_type=request.decision_type,
            product_code=request.product_code,
            outcome=outcome,
            partner_reference_id=(
                f"{request.partner_id}:{request.decision_type.value}:{request.request_id}"
            ),
            responsibility_boundary=partner.responsibility_boundary,
            rationale_summary=rationale,
            requires_hitl=requires_hitl,
            data_check_id="DI-003",
            metadata={
                "journey": "CJ-004",
                "country_code": request.country_code.upper(),
                "currency": request.currency.upper(),
                "risk_score": request.risk_score,
            },
        )
        self._contract_registry.validate_output(
            tool_name="finance.partner_decision.submit",
            version=request.schema_version,
            payload=response.as_payload(),
        )
        self._idempotency_index[request.idempotency_key] = (fingerprint, response)
        return response

    def _get_partner(self, partner_id: str) -> FinancePartnerConfig:
        try:
            return self._partners[partner_id]
        except KeyError as exc:
            raise FinancePartnerAdapterError("partner_id is not registered") from exc

    @staticmethod
    def _request_fingerprint(request: FinancePartnerDecisionRequest) -> tuple[object, ...]:
        return (
            request.request_id,
            request.schema_version,
            request.decision_type.value,
            request.partner_id,
            request.country_code.upper(),
            request.applicant_id,
            request.product_code,
            request.amount_minor,
            request.currency.upper(),
            request.risk_score,
            request.actor_id,
            tuple(sorted((str(key), str(value)) for key, value in request.policy_context.items())),
            request.evidence_reference_ids,
        )

    @staticmethod
    def _validate_request_against_partner(
        request: FinancePartnerDecisionRequest,
        partner: FinancePartnerConfig,
    ) -> None:
        policy = resolve_country_policy(request.country_code)
        if request.currency.upper() != policy.currency:
            raise FinancePartnerAdapterError("request currency does not match country policy")
        if request.country_code.upper() not in partner.supported_countries:
            raise FinancePartnerAdapterError("partner does not support request country")
        if request.decision_type not in partner.decision_types:
            raise FinancePartnerAdapterError("partner does not support request decision_type")

    def _register_default_contract(self) -> None:
        try:
            self._contract_registry.register(
                ToolContract(
                    tool_name="finance.partner_decision.submit",
                    version="finance-partner.v1",
                    input_fields=(
                        ContractField("request_id", ContractValueType.STRING),
                        ContractField("idempotency_key", ContractValueType.STRING),
                        ContractField("decision_type", ContractValueType.STRING),
                        ContractField("partner_id", ContractValueType.STRING),
                        ContractField("country_code", ContractValueType.STRING),
                        ContractField("applicant_id", ContractValueType.STRING),
                        ContractField("product_code", ContractValueType.STRING),
                        ContractField("amount_minor", ContractValueType.INTEGER),
                        ContractField("currency", ContractValueType.STRING),
                        ContractField("risk_score", ContractValueType.NUMBER),
                        ContractField("actor_id", ContractValueType.STRING),
                        ContractField("policy_context", ContractValueType.OBJECT),
                        ContractField("evidence_reference_ids", ContractValueType.ARRAY),
                    ),
                    output_fields=(
                        ContractField("request_id", ContractValueType.STRING),
                        ContractField("partner_id", ContractValueType.STRING),
                        ContractField("decision_type", ContractValueType.STRING),
                        ContractField("product_code", ContractValueType.STRING),
                        ContractField("outcome", ContractValueType.STRING),
                        ContractField("partner_reference_id", ContractValueType.STRING),
                        ContractField("responsibility_boundary", ContractValueType.OBJECT),
                        ContractField("rationale_summary", ContractValueType.STRING),
                        ContractField("requires_hitl", ContractValueType.BOOLEAN),
                        ContractField("data_check_id", ContractValueType.STRING),
                        ContractField("metadata", ContractValueType.OBJECT),
                    ),
                )
            )
        except ValueError:
            return
