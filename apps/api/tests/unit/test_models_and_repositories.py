from datetime import UTC, datetime
from typing import cast

from sqlalchemy import select

from app.db.models.finance import FinanceRequestRecord, InsurancePayoutEventRecord
from app.db.models.marketplace import Listing, ListingRevision, NegotiationMessage, NegotiationThread
from app.db.models.platform import CountryPolicy
from app.db.models.traceability import TraceabilityEventRecord
from app.db.models.control_plane import RolloutStateRecord, TelemetryObservationRecord
from app.db.models.workflow import WorkflowExecution
from app.db.repositories.control_plane import ControlPlaneRepository
from app.db.repositories.finance import FinanceRepository
from app.db.repositories.identity import IdentityRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.traceability import TraceabilityContinuityError, TraceabilityRepository
from app.db.repositories.workflow import WorkflowRepository


def test_seeded_country_policy_is_available(session) -> None:
    policy = session.get(CountryPolicy, "GH")

    assert policy is not None
    assert policy.locale == "en-GH"


def test_workflow_repository_creates_execution(session) -> None:
    repository = WorkflowRepository(session)
    execution = repository.create_execution(
        request_id="request-1",
        command_name="workflow.command.dispatch",
        actor_id="system:test",
        country_code="GH",
        channel="pwa",
        schema_version="1.0.0",
        payload={"topic": "seed"},
        status="accepted",
    )
    session.commit()

    stored = session.execute(
        select(WorkflowExecution).where(WorkflowExecution.id == execution.id)
    ).scalar_one()
    assert stored.command_name == "workflow.command.dispatch"


def test_identity_repository_creates_session_payload(session) -> None:
    repository = IdentityRepository(session)
    repository.ensure_membership(actor_id="actor-farmer-gh-ama", role="farmer", country_code="GH")
    record = repository.create_or_rotate_session(
        actor_id="actor-farmer-gh-ama",
        display_name="Ama Mensah",
        email="ama@example.com",
        role="farmer",
        country_code="GH",
    )
    session.commit()

    payload = repository.build_session_payload(record)
    actor = cast(dict[str, str], payload["actor"])
    consent = cast(dict[str, object], payload["consent"])

    assert actor["actor_id"] == "actor-farmer-gh-ama"
    assert consent["state"] in {"identified", "consent_granted"}


def test_control_plane_repository_persists_telemetry_and_rollout_state(session) -> None:
    repository = ControlPlaneRepository(session)
    ingested_at = datetime.now(tz=UTC)
    changed_at = datetime.now(tz=UTC)

    telemetry = repository.create_telemetry_observation(
        observation_id="obs-001",
        idempotency_key="idem-obs-001",
        request_id="req-obs-001",
        actor_id="system:test",
        country_code="GH",
        channel="api",
        service_name="admin_control_plane",
        slo_id="PF-004",
        alert_severity="warning",
        audit_event_id=11,
        source_kind="api_runtime",
        window_started_at=ingested_at,
        window_ended_at=ingested_at,
        success_count=9,
        error_count=1,
        sample_count=10,
        latency_p95_ms=1400,
        stale_after_seconds=300,
        release_blocking=True,
        note="threshold breached",
        schema_version="2026-04-18.wave1",
        ingested_at=ingested_at,
    )
    rollout = repository.create_rollout_state(
        request_id="req-rollout-001",
        idempotency_key="idem-rollout-001",
        actor_id="system:test",
        actor_role="admin",
        country_code="GH",
        channel="api",
        service_name="rollout_control",
        slo_id=None,
        alert_severity=None,
        audit_event_id=12,
        scope_key="gh-rollout-control",
        state="frozen",
        previous_state="active",
        intent="freeze",
        reason_code="rollback_triggered",
        reason_detail="Freeze applied after blocking telemetry breach.",
        limited_release_percent=None,
        schema_version="2026-04-18.wave1",
        changed_at=changed_at,
    )
    session.commit()

    stored_telemetry = session.execute(
        select(TelemetryObservationRecord).where(
            TelemetryObservationRecord.observation_id == telemetry.observation_id
        )
    ).scalar_one()
    stored_rollout = session.execute(
        select(RolloutStateRecord).where(RolloutStateRecord.id == rollout.id)
    ).scalar_one()

    assert stored_telemetry.release_blocking is True
    assert stored_rollout.state == "frozen"
    assert repository.get_current_rollout_state(
        country_code="GH",
        service_name="rollout_control",
        scope_key="gh-rollout-control",
    ) is not None


