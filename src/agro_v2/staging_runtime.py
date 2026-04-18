"""Integrated staging runtime, seed/teardown utilities, and E2E state verification hooks."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict
from hashlib import sha256
import base64
import hmac
import json
import os
from pathlib import Path
import tempfile
from typing import Any
from urllib.parse import quote

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .advisory_retrieval import (
    AdvisoryRetrievalContract,
    AdvisoryRetrievalRequest,
    VettedKnowledgeSource,
)
from .audit_events import compute_event_hash
from .climate_alert_rules import ClimateAlertRulesEngine, FarmClimateContext
from .climate_risk_ingestion import (
    ClimateIngestRecord,
    ClimateRiskIngestionPipeline,
    ClimateSourceType,
)
from .enterprise_analytics_mart import (
    EnterpriseAnalyticsDataMartContract,
    EnterpriseAnalyticsSourceBundle,
)
from .finance_partner_adapter import (
    FinanceDecisionType,
    FinancePartnerConfig,
    FinancePartnerDecisionAdapter,
    FinancePartnerDecisionRequest,
    ResponsibilityBoundary,
)
from .frontend_app_shell import AppRole, UnifiedAppShell
from .insurance_trigger_registry import (
    InsuranceParametricTriggerRegistry,
    ParametricTriggerDefinition,
    ParametricTriggerThreshold,
    TriggerOperator,
)
from .listings import (
    CreateListingCommand,
    CreateListingPayload,
    ListingApiContract,
    ListingStatus,
    UpdateListingCommand,
    UpdateListingPayload,
)
from .negotiation import NegotiationState, NegotiationWorkflow
from .observability import (
    ObservabilityInstrumentationService,
    ServiceLevelObjective,
    SpanStatus,
    TelemetryChannel,
    TraceSpan,
)
from .traceability_event_chain import TraceabilityEventChainService, TraceabilityEventType


SCHEMA_VERSION = "staging-runtime.v1"
SEED_TIMESTAMP = "2026-04-13T18:00:00Z"
SEED_TIMESTAMP_OFFSET = "2026-04-13T18:00:00+00:00"
VERIFY_CHECKS = (
    "auth-onboarding",
    "listing-publish",
    "negotiation-approval",
    "escrow-release",
    "advisory-citations",
    "climate-ack",
    "finance-hitl",
    "traceability-dispatch",
    "admin-analytics",
    "full-critical",
)


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def resolve_state_path(state_path: str | None = None) -> Path:
    explicit = state_path or os.getenv("AGRODOMAIN_STATE_PATH")
    if explicit:
        path = Path(explicit)
        if not path.is_absolute():
            path = project_root() / path
        return path
    return project_root() / ".staging" / "runtime-state.json"


def _empty_state(profile: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "profile": profile,
        "seeded": False,
        "teardown": True,
        "audit_log": [],
    }


def load_state(state_path: Path) -> dict[str, Any]:
    if not state_path.exists():
        return _empty_state(os.getenv("AGRODOMAIN_STAGING_PROFILE", "e2e-critical"))
    return json.loads(state_path.read_text(encoding="utf-8"))


def write_state(state_path: Path, state: dict[str, Any]) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=state_path.parent,
        delete=False,
    ) as handle:
        json.dump(state, handle, indent=2, sort_keys=True)
        handle.write("\n")
        temp_name = handle.name
    Path(temp_name).replace(state_path)


def compute_state_fingerprint(state: dict[str, Any]) -> str:
    canonical = deepcopy(state)
    canonical.pop("seed_fingerprint", None)
    encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return sha256(encoded.encode("utf-8")).hexdigest()


def _boundary() -> ResponsibilityBoundary:
    return ResponsibilityBoundary(
        platform_responsibilities=(
            "collect consent",
            "normalize request envelope",
            "surface audit-safe status",
        ),
        partner_responsibilities=(
            "underwrite regulated product",
            "retain approval liability",
            "own dispute adjudication",
        ),
        liability_owner="licensed_partner",
        dispute_path="partner-tier1 -> platform-support -> ombuds",
    )


def _serialize_role_home(role: str) -> str:
    return UnifiedAppShell().home_route_for(AppRole(role))


def build_seed_state(profile: str = "e2e-critical") -> dict[str, Any]:
    listing_api = ListingApiContract(clock=lambda: SEED_TIMESTAMP_OFFSET)
    listing_primary = listing_api.create(
        CreateListingCommand(
            request_id="req-listing-001",
            idempotency_key="seed-listing-001-create",
            actor_id="farmer-001",
            payload=CreateListingPayload(
                listing_id="listing-001",
                seller_id="farmer-001",
                commodity_code="maize",
                quantity_kg=1200,
                price_minor=500_000,
                currency="GHS",
                metadata={"seed_namespace": profile, "journey_ids": ["FJ-C02", "FJ-C03"]},
            ),
        )
    )
    listing_primary = listing_api.update(
        UpdateListingCommand(
            request_id="req-listing-001-publish",
            idempotency_key="seed-listing-001-publish",
            actor_id="farmer-001",
            listing_id="listing-001",
            payload=UpdateListingPayload(status=ListingStatus.PUBLISHED),
        )
    )
    listing_draft = listing_api.create(
        CreateListingCommand(
            request_id="req-listing-draft-001",
            idempotency_key="seed-listing-draft-001-create",
            actor_id="farmer-001",
            payload=CreateListingPayload(
                listing_id="listing-draft-001",
                seller_id="farmer-001",
                commodity_code="cocoa",
                quantity_kg=700,
                price_minor=420_000,
                currency="GHS",
                metadata={"seed_namespace": profile, "journey_ids": ["FJ-E01", "FJ-C02"]},
            ),
        )
    )

    negotiation = NegotiationWorkflow(clock=lambda: SEED_TIMESTAMP)
    thread = negotiation.create_thread(
        thread_id="negotiation-001",
        listing_id="listing-001",
        buyer_id="buyer-001",
        seller_id="farmer-001",
        currency="GHS",
        opening_actor_id="buyer-001",
        opening_amount_minor=450_000,
        opening_note="opening offer",
    )
    thread = negotiation.submit_offer(
        thread_id="negotiation-001",
        actor_id="farmer-001",
        amount_minor=470_000,
        note="counter",
    )

    retrieval = AdvisoryRetrievalContract(
        sources=(
            VettedKnowledgeSource(
                source_id="source-001",
                title="Maize disease prevention bulletin",
                publisher="Agro Research Ghana",
                url="https://example.invalid/source-001",
                body="Maize disease prevention guidance with rainfall and soil notes.",
                keywords=("maize", "disease", "rainfall"),
                country_codes=("GH",),
                published_at="2026-04-01",
            ),
            VettedKnowledgeSource(
                source_id="source-002",
                title="Soil moisture recovery checklist",
                publisher="Regional Extension Office",
                url="https://example.invalid/source-002",
                body="Recovery checklist for soil moisture stress during flowering season.",
                keywords=("soil", "moisture", "stress"),
                country_codes=("GH",),
                published_at="2026-04-04",
            ),
            VettedKnowledgeSource(
                source_id="source-003",
                title="Flood mitigation crop action guide",
                publisher="Climate Desk",
                url="https://example.invalid/source-003",
                body="Flood mitigation steps for maize farmers during heavy rain events.",
                keywords=("flood", "maize", "heavy rain"),
                country_codes=("GH",),
                published_at="2026-04-06",
            ),
        ),
        clock=lambda: SEED_TIMESTAMP,
    )
    advisory = retrieval.retrieve(
        AdvisoryRetrievalRequest(query="maize heavy rain soil stress", country_code="GH")
    )

    climate_pipeline = ClimateRiskIngestionPipeline()
    climate_signals = climate_pipeline.ingest(
        (
            ClimateIngestRecord(
                source_record_id="rain-001",
                source_type=ClimateSourceType.WEATHER,
                provider="meteo",
                country_code="GH",
                farm_id="farm-001",
                observed_at=SEED_TIMESTAMP,
                metric_name="rainfall_24h",
                value=96.0,
                unit="mm",
                latitude=5.5,
                longitude=-0.2,
                confidence=0.95,
            ),
            ClimateIngestRecord(
                source_record_id="ndvi-001",
                source_type=ClimateSourceType.SATELLITE,
                provider="chirps",
                country_code="GH",
                farm_id="farm-001",
                observed_at=SEED_TIMESTAMP,
                metric_name="ndvi",
                value=0.21,
                unit="ratio",
                latitude=5.5,
                longitude=-0.2,
                confidence=0.92,
            ),
            ClimateIngestRecord(
                source_record_id="soil-001",
                source_type=ClimateSourceType.SATELLITE,
                provider="chirps",
                country_code="GH",
                farm_id="farm-001",
                observed_at=SEED_TIMESTAMP,
                metric_name="soil_moisture",
                value=0.18,
                unit="ratio",
                latitude=5.5,
                longitude=-0.2,
                confidence=0.9,
            ),
        )
    )
    climate_alerts = ClimateAlertRulesEngine().evaluate(
        signals=climate_signals,
        context=FarmClimateContext(
            farm_id="farm-001",
            country_code="GH",
            crop_type="maize",
            season="flowering",
        ),
    )

    finance_adapter = FinancePartnerDecisionAdapter()
    finance_adapter.register_partner(
        FinancePartnerConfig(
            partner_id="apollo-credit",
            decision_types=(FinanceDecisionType.CREDIT, FinanceDecisionType.INSURANCE),
            supported_countries=("GH", "NG"),
            max_amount_minor=2_000_000,
            manual_review_amount_minor=750_000,
            manual_review_risk_score=0.45,
            decline_risk_score=0.8,
            responsibility_boundary=_boundary(),
        )
    )
    finance_case = finance_adapter.submit(
        FinancePartnerDecisionRequest(
            request_id="finance-case-001",
            idempotency_key="seed-finance-case-001",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.CREDIT,
            partner_id="apollo-credit",
            country_code="GH",
            applicant_id="farmer-001",
            product_code="seasonal-input-loan",
            amount_minor=900_000,
            currency="GHS",
            risk_score=0.5,
            actor_id="svc-finance",
            policy_context={"seed": True, "risk_class": "medium"},
            evidence_reference_ids=("wallet:ledger-ready", "policy:case-001"),
        )
    )
    insurance_decision = finance_adapter.submit(
        FinancePartnerDecisionRequest(
            request_id="insurance-trigger-001",
            idempotency_key="seed-insurance-trigger-001",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.INSURANCE,
            partner_id="apollo-credit",
            country_code="GH",
            applicant_id="farmer-001",
            product_code="dryness-cover",
            amount_minor=420_000,
            currency="GHS",
            risk_score=0.2,
            actor_id="svc-finance",
            policy_context={"seed": True, "risk_class": "low"},
            evidence_reference_ids=("mrv:record-001",),
        )
    )
    insurance_registry = InsuranceParametricTriggerRegistry()
    insurance_registry.register(
        ParametricTriggerDefinition(
            trigger_id="insurance-trigger-001",
            partner_id="apollo-credit",
            country_code="GH",
            product_code="dryness-cover",
            coverage_currency="GHS",
            thresholds=(
                ParametricTriggerThreshold(
                    metric_name="soil_moisture_ratio",
                    operator=TriggerOperator.LTE,
                    threshold_value=0.2,
                    payout_factor=0.3,
                    source_reference="chirps.v1:soil_moisture",
                ),
            ),
            evidence_reference_ids=("mrv:record-001", "policy:threshold-001"),
        )
    )
    [insurance_event] = insurance_registry.evaluate(
        signal=climate_signals[-1],
        partner_decision=insurance_decision,
        coverage_amount_minor=1_000_000,
    )

    traceability = TraceabilityEventChainService()
    listed_event = traceability.start_chain(
        consignment_id="consignment-001",
        listing=listing_primary,
        actor_id="coop-001",
        occurred_at=SEED_TIMESTAMP,
        location_code="GH-ASH",
        evidence_reference_ids=("listing:published",),
    )
    quality_event = traceability.append_event(
        consignment_id="consignment-001",
        event_type=TraceabilityEventType.QUALITY_CHECKED,
        actor_id="advisor-001",
        occurred_at="2026-04-13T18:05:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("evidence-001",),
        payload={"grade": "A"},
    )

    analytics_row = EnterpriseAnalyticsDataMartContract().project_bundle(
        EnterpriseAnalyticsSourceBundle(
            country_code="GH",
            listing=listing_primary,
            climate_signals=climate_signals,
            traceability_events=(listed_event, quality_event),
            citations=advisory.citations,
        )
    )

    observability = ObservabilityInstrumentationService()
    for index, latency in enumerate((780, 820, 910), start=1):
        observability.record_span(
            TraceSpan(
                trace_id=f"trace-admin-{index}",
                span_id=f"span-admin-{index}",
                channel=TelemetryChannel.API,
                country_code="GH",
                operation="admin.analytics.load",
                latency_ms=latency,
                status=SpanStatus.OK,
                emitted_at=SEED_TIMESTAMP,
                tags={
                    "channel": "api",
                    "country_code": "GH",
                    "operation": "admin.analytics.load",
                },
            )
        )
    slo_decision = observability.evaluate_slo(
        ServiceLevelObjective(
            slo_id="slo-admin-analytics",
            channel=TelemetryChannel.API,
            country_code="GH",
            operation="admin.analytics.load",
            min_success_rate=0.99,
            max_p95_latency_ms=1_200,
            min_sample_size=3,
        )
    )

    state = {
        "schema_version": SCHEMA_VERSION,
        "profile": profile,
        "seed_namespace": f"agrodomain:{profile}",
        "seeded": True,
        "seeded_at": SEED_TIMESTAMP,
        "routes": {
            "signin": "/signin",
            "home": "/app/home",
            "onboarding": "/app/onboarding",
            "consent": "/app/onboarding/consent",
        },
        "users": {
            "farmer-001": {
                "role": "farmer",
                "email": "farmer-001@staging.invalid",
                "home_route": _serialize_role_home("farmer"),
            },
            "buyer-001": {
                "role": "buyer",
                "email": "buyer-001@staging.invalid",
                "home_route": _serialize_role_home("buyer"),
            },
            "advisor-001": {
                "role": "advisor",
                "email": "advisor-001@staging.invalid",
                "home_route": _serialize_role_home("advisor"),
            },
            "finance-001": {
                "role": "finance",
                "email": "finance-001@staging.invalid",
                "home_route": _serialize_role_home("finance"),
            },
            "admin-001": {
                "role": "admin",
                "email": "admin-001@staging.invalid",
                "home_route": _serialize_role_home("admin"),
            },
        },
        "auth": {
            "current_user_id": None,
            "current_role": None,
            "current_home_route": None,
            "last_login_at": None,
        },
        "consent": {
            "record_id": "consent-001",
            "user_id": "farmer-001",
            "accepted": False,
            "accepted_at": None,
        },
        "listings": {
            listing_primary.listing_id: asdict(listing_primary),
            listing_draft.listing_id: asdict(listing_draft),
        },
        "negotiation": {
            "thread_id": thread.thread_id,
            "listing_id": thread.listing_id,
            "buyer_id": thread.buyer_id,
            "seller_id": thread.seller_id,
            "currency": thread.currency,
            "state": thread.state.value,
            "current_amount_minor": thread.current_amount_minor,
            "offers": [asdict(offer) for offer in thread.offers],
            "confirmation_requested": False,
            "approved_at": None,
        },
        "escrow": {
            "escrow_id": "escrow-001",
            "state": "not_created",
            "funding_status": "none",
            "amount_minor": 470_000,
            "currency": "GHS",
            "buyer_wallet_id": "wallet-buyer-001",
            "seller_wallet_id": "wallet-seller-001",
            "escrow_wallet_id": "escrow:escrow-001",
            "ledger_balances": {
                "wallet-buyer-001:GHS": 900_000,
                "wallet-seller-001:GHS": 100_000,
                "escrow:escrow-001:GHS": 0,
            },
            "events": [],
            "released_at": None,
        },
        "advisory": {
            "request_id": "advisory-001",
            "status": "pending_attachment",
            "query": advisory.query,
            "country_code": advisory.country_code,
            "citations": [asdict(citation) for citation in advisory.citations],
            "attached_source_ids": [],
        },
        "climate": {
            "signals": [asdict(signal) for signal in climate_signals],
            "alerts": {
                f"alert-{index:03d}": {
                    **asdict(decision),
                    "acknowledged": False,
                    "acknowledged_at": None,
                }
                for index, decision in enumerate(climate_alerts, start=1)
            },
        },
        "finance": {
            "case_id": "finance-case-001",
            "partner_decision": finance_case.as_payload(),
            "approval_state": "pending",
            "review_started_at": None,
            "decision_at": None,
        },
        "insurance": {
            "trigger_id": "insurance-trigger-001",
            "candidate_event": asdict(insurance_event),
            "emitted": False,
            "emitted_at": None,
        },
        "traceability": {
            "consignment_id": "consignment-001",
            "events": [asdict(listed_event), asdict(quality_event)],
            "evidence": {
                "evidence-001": {
                    "checksum": "sha256:evidence-001",
                    "preview_url": "https://example.invalid/evidence-001",
                },
                "evidence-002": {
                    "checksum": "sha256:evidence-002",
                    "preview_url": "https://example.invalid/evidence-002",
                },
            },
        },
        "admin": {
            "analytics_row": analytics_row.as_payload(),
            "observability_alerts": [asdict(slo_decision)],
            "counters": {
                "consent_events": 0,
                "listing_publications": 0,
                "negotiation_approvals": 0,
                "escrow_releases": 0,
                "advisory_updates": 0,
                "climate_acknowledgements": 0,
                "finance_decisions": 0,
                "traceability_updates": 0,
            },
        },
        "audit_log": [
            {
                "event_type": "seed.applied",
                "actor_id": "system",
                "occurred_at": SEED_TIMESTAMP,
                "payload": {"profile": profile},
            }
        ],
    }
    state["seed_fingerprint"] = compute_state_fingerprint(state)
    return state


def seed_state(state_path: Path, profile: str = "e2e-critical") -> dict[str, Any]:
    desired_state = build_seed_state(profile)
    current_state = load_state(state_path)
    current_fingerprint = current_state.get("seed_fingerprint")
    applied = current_fingerprint != desired_state["seed_fingerprint"]
    write_state(state_path, desired_state)
    return {
        "profile": profile,
        "applied": applied,
        "idempotent": not applied,
        "seed_fingerprint": desired_state["seed_fingerprint"],
        "state_path": str(state_path),
        "seeded_ids": {
            "users": sorted(desired_state["users"].keys()),
            "listings": sorted(desired_state["listings"].keys()),
            "negotiation": desired_state["negotiation"]["thread_id"],
            "escrow": desired_state["escrow"]["escrow_id"],
            "advisory": desired_state["advisory"]["request_id"],
            "finance": desired_state["finance"]["case_id"],
            "traceability": desired_state["traceability"]["consignment_id"],
        },
    }


def teardown_state(state_path: Path, profile: str = "e2e-critical") -> dict[str, Any]:
    existed = state_path.exists()
    if existed:
        state_path.unlink()
    verification = not state_path.exists()
    return {
        "profile": profile,
        "removed": existed,
        "idempotent": not existed,
        "verification_passed": verification,
        "state_path": str(state_path),
    }


def _append_audit(state: dict[str, Any], event_type: str, actor_id: str, payload: dict[str, Any]) -> None:
    state.setdefault("audit_log", []).append(
        {
            "event_type": event_type,
            "actor_id": actor_id,
            "occurred_at": SEED_TIMESTAMP,
            "payload": payload,
        }
    )


def _increment_counter(state: dict[str, Any], key: str) -> None:
    state["admin"]["counters"][key] += 1


def _update_admin_metrics(state: dict[str, Any]) -> None:
    counters = state["admin"]["counters"]
    state["admin"]["analytics_row"]["metric_value"]["user_actions"] = sum(counters.values())
    state["admin"]["analytics_row"]["metric_value"]["approved_finance_cases"] = counters["finance_decisions"]
    state["admin"]["analytics_row"]["metric_value"]["released_escrows"] = counters["escrow_releases"]


def apply_action(state: dict[str, Any], action: str, actor_id: str) -> dict[str, Any]:
    next_state = deepcopy(state)
    if action == "accept-consent":
        next_state["consent"]["accepted"] = True
        next_state["consent"]["accepted_at"] = SEED_TIMESTAMP
        next_state["auth"]["current_user_id"] = actor_id
        next_state["auth"]["current_role"] = next_state["users"][actor_id]["role"]
        next_state["auth"]["current_home_route"] = next_state["users"][actor_id]["home_route"]
        _increment_counter(next_state, "consent_events")
        _append_audit(next_state, "consent.accepted", actor_id, {"record_id": "consent-001"})
    elif action == "publish-draft-listing":
        draft = next_state["listings"]["listing-draft-001"]
        draft["status"] = ListingStatus.PUBLISHED.value
        draft["version"] += 1
        draft["updated_at"] = SEED_TIMESTAMP_OFFSET
        _increment_counter(next_state, "listing_publications")
        _append_audit(next_state, "listing.published", actor_id, {"listing_id": "listing-draft-001"})
    elif action == "approve-negotiation":
        negotiation = next_state["negotiation"]
        if negotiation["state"] != NegotiationState.ACCEPTED.value:
            negotiation["offers"].append(
                {
                    "round_number": len(negotiation["offers"]) + 1,
                    "actor_id": "buyer-001",
                    "amount_minor": 470_000,
                    "note": "approved final terms",
                    "created_at": SEED_TIMESTAMP,
                }
            )
            negotiation["confirmation_requested"] = True
            negotiation["state"] = NegotiationState.ACCEPTED.value
            negotiation["approved_at"] = SEED_TIMESTAMP
            _increment_counter(next_state, "negotiation_approvals")
            _append_audit(next_state, "negotiation.approved", actor_id, {"thread_id": "negotiation-001"})
    elif action == "fund-escrow":
        escrow = next_state["escrow"]
        if escrow["state"] == "not_created":
            escrow["state"] = "funded"
            escrow["funding_status"] = "completed"
            escrow["events"].append(
                {
                    "event_id": "escrow-001:01",
                    "event_type": "escrow_funded",
                    "actor_id": actor_id,
                    "occurred_at": SEED_TIMESTAMP,
                    "metadata": {"payment_reference": "pay-001"},
                }
            )
            escrow["ledger_balances"]["wallet-buyer-001:GHS"] = 430_000
            escrow["ledger_balances"]["escrow:escrow-001:GHS"] = 470_000
            _append_audit(next_state, "escrow.funded", actor_id, {"escrow_id": "escrow-001"})
    elif action == "release-escrow":
        escrow = next_state["escrow"]
        if escrow["state"] != "released":
            if escrow["state"] == "not_created":
                next_state = apply_action(next_state, "fund-escrow", actor_id)
                escrow = next_state["escrow"]
            escrow["state"] = "released"
            escrow["released_at"] = SEED_TIMESTAMP
            escrow["ledger_balances"]["escrow:escrow-001:GHS"] = 0
            escrow["ledger_balances"]["wallet-seller-001:GHS"] = 570_000
            escrow["events"].append(
                {
                    "event_id": "escrow-001:02",
                    "event_type": "escrow_released",
                    "actor_id": actor_id,
                    "occurred_at": SEED_TIMESTAMP,
                    "metadata": {"hitl_approved": True},
                }
            )
            _increment_counter(next_state, "escrow_releases")
            _append_audit(next_state, "escrow.released", actor_id, {"escrow_id": "escrow-001"})
    elif action == "attach-advisory-citations":
        advisory = next_state["advisory"]
        advisory["status"] = "citations_attached"
        advisory["attached_source_ids"] = [
            citation["source_id"] for citation in advisory["citations"]
        ]
        _increment_counter(next_state, "advisory_updates")
        _append_audit(next_state, "advisory.attached", actor_id, {"request_id": "advisory-001"})
    elif action == "acknowledge-alert":
        first_alert = sorted(next_state["climate"]["alerts"])[0]
        next_state["climate"]["alerts"][first_alert]["acknowledged"] = True
        next_state["climate"]["alerts"][first_alert]["acknowledged_at"] = SEED_TIMESTAMP
        _increment_counter(next_state, "climate_acknowledgements")
        _append_audit(next_state, "climate.acknowledged", actor_id, {"alert_id": first_alert})
    elif action == "approve-finance-case":
        next_state["finance"]["approval_state"] = "approved"
        next_state["finance"]["review_started_at"] = SEED_TIMESTAMP
        next_state["finance"]["decision_at"] = SEED_TIMESTAMP
        next_state["insurance"]["emitted"] = True
        next_state["insurance"]["emitted_at"] = SEED_TIMESTAMP
        _increment_counter(next_state, "finance_decisions")
        _append_audit(next_state, "finance.approved", actor_id, {"case_id": "finance-case-001"})
    elif action == "append-traceability-dispatch":
        traceability = next_state["traceability"]
        events = traceability["events"]
        if events[-1]["event_type"] != TraceabilityEventType.DISPATCHED.value:
            previous = events[-1]
            payload = {
                "event_id": "consignment-001:3",
                "consignment_id": "consignment-001",
                "listing_id": "listing-001",
                "sequence": 3,
                "event_type": TraceabilityEventType.DISPATCHED.value,
                "actor_id": actor_id,
                "occurred_at": SEED_TIMESTAMP,
                "location_code": "GH-TML",
                "evidence_reference_ids": ["evidence-001", "evidence-002"],
                "payload": {"vehicle_id": "truck-001"},
                "previous_event_hash": previous["event_hash"],
                "data_check_id": "DI-006",
            }
            payload["event_hash"] = compute_event_hash(payload)
            events.append(payload)
            _increment_counter(next_state, "traceability_updates")
            _append_audit(next_state, "traceability.dispatched", actor_id, {"consignment_id": "consignment-001"})
    else:
        raise ValueError(f"Unknown action: {action}")

    _update_admin_metrics(next_state)
    next_state["seed_fingerprint"] = compute_state_fingerprint(next_state)
    return next_state


def verify_check(state: dict[str, Any], check_name: str) -> dict[str, Any]:
    if check_name not in VERIFY_CHECKS:
        raise KeyError(check_name)
    advisory = state.get("advisory", {})
    first_alert_key = sorted(state.get("climate", {}).get("alerts", {"alert-001": {}}))[0]
    checks = {
        "auth-onboarding": {
            "passed": bool(
                state.get("consent", {}).get("accepted")
                and state.get("auth", {}).get("current_home_route")
            ),
            "details": {
                "consent_accepted": state.get("consent", {}).get("accepted"),
                "current_home_route": state.get("auth", {}).get("current_home_route"),
            },
        },
        "listing-publish": {
            "passed": state.get("listings", {}).get("listing-draft-001", {}).get("status")
            == ListingStatus.PUBLISHED.value,
            "details": state.get("listings", {}).get("listing-draft-001", {}),
        },
        "negotiation-approval": {
            "passed": state.get("negotiation", {}).get("state") == NegotiationState.ACCEPTED.value,
            "details": state.get("negotiation", {}),
        },
        "escrow-release": {
            "passed": state.get("escrow", {}).get("state") == "released"
            and state.get("escrow", {}).get("ledger_balances", {}).get("escrow:escrow-001:GHS") == 0,
            "details": state.get("escrow", {}),
        },
        "advisory-citations": {
            "passed": advisory.get("status") == "citations_attached"
            and len(advisory.get("attached_source_ids", [])) >= 3,
            "details": advisory,
        },
        "climate-ack": {
            "passed": state.get("climate", {}).get("alerts", {}).get(first_alert_key, {}).get("acknowledged") is True,
            "details": state.get("climate", {}).get("alerts", {}).get(first_alert_key, {}),
        },
        "finance-hitl": {
            "passed": state.get("finance", {}).get("approval_state") == "approved"
            and state.get("insurance", {}).get("emitted") is True,
            "details": {
                "finance": state.get("finance", {}),
                "insurance": state.get("insurance", {}),
            },
        },
        "traceability-dispatch": {
            "passed": state.get("traceability", {}).get("events", [])[-1]["event_type"]
            == TraceabilityEventType.DISPATCHED.value,
            "details": state.get("traceability", {}),
        },
        "admin-analytics": {
            "passed": sum(state.get("admin", {}).get("counters", {}).values()) > 0
            and bool(state.get("admin", {}).get("observability_alerts")),
            "details": state.get("admin", {}),
        },
    }
    full_pass = all(item["passed"] for item in checks.values())
    checks["full-critical"] = {
        "passed": full_pass,
        "details": {name: item["passed"] for name, item in checks.items()},
    }
    result = checks[check_name]
    return {"check": check_name, **result}


def verify_checks(state: dict[str, Any]) -> dict[str, Any]:
    results = {name: verify_check(state, name) for name in VERIFY_CHECKS if name != "full-critical"}
    results["full-critical"] = verify_check(state, "full-critical")
    results["passed"] = all(item["passed"] for key, item in results.items() if key != "passed")
    return results


def _session_secret() -> str:
    return os.getenv("AGRODOMAIN_AUTH_SECRET", "development-secret-change-me")


def sign_session(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    signature = hmac.new(_session_secret().encode("utf-8"), body.encode("utf-8"), sha256).hexdigest()
    return f"{body}.{signature}"


def decode_session(token: str | None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    body, signature = token.rsplit(".", 1)
    expected = hmac.new(_session_secret().encode("utf-8"), body.encode("utf-8"), sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    padding = "=" * (-len(body) % 4)
    decoded = base64.urlsafe_b64decode((body + padding).encode("utf-8"))
    return json.loads(decoded.decode("utf-8"))


def _verify_header(request: Request) -> None:
    required = os.getenv("AGRODOMAIN_E2E_VERIFY_KEY")
    if required and request.headers.get("X-E2E-Verify-Key") != required:
        raise HTTPException(status_code=401, detail="verification key required")


def _session_from_request(request: Request) -> dict[str, Any]:
    session = decode_session(request.cookies.get("agrodomain_staging_session"))
    if session is None:
        raise HTTPException(status_code=307, detail="signin required")
    return session


def _html(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    body {{ font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f4f1e8; color: #152219; }}
    header {{ padding: 20px 24px; background: #1f4f3b; color: #f8f4e8; }}
    main {{ padding: 24px; display: grid; gap: 16px; max-width: 960px; }}
    section {{ background: white; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }}
    nav a {{ margin-right: 12px; color: #f8f4e8; }}
    form {{ display: inline-block; margin: 6px 8px 0 0; }}
    button {{ border: 0; border-radius: 999px; padding: 10px 16px; background: #cc7a00; color: white; cursor: pointer; }}
    code, pre {{ background: #f6f4ef; padding: 2px 4px; border-radius: 4px; }}
    .meta {{ color: #5c665e; font-size: 14px; }}
  </style>
</head>
<body>{body}</body>
</html>"""