def test_marketplace_repository_persists_listing(session) -> None:
    repository = MarketplaceRepository(session)
    listing = repository.create_listing(
        listing_id="listing-001",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        title="Premium cassava harvest",
        commodity="Cassava",
        quantity_tons=4.2,
        price_amount=320,
        price_currency="GHS",
        location="Tamale, GH",
        summary="Bagged cassava stock ready for pickup with moisture proof attached.",
    )
    session.commit()

    stored = session.execute(select(Listing).where(Listing.id == listing.id)).scalar_one()
    assert stored.listing_id == "listing-001"
    assert stored.actor_id == "actor-farmer-gh-ama"


def test_marketplace_repository_updates_listing(session) -> None:
    repository = MarketplaceRepository(session)
    listing = repository.create_listing(
        listing_id="listing-002",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        title="Fresh cassava harvest",
        commodity="Cassava",
        quantity_tons=2.4,
        price_amount=220,
        price_currency="GHS",
        location="Tamale, GH",
        summary="Fresh cassava stock ready for pickup with source documentation attached.",
    )
    session.commit()

    repository.update_listing(
        listing=listing,
        title="Fresh cassava harvest revised",
        commodity="Cassava",
        quantity_tons=2.9,
        price_amount=245,
        price_currency="GHS",
        location="Tamale central depot, GH",
        summary="Fresh cassava stock revised with verified storage and pickup instructions.",
    )
    session.commit()

    stored = session.execute(select(Listing).where(Listing.id == listing.id)).scalar_one()
    assert stored.title == "Fresh cassava harvest revised"
    assert stored.quantity_tons == 2.9
    assert stored.status == "draft"
    assert stored.revision_number == 2
    assert stored.revision_count == 2
    revisions = session.execute(
        select(ListingRevision)
        .where(ListingRevision.listing_id == "listing-002")
        .order_by(ListingRevision.revision_number.asc())
    ).scalars().all()
    assert len(revisions) == 2
    assert [revision.change_type for revision in revisions] == ["created", "draft_updated"]


def test_marketplace_repository_publishes_listing_and_tracks_revisions(session) -> None:
    repository = MarketplaceRepository(session)
    listing = repository.create_listing(
        listing_id="listing-003",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        title="Export maize lot",
        commodity="Maize",
        quantity_tons=6.1,
        price_amount=430,
        price_currency="GHS",
        location="Techiman, GH",
        summary="Export-grade maize lot with quality certificate and warehouse release note.",
    )
    session.commit()

    repository.publish_listing(listing=listing)
    session.commit()

    stored = session.execute(select(Listing).where(Listing.id == listing.id)).scalar_one()
    assert stored.status == "published"
    assert stored.revision_number == 2
    assert stored.published_revision_number == 2
    assert stored.revision_count == 2
    revisions = session.execute(
        select(ListingRevision)
        .where(ListingRevision.listing_id == "listing-003")
        .order_by(ListingRevision.revision_number.asc())
    ).scalars().all()
    assert [revision.status for revision in revisions] == ["draft", "published"]
    assert [revision.change_type for revision in revisions] == ["created", "published"]


def test_marketplace_repository_preserves_buyer_projection_until_republish(session) -> None:
    repository = MarketplaceRepository(session)
    listing = repository.create_listing(
        listing_id="listing-003b",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        title="Export yam lot",
        commodity="Yam",
        quantity_tons=6.4,
        price_amount=520,
        price_currency="GHS",
        location="Kumasi, GH",
        summary="Export-ready yam lot with grading sheet and pickup plan attached.",
    )
    repository.publish_listing(listing=listing)
    repository.update_listing(
        listing=listing,
        title="Export yam lot revised",
        commodity="Yam",
        quantity_tons=7.0,
        price_amount=560,
        price_currency="GHS",
        location="Kumasi consolidation yard, GH",
        summary="Revised export yam lot with updated grading sheet and pickup slots.",
    )
    session.commit()

    owner_projection = repository.build_owner_projection(listing=listing)
    buyer_projection = repository.get_published_listing(listing_id="listing-003b", country_code="GH")

    assert owner_projection.title == "Export yam lot revised"
    assert owner_projection.has_unpublished_changes is True
    assert owner_projection.published_revision_number == 2
    assert owner_projection.revision_count == 3
    assert buyer_projection is not None
    assert buyer_projection.title == "Export yam lot"
    assert buyer_projection.revision_number == 2
    assert buyer_projection.view_scope == "buyer_safe"


def test_marketplace_repository_persists_negotiation_threads(session) -> None:
    repository = MarketplaceRepository(session)
    listing = repository.create_listing(
        listing_id="listing-004",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        title="Soybean lot",
        commodity="Soybean",
        quantity_tons=7.0,
        price_amount=510,
        price_currency="GHS",
        location="Tamale, GH",
        summary="Soybean lot with drying record, source cooperative, and warehouse slip attached.",
    )
    repository.publish_listing(listing=listing)
    session.commit()

    thread = repository.create_negotiation_thread(
        thread_id="thread-001",
        listing_id=listing.listing_id,
        seller_actor_id=listing.actor_id,
        buyer_actor_id="actor-buyer-gh-kojo",
        country_code="GH",
        offer_amount=490,
        offer_currency="GHS",
        note="Initial offer",
        actor_id="actor-buyer-gh-kojo",
    )
    repository.update_negotiation_thread(
        thread=thread,
        status="open",
        actor_id=listing.actor_id,
        action="offer_countered",
        amount=505,
        currency="GHS",
        note="Counter offer",
    )
    repository.update_negotiation_thread(
        thread=thread,
        status="pending_confirmation",
        actor_id=listing.actor_id,
        action="confirmation_requested",
        note="Need buyer confirmation",
        confirmation_requested_by_actor_id=listing.actor_id,
        required_confirmer_actor_id="actor-buyer-gh-kojo",
    )
    session.commit()

    stored_thread = session.execute(
        select(NegotiationThread).where(NegotiationThread.thread_id == "thread-001")
    ).scalar_one()
    assert stored_thread.status == "pending_confirmation"
    assert stored_thread.required_confirmer_actor_id == "actor-buyer-gh-kojo"
    messages = session.execute(
        select(NegotiationMessage).where(NegotiationMessage.thread_id == "thread-001")
    ).scalars().all()
    assert len(messages) == 3


def test_finance_repository_persists_requests_and_decisions(session) -> None:
    repository = FinanceRepository(session)
    finance_request = repository.create_request(
        request_id="req-fin-001",
        idempotency_key="idem-fin-001",
        actor_id="actor-farmer-gh-ama",
        actor_role="farmer",
        country_code="GH",
        channel="pwa",
        correlation_id="corr-fin-001",
        case_reference="listing/listing-010",
        product_type="invoice_advance",
        requested_amount=1200.0,
        currency="GHS",
        partner_id="partner-agri-bank",
        partner_reference_id="partner-case-9",
        responsibility_boundary={
            "owner": "partner",
            "internal_can_prepare": True,
            "internal_can_block": True,
            "internal_can_approve": False,
            "partner_decision_required": True,
        },
        policy_context={
            "policy_id": "finance.partner.v1",
            "policy_version": "2026-04",
            "matched_rule": "finance.partner.invoice_advance",
            "requires_hitl": True,
        },
        transcript_entries=[{"speaker": "agent", "message": "submitted", "channel": "pwa"}],
        status="pending_partner",
    )
    repository.create_decision(
        finance_request_id=finance_request.finance_request_id,
        request_id="req-fin-002",
        actor_id="actor-finance-gh-1",
        actor_role="finance_ops",
        decision_source="partner",
        outcome="approved",
        reason_code="partner_approved",
        note="Partner approved",
        partner_reference_id="partner-case-9",
        responsibility_boundary=finance_request.responsibility_boundary,
        policy_context=finance_request.policy_context,
        transcript_link="audit://finance/finance-1/partner",
    )
    repository.update_request_status(record=finance_request, status="partner_approved")
    session.commit()

    stored = session.execute(
        select(FinanceRequestRecord).where(
            FinanceRequestRecord.finance_request_id == finance_request.finance_request_id
        )
    ).scalar_one()
    decisions = repository.list_decisions(finance_request_id=finance_request.finance_request_id)

    assert stored.status == "partner_approved"
    assert len(decisions) == 1
    assert decisions[0].outcome == "approved"