def _render_shell(state: dict[str, Any], session: dict[str, Any], title: str, content: str) -> HTMLResponse:
    nav = """
      <nav>
        <a href="/app/onboarding/consent">Consent</a>
        <a href="/app/listings/new">Listings</a>
        <a href="/app/negotiation">Negotiation</a>
        <a href="/app/wallet">Wallet</a>
        <a href="/app/advisory/new">Advisory</a>
        <a href="/app/climate/alerts">Climate</a>
        <a href="/app/finance/queue">Finance</a>
        <a href="/app/traceability">Traceability</a>
        <a href="/app/admin/analytics">Admin</a>
      </nav>
    """
    body = f"""
    <header>
      <div data-testid="app-shell"><strong>{title}</strong></div>
      <div class="meta">Signed in as {session['user_id']} ({session['role']})</div>
      {nav}
    </header>
    <main>{content}</main>
    """
    return HTMLResponse(_html(title, body))


def create_app() -> FastAPI:
    app = FastAPI(title="Agrodomain staging runtime", version="0.1.0")
    state_path = resolve_state_path(None)

    def load() -> dict[str, Any]:
        return load_state(state_path)

    def save(state: dict[str, Any]) -> None:
        write_state(state_path, state)

    @app.get("/healthz")
    async def healthz() -> dict[str, Any]:
        state = load()
        return {
            "ok": True,
            "schema_version": SCHEMA_VERSION,
            "seeded": state.get("seeded", False),
            "profile": state.get("profile"),
            "state_path": str(state_path),
        }

    @app.post("/api/e2e/seed")
    async def api_seed(profile: str = "e2e-critical") -> dict[str, Any]:
        return seed_state(state_path, profile)

    @app.post("/api/e2e/teardown")
    async def api_teardown(profile: str = "e2e-critical") -> dict[str, Any]:
        return teardown_state(state_path, profile)

    @app.get("/api/e2e/state/checks")
    async def api_checks(request: Request) -> dict[str, Any]:
        _verify_header(request)
        return verify_checks(load())

    @app.get("/api/e2e/state/checks/{check_name}")
    async def api_check(check_name: str, request: Request) -> dict[str, Any]:
        _verify_header(request)
        return verify_check(load(), check_name)

    @app.get("/signin")
    async def signin(role: str = "farmer") -> HTMLResponse:
        state = load()
        options = "".join(
            f'<option value="{user_id}" {"selected" if data["role"] == role else ""}>{user_id} ({data["role"]})</option>'
            for user_id, data in state.get("users", {}).items()
        )
        body = f"""
        <header><strong>Agrodomain staging signin</strong></header>
        <main>
          <section>
            <p>Deterministic auth-backed staging surface for Playwright and agent-driven E2E checks.</p>
            <form method="post" action="/auth/test-login">
              <label>User
                <select name="user_id">{options}</select>
              </label>
              <button type="submit">Continue with staging profile</button>
            </form>
          </section>
        </main>
        """
        return HTMLResponse(_html("Signin", body))

    @app.post("/auth/test-login")
    async def test_login(user_id: str = Form(...)) -> RedirectResponse:
        state = load()
        if user_id not in state.get("users", {}):
            raise HTTPException(status_code=404, detail="unknown user")
        user = state["users"][user_id]
        state["auth"]["current_user_id"] = user_id
        state["auth"]["current_role"] = user["role"]
        state["auth"]["current_home_route"] = user["home_route"]
        state["auth"]["last_login_at"] = SEED_TIMESTAMP
        save(state)
        response = RedirectResponse(url=quote(user["home_route"], safe="/:?=&"), status_code=303)
        response.set_cookie(
            "agrodomain_staging_session",
            sign_session({"user_id": user_id, "role": user["role"]}),
            httponly=True,
            samesite="lax",
        )
        return response

    @app.get("/app/home")
    async def app_home(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        content = f"""
        <section>
          <h1>Critical journey dashboard</h1>
          <p>Seed fingerprint: <code>{state.get("seed_fingerprint")}</code></p>
        </section>
        """
        return _render_shell(state, session, "Home", content)

    @app.get("/app/farmer")
    async def farmer_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/buyer")
    async def buyer_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/cooperative")
    async def cooperative_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/advisor")
    async def advisor_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/finance")
    async def finance_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/admin")
    async def admin_home(request: Request) -> RedirectResponse:
        _session_from_request(request)
        return RedirectResponse(url="/app/home", status_code=307)

    @app.get("/app/onboarding/consent")
    async def consent_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        consent = state["consent"]
        content = f"""
        <section>
          <h1>Consent</h1>
          <p>Accepted: <strong>{consent["accepted"]}</strong></p>
          <form method="post" action="/actions/accept-consent">
            <button type="submit">Accept consent</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Consent", content)

    @app.get("/app/listings/new")
    async def listings_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        draft = state["listings"]["listing-draft-001"]
        content = f"""
        <section>
          <h1>Seeded draft listing</h1>
          <p>Status: <strong>{draft["status"]}</strong></p>
          <form method="post" action="/actions/publish-draft-listing">
            <button type="submit">Publish seeded draft listing</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Listings", content)

    @app.get("/app/negotiation")
    async def negotiation_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        negotiation = state["negotiation"]
        content = f"""
        <section>
          <h1>Negotiation</h1>
          <p>State: <strong>{negotiation["state"]}</strong></p>
          <p>Current amount: <strong>{negotiation["current_amount_minor"]}</strong></p>
          <form method="post" action="/actions/approve-negotiation">
            <button type="submit">Approve negotiation</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Negotiation", content)

    @app.get("/app/wallet")
    async def wallet_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        escrow = state["escrow"]
        content = f"""
        <section>
          <h1>Escrow wallet</h1>
          <p>State: <strong>{escrow["state"]}</strong></p>
          <form method="post" action="/actions/fund-escrow">
            <button type="submit">Fund escrow</button>
          </form>
          <form method="post" action="/actions/release-escrow">
            <button type="submit">Release escrow</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Wallet", content)

    @app.get("/app/advisory/new")
    async def advisory_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        advisory = state["advisory"]
        content = f"""
        <section>
          <h1>Advisory</h1>
          <p>Status: <strong>{advisory["status"]}</strong></p>
          <form method="post" action="/actions/attach-advisory-citations">
            <button type="submit">Attach vetted citations</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Advisory", content)

    @app.get("/app/climate/alerts")
    async def climate_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        alert_key = sorted(state["climate"]["alerts"])[0]
        alert = state["climate"]["alerts"][alert_key]
        content = f"""
        <section>
          <h1>Climate alerts</h1>
          <p>Primary alert: <strong>{alert["alert_type"]}</strong></p>
          <p>Acknowledged: <strong>{alert["acknowledged"]}</strong></p>
          <form method="post" action="/actions/acknowledge-alert">
            <button type="submit">Acknowledge alert</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Climate", content)

    @app.get("/app/finance/queue")
    async def finance_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        finance = state["finance"]
        content = f"""
        <section>
          <h1>Finance queue</h1>
          <p>Approval state: <strong>{finance["approval_state"]}</strong></p>
          <form method="post" action="/actions/approve-finance-case">
            <button type="submit">Approve finance case</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Finance", content)

    @app.get("/app/traceability")
    async def traceability_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        content = f"""
        <section>
          <h1>Traceability</h1>
          <p>Events: <strong>{len(state["traceability"]["events"])}</strong></p>
          <form method="post" action="/actions/append-traceability-dispatch">
            <button type="submit">Append dispatch event</button>
          </form>
        </section>
        """
        return _render_shell(state, session, "Traceability", content)

    @app.get("/app/admin/analytics")
    async def admin_page(request: Request) -> HTMLResponse:
        session = _session_from_request(request)
        state = load()
        content = f"""
        <section>
          <h1>Admin analytics</h1>
          <pre>{json.dumps(state["admin"]["analytics_row"], indent=2, sort_keys=True)}</pre>
          <p>Observability alerts: <strong>{len(state["admin"]["observability_alerts"])}</strong></p>
        </section>
        """
        return _render_shell(state, session, "Admin", content)

    async def mutate(request: Request, action: str) -> RedirectResponse:
        session = _session_from_request(request)
        state = apply_action(load(), action, session["user_id"])
        save(state)
        return RedirectResponse(url=request.headers.get("referer", "/app/home"), status_code=303)

    @app.post("/actions/accept-consent")
    async def action_accept_consent(request: Request) -> RedirectResponse:
        return await mutate(request, "accept-consent")

    @app.post("/actions/publish-draft-listing")
    async def action_publish_listing(request: Request) -> RedirectResponse:
        return await mutate(request, "publish-draft-listing")

    @app.post("/actions/approve-negotiation")
    async def action_approve_negotiation(request: Request) -> RedirectResponse:
        return await mutate(request, "approve-negotiation")

    @app.post("/actions/fund-escrow")
    async def action_fund_escrow(request: Request) -> RedirectResponse:
        return await mutate(request, "fund-escrow")

    @app.post("/actions/release-escrow")
    async def action_release_escrow(request: Request) -> RedirectResponse:
        return await mutate(request, "release-escrow")

    @app.post("/actions/attach-advisory-citations")
    async def action_advisory(request: Request) -> RedirectResponse:
        return await mutate(request, "attach-advisory-citations")

    @app.post("/actions/acknowledge-alert")
    async def action_alert(request: Request) -> RedirectResponse:
        return await mutate(request, "acknowledge-alert")

    @app.post("/actions/approve-finance-case")
    async def action_finance(request: Request) -> RedirectResponse:
        return await mutate(request, "approve-finance-case")

    @app.post("/actions/append-traceability-dispatch")
    async def action_traceability(request: Request) -> RedirectResponse:
        return await mutate(request, "append-traceability-dispatch")

    return app


app = create_app()


def main() -> None:
    import uvicorn

    host = os.getenv("AGRODOMAIN_STAGING_HOST", "127.0.0.1")
    port = int(os.getenv("AGRODOMAIN_STAGING_PORT", "8000"))
    uvicorn.run("agro_v2.staging_runtime:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