def test_finance_repository_payout_dedupe_key_remains_single_effect(session) -> None:
    repository = FinanceRepository(session)
    trigger = repository.upsert_trigger(
        trigger_id="trigger-rain-1",
        actor_id="actor-finance-gh-1",
        actor_role="finance_ops",
        country_code="GH",
        partner_id="partner-insurer-1",
        partner_reference_id="policy-7",
        product_code="rainfall-cover",
        climate_signal="rainfall_mm",
        comparator="gte",
        threshold_value=75,
        threshold_unit="mm",
        evaluation_window_hours=24,
        threshold_source_id="threshold-1",
        threshold_source_type="policy_table",
        threshold_source_reference={"table": "gh_rainfall_v2"},
        payout_amount=450,
        payout_currency="GHS",
        policy_context={
            "policy_id": "insurance.parametric.v1",
            "policy_version": "2026-04",
            "matched_rule": "insurance.rainfall.gte",
            "requires_hitl": False,
        },
    )
    payout = repository.create_payout_event(
        trigger=trigger,
        evaluation_id="evaluation-1",
        actor_id="actor-finance-gh-1",
        actor_role="finance_ops",
        country_code="GH",
        partner_reference_id="policy-7",
        payout_dedupe_key="trigger-rain-1:climate-event-1",
        climate_source_reference={"source_id": "obs-1", "source_type": "climate_observation"},
    )
    session.commit()

    stored = session.execute(
        select(InsurancePayoutEventRecord).where(
            InsurancePayoutEventRecord.payout_dedupe_key == "trigger-rain-1:climate-event-1"
        )
    ).scalar_one()

    assert stored.payout_event_id == payout.payout_event_id
    assert repository.find_payout_event(payout_dedupe_key="trigger-rain-1:climate-event-1") is not None


def test_traceability_repository_enforces_continuity_and_idempotent_append(session) -> None:
    repository = TraceabilityRepository(session)
    consignment = repository.create_consignment(
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        correlation_id="corr-trace-1",
        partner_reference_id="partner-consignment-1",
        current_custody_actor_id="actor-farmer-gh-ama",
    )
    session.commit()

    first = repository.append_event(
        consignment=consignment,
        request_id="req-trace-1",
        idempotency_key="idem-trace-1",
        actor_id="actor-farmer-gh-ama",
        actor_role="farmer",
        country_code="GH",
        correlation_id="corr-trace-1",
        causation_id=None,
        milestone="harvested",
        event_reference="evt-ref-1",
        previous_event_reference=None,
        occurred_at=datetime(2026, 4, 18, 8, 0, tzinfo=UTC),
        current_custody_actor_id="actor-farmer-gh-ama",
    )
    duplicate = repository.append_event(
        consignment=consignment,
        request_id="req-trace-2",
        idempotency_key="idem-trace-1",
        actor_id="actor-farmer-gh-ama",
        actor_role="farmer",
        country_code="GH",
        correlation_id="corr-trace-1",
        causation_id=None,
        milestone="harvested",
        event_reference="evt-ref-1",
        previous_event_reference=None,
        occurred_at=datetime(2026, 4, 18, 8, 0, tzinfo=UTC),
        current_custody_actor_id="actor-farmer-gh-ama",
    )
    session.commit()

    assert first.trace_event_id == duplicate.trace_event_id
    assert len(session.execute(select(TraceabilityEventRecord)).scalars().all()) == 1

    try:
        repository.append_event(
            consignment=consignment,
            request_id="req-trace-3",
            idempotency_key="idem-trace-3",
            actor_id="actor-farmer-gh-ama",
            actor_role="farmer",
            country_code="GH",
            correlation_id="corr-trace-1",
            causation_id="cause-x",
            milestone="dispatched",
            event_reference="evt-ref-2",
            previous_event_reference="wrong-ref",
            occurred_at=datetime(2026, 4, 18, 9, 0, tzinfo=UTC),
            current_custody_actor_id="actor-transporter-gh-1",
        )
    except TraceabilityContinuityError as exc:
        assert exc.reason_code == "traceability_missing_predecessor"
    else:
        raise AssertionError("continuity gap should fail")
