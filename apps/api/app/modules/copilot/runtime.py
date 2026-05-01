from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.core.auth import AuthContext
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.marketplace import Listing, NegotiationThread
from app.db.models.transport import Shipment, TransportLoad
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.transport import TransportRepository
from app.modules.channels.copilot import build_copilot_dispatch_plan

SELLER_ROLES = {"farmer", "cooperative", "admin"}
HUMAN_KEYWORDS = {"agent", "advisor", "human", "person", "reviewer", "support"}
UNSUPPORTED_KEYWORDS = {
    "bank",
    "escrow",
    "finance",
    "fund",
    "insurance",
    "invest",
    "loan",
    "pay",
    "payment",
    "wallet",
}


@dataclass(slots=True, frozen=True)
class CopilotResolveRequest:
    route_path: str
    locale: str
    message: str
    transcript_entries: list[dict[str, object]]
    context: dict[str, str | None]


class CopilotRuntime:
    def __init__(
        self,
        *,
        climate_repository: ClimateRepository,
        marketplace_repository: MarketplaceRepository,
        transport_repository: TransportRepository,
    ) -> None:
        self.climate_repository = climate_repository
        self.marketplace_repository = marketplace_repository
        self.transport_repository = transport_repository

    def resolve(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
    ) -> dict[str, object]:
        if auth_context.role is None or auth_context.country_code is None:
            return self._resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                intent="unsupported",
                status="unsupported",
                summary="AgroGuide needs a complete actor role and country scope.",
                explanation=(
                    "The copilot cannot classify or execute an action until the current actor "
                    "session includes both role and country scope."
                ),
                confirmation_copy=None,
                action=None,
                human_handoff=self._handoff(
                    required=True,
                    queue_label="AgroGuide operator queue",
                    reason_code="actor_scope_incomplete",
                    reviewer_roles=["ops", "support"],
                ),
            )

        normalized_message = " ".join(request.message.strip().split())
        lowered = normalized_message.lower()

        if any(keyword in lowered for keyword in HUMAN_KEYWORDS):
            return self._resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                intent="unsupported",
                status="escalate_to_human",
                summary="AgroGuide can hand this over to a human operator.",
                explanation=(
                    "Your message explicitly asked for a person to take over, so the copilot is "
                    "staying out of the mutation path and preparing a human handoff."
                ),
                confirmation_copy=None,
                action=None,
                human_handoff=self._handoff(
                    required=True,
                    queue_label="AgroGuide operator queue",
                    reason_code="human_handoff_requested",
                    reviewer_roles=["advisor", "ops"],
                ),
            )

        if any(keyword in lowered for keyword in UNSUPPORTED_KEYWORDS):
            return self._resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                intent="unsupported",
                status="unsupported",
                summary="This request falls outside the EH4 copilot action lane.",
                explanation=(
                    "The current copilot lane supports advisory asks, listing publication, "
                    "negotiation confirmations, climate acknowledgements, and shipment pickup. "
                    "Finance and insurance actions remain outside this bounded release."
                ),
                confirmation_copy=None,
                action=None,
                human_handoff=self._handoff(
                    required=True,
                    queue_label="AgroGuide operator queue",
                    reason_code="copilot_capability_gap",
                    reviewer_roles=["finance_ops", "support"],
                ),
            )

        climate_resolution = self._resolve_climate(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            lowered=lowered,
        )
        if climate_resolution is not None:
            return climate_resolution

        marketplace_resolution = self._resolve_marketplace(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            lowered=lowered,
        )
        if marketplace_resolution is not None:
            return marketplace_resolution

        transport_resolution = self._resolve_transport(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            lowered=lowered,
        )
        if transport_resolution is not None:
            return transport_resolution

        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent="advisory.ask",
            status="ready",
            summary="AgroGuide can answer this as a grounded advisory request.",
            explanation=(
                "The message does not match a bounded operational mutation, so the copilot will "
                "route it into the advisory workflow and return a grounded response."
            ),
            confirmation_copy=None,
            action={
                "adapter": "advisory.requests.submit",
                "command_name": "advisory.requests.submit",
                "aggregate_ref": "advisory",
                "mutation_scope": "advisory.requests",
                "confirmation_required": False,
                "target": {
                    "aggregate_type": "advisory_workspace",
                    "aggregate_id": auth_context.actor_subject,
                    "label": "Advisory workspace",
                },
                "payload": {
                    "locale": request.locale,
                    "policy_context": {"sensitive_topics": []},
                    "question_text": normalized_message,
                    "topic": self._topic_for_message(normalized_message),
                    "transcript_entries": request.transcript_entries,
                },
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="AgroGuide operator queue",
                reason_code="copilot_self_service",
                reviewer_roles=["advisor"],
            ),
        )

    def _resolve_climate(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        lowered: str,
    ) -> dict[str, object] | None:
        climate_signals = ("acknowledge", "alert", "weather", "risk", "storm", "flood")
        if not any(signal in lowered for signal in climate_signals) and request.context.get("alert_id") is None:
            return None

        alert_id = request.context.get("alert_id")
        alert = None
        if alert_id:
            alert = self.climate_repository.get_alert_for_actor(
                alert_id=alert_id,
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code or "",
            )
        if alert is None:
            alerts = self.climate_repository.list_alerts_for_actor(
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code or "",
            )
            alert = next((item for item in alerts if item.status != "acknowledged"), None)
        if alert is None:
            return self._resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                intent="climate.alerts.acknowledge",
                status="information_needed",
                summary="There is no open climate alert available to acknowledge.",
                explanation=(
                    "AgroGuide looked for an active alert in the actor scope but did not find one. "
                    "Open the climate alerts view or wait for a live alert before asking for this action."
                ),
                confirmation_copy=None,
                action=None,
                human_handoff=self._handoff(
                    required=False,
                    queue_label="Climate operator queue",
                    reason_code="climate_alert_not_found",
                    reviewer_roles=["advisor", "ops"],
                ),
            )

        farm_profile = self.climate_repository.get_farm_profile(farm_id=alert.farm_id)
        farm_label = farm_profile.farm_name if farm_profile is not None else alert.farm_id
        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent="climate.alerts.acknowledge",
            status="confirmation_required",
            summary=f"AgroGuide can acknowledge the open {alert.alert_type.replace('_', ' ')} alert.",
            explanation=(
                f"{farm_label} still has the alert '{alert.headline}' open. Acknowledging it records "
                "that the alert was seen without suppressing future risk updates."
            ),
            confirmation_copy=f"Confirm acknowledgement for {farm_label} alert '{alert.headline}'.",
            action={
                "adapter": "climate.alerts.acknowledge",
                "command_name": "climate.alerts.acknowledge",
                "aggregate_ref": alert.alert_id,
                "mutation_scope": "climate.alerts",
                "confirmation_required": True,
                "target": {
                    "aggregate_type": "climate_alert",
                    "aggregate_id": alert.alert_id,
                    "label": alert.headline,
                },
                "payload": {
                    "alert_id": alert.alert_id,
                    "note": "Acknowledged from AgroGuide copilot.",
                },
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="Climate operator queue",
                reason_code="climate_alert_ack_pending",
                reviewer_roles=["advisor", "ops"],
            ),
        )

    def _resolve_marketplace(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        lowered: str,
    ) -> dict[str, object] | None:
        rejection_keywords = ("decline", "reject", "not approve")
        approval_keywords = ("approve", "accept", "confirm", "close", "deal")
        publish_keywords = ("publish", "listing", "buyer", "market", "sell")

        if auth_context.role in SELLER_ROLES and any(keyword in lowered for keyword in publish_keywords):
            listing = self._find_publishable_listing(auth_context=auth_context, listing_id=request.context.get("listing_id"))
            if listing is None:
                return self._resolution(
                    auth_context=auth_context,
                    request_id=request_id,
                    request=request,
                    intent="market.listings.publish",
                    status="information_needed",
                    summary="There is no draft listing ready to publish.",
                    explanation=(
                        "AgroGuide looked for a draft or unpublished revision owned by this actor but "
                        "did not find one. Open My Listings to finish a draft first."
                    ),
                    confirmation_copy=None,
                    action=None,
                    human_handoff=self._handoff(
                        required=False,
                        queue_label="Marketplace operator queue",
                        reason_code="listing_not_found",
                        reviewer_roles=["ops", "support"],
                    ),
                )
            return self._publish_listing_resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                listing=listing,
            )

        if any(keyword in lowered for keyword in approval_keywords + rejection_keywords) or request.context.get("thread_id"):
            thread = self._find_pending_confirmation_thread(
                auth_context=auth_context,
                thread_id=request.context.get("thread_id"),
            )
            if thread is None:
                return self._resolution(
                    auth_context=auth_context,
                    request_id=request_id,
                    request=request,
                    intent="market.negotiations.confirm.approve",
                    status="information_needed",
                    summary="There is no pending negotiation checkpoint ready for this actor.",
                    explanation=(
                        "AgroGuide could not find a negotiation waiting on this actor's explicit confirmation. "
                        "Open Negotiations to review active threads."
                    ),
                    confirmation_copy=None,
                    action=None,
                    human_handoff=self._handoff(
                        required=False,
                        queue_label="Marketplace operator queue",
                        reason_code="confirmation_checkpoint_missing",
                        reviewer_roles=["ops", "support"],
                    ),
                )
            should_reject = any(keyword in lowered for keyword in rejection_keywords)
            return self._negotiation_confirmation_resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                thread=thread,
                approve=not should_reject,
            )

        return None

    def _resolve_transport(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        lowered: str,
    ) -> dict[str, object] | None:
        transport_keywords = ("pickup", "picked up", "shipment", "dispatch", "checkpoint", "load")
        if auth_context.role != "transporter":
            return None
        if not any(keyword in lowered for keyword in transport_keywords) and request.context.get("shipment_id") is None:
            return None

        shipment, load = self._find_transport_shipment(
            auth_context=auth_context,
            shipment_id=request.context.get("shipment_id"),
        )
        if shipment is None or load is None:
            return self._resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                intent="transport.shipments.pickup",
                status="information_needed",
                summary="There is no assigned shipment ready for a pickup update.",
                explanation=(
                    "AgroGuide could not find a shipment in assigned or in-transit state for this transporter. "
                    "Open the trucker workspace to review active dispatch work."
                ),
                confirmation_copy=None,
                action=None,
                human_handoff=self._handoff(
                    required=False,
                    queue_label="Transport operator queue",
                    reason_code="transport_shipment_not_found",
                    reviewer_roles=["ops", "support"],
                ),
            )

        if shipment.status == "in_transit" and "checkpoint" in lowered:
            return self._transport_checkpoint_resolution(
                auth_context=auth_context,
                request_id=request_id,
                request=request,
                shipment=shipment,
                load=load,
            )
        return self._transport_pickup_resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            shipment=shipment,
            load=load,
        )

    def _find_publishable_listing(
        self,
        *,
        auth_context: AuthContext,
        listing_id: str | None,
    ) -> Listing | None:
        if auth_context.country_code is None:
            return None
        if listing_id is not None:
            candidate = self.marketplace_repository.get_listing(
                listing_id=listing_id,
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code,
            )
            if candidate is not None and self._listing_publishable(candidate):
                return candidate
        listings = self.marketplace_repository.list_listings(
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
        )
        return next((item for item in listings if self._listing_publishable(item)), None)

    @staticmethod
    def _listing_publishable(listing: Listing) -> bool:
        return listing.status == "draft" or listing.published_revision_number != listing.revision_number

    def _find_pending_confirmation_thread(
        self,
        *,
        auth_context: AuthContext,
        thread_id: str | None,
    ) -> NegotiationThread | None:
        if auth_context.country_code is None:
            return None
        if thread_id is not None:
            candidate = self.marketplace_repository.get_negotiation_thread_for_actor(
                thread_id=thread_id,
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code,
            )
            if (
                candidate is not None
                and candidate.status == "pending_confirmation"
                and candidate.required_confirmer_actor_id == auth_context.actor_subject
            ):
                return candidate
        threads = self.marketplace_repository.list_negotiation_threads(
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
        )
        return next(
            (
                item
                for item in threads
                if item.status == "pending_confirmation"
                and item.required_confirmer_actor_id == auth_context.actor_subject
            ),
            None,
        )

    def _find_transport_shipment(
        self,
        *,
        auth_context: AuthContext,
        shipment_id: str | None,
    ) -> tuple[Shipment | None, TransportLoad | None]:
        if auth_context.country_code is None:
            return None, None
        if shipment_id is not None:
            shipment = self.transport_repository.get_shipment(
                shipment_id=shipment_id,
                country_code=auth_context.country_code,
            )
            if shipment is not None and shipment.transporter_actor_id == auth_context.actor_subject:
                load = self.transport_repository.get_load(
                    load_id=shipment.load_id,
                    country_code=auth_context.country_code,
                )
                return shipment, load
        shipments = self.transport_repository.list_shipments_for_transporter(
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
        )
        shipment = next(
            (item for item in shipments if item.status in {"assigned", "in_transit"}),
            None,
        )
        if shipment is None:
            return None, None
        load = self.transport_repository.get_load(
            load_id=shipment.load_id,
            country_code=auth_context.country_code,
        )
        return shipment, load

    def _publish_listing_resolution(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        listing: Listing,
    ) -> dict[str, object]:
        has_unpublished_changes = listing.published_revision_number != listing.revision_number
        listing_state = "draft" if listing.status == "draft" else "updated draft revision"
        buyer_impact = "make the listing visible to buyers" if listing.status == "draft" else "expose the newest revision to buyers"
        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent="market.listings.publish",
            status="confirmation_required",
            summary=f"AgroGuide can publish '{listing.title}' now.",
            explanation=(
                f"The listing is currently in {listing_state} state"
                f"{' with unpublished changes' if has_unpublished_changes else ''}. "
                f"Publishing will {buyer_impact} without editing any commercial terms."
            ),
            confirmation_copy=f"Confirm publication for listing '{listing.title}'.",
            action={
                "adapter": "market.listings.publish",
                "command_name": "market.listings.publish",
                "aggregate_ref": listing.listing_id,
                "mutation_scope": "marketplace.listings",
                "confirmation_required": True,
                "target": {
                    "aggregate_type": "listing",
                    "aggregate_id": listing.listing_id,
                    "label": listing.title,
                },
                "payload": {"listing_id": listing.listing_id},
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="Marketplace operator queue",
                reason_code="listing_publish_pending",
                reviewer_roles=["ops", "support"],
            ),
        )

    def _negotiation_confirmation_resolution(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        thread: NegotiationThread,
        approve: bool,
    ) -> dict[str, object]:
        intent = (
            "market.negotiations.confirm.approve"
            if approve
            else "market.negotiations.confirm.reject"
        )
        label = "approve" if approve else "reject"
        summary = (
            "AgroGuide can approve the pending negotiation checkpoint."
            if approve
            else "AgroGuide can reject the pending negotiation checkpoint."
        )
        explanation = (
            f"Thread {thread.thread_id} is waiting on this actor to {label} "
            f"{thread.current_offer_amount:.2f} {thread.current_offer_currency}. "
            "The action will only affect the existing confirmation checkpoint."
        )
        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent=intent,
            status="confirmation_required",
            summary=summary,
            explanation=explanation,
            confirmation_copy=(
                f"Confirm {label} for negotiation thread {thread.thread_id} at "
                f"{thread.current_offer_amount:.2f} {thread.current_offer_currency}."
            ),
            action={
                "adapter": intent,
                "command_name": intent,
                "aggregate_ref": thread.thread_id,
                "mutation_scope": "marketplace.negotiations",
                "confirmation_required": True,
                "target": {
                    "aggregate_type": "negotiation_thread",
                    "aggregate_id": thread.thread_id,
                    "label": f"Negotiation {thread.thread_id}",
                },
                "payload": {
                    "thread_id": thread.thread_id,
                    "note": (
                        "Approved from AgroGuide copilot."
                        if approve
                        else "Rejected from AgroGuide copilot."
                    ),
                },
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="Marketplace operator queue",
                reason_code="negotiation_confirmation_pending",
                reviewer_roles=["ops", "support"],
            ),
        )

    def _transport_pickup_resolution(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        shipment: Shipment,
        load: TransportLoad,
    ) -> dict[str, object]:
        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent="transport.shipments.pickup",
            status="confirmation_required",
            summary="AgroGuide can mark the assigned shipment as picked up.",
            explanation=(
                f"Shipment {shipment.shipment_id} is still assigned for {load.commodity} from "
                f"{load.origin_location}. Logging pickup moves the shipment into transit and "
                "extends the dispatch audit trail without touching delivery proof."
            ),
            confirmation_copy=f"Confirm pickup for shipment {shipment.shipment_id}.",
            action={
                "adapter": "transport.shipments.events.create",
                "command_name": None,
                "aggregate_ref": shipment.shipment_id,
                "mutation_scope": "transport.shipments",
                "confirmation_required": True,
                "target": {
                    "aggregate_type": "transport_shipment",
                    "aggregate_id": shipment.shipment_id,
                    "label": f"Shipment {shipment.shipment_id}",
                },
                "payload": {
                    "shipment_id": shipment.shipment_id,
                    "event_type": "picked_up",
                    "notes": "Pickup logged from AgroGuide copilot.",
                },
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="Transport operator queue",
                reason_code="transport_pickup_pending",
                reviewer_roles=["ops", "support"],
            ),
        )

    def _transport_checkpoint_resolution(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        shipment: Shipment,
        load: TransportLoad,
    ) -> dict[str, object]:
        return self._resolution(
            auth_context=auth_context,
            request_id=request_id,
            request=request,
            intent="transport.shipments.pickup",
            status="confirmation_required",
            summary="AgroGuide can log a checkpoint for the in-transit shipment.",
            explanation=(
                f"Shipment {shipment.shipment_id} is already in transit for {load.commodity}. "
                "Logging a checkpoint keeps operators and counterparties aligned on route progress."
            ),
            confirmation_copy=f"Confirm a checkpoint update for shipment {shipment.shipment_id}.",
            action={
                "adapter": "transport.shipments.events.create",
                "command_name": None,
                "aggregate_ref": shipment.shipment_id,
                "mutation_scope": "transport.shipments",
                "confirmation_required": True,
                "target": {
                    "aggregate_type": "transport_shipment",
                    "aggregate_id": shipment.shipment_id,
                    "label": f"Shipment {shipment.shipment_id}",
                },
                "payload": {
                    "shipment_id": shipment.shipment_id,
                    "event_type": "checkpoint",
                    "notes": "Checkpoint logged from AgroGuide copilot.",
                },
            },
            human_handoff=self._handoff(
                required=False,
                queue_label="Transport operator queue",
                reason_code="transport_checkpoint_pending",
                reviewer_roles=["ops", "support"],
            ),
        )

    def _resolution(
        self,
        *,
        auth_context: AuthContext,
        request_id: str,
        request: CopilotResolveRequest,
        intent: str,
        status: str,
        summary: str,
        explanation: str,
        confirmation_copy: str | None,
        action: dict[str, object] | None,
        human_handoff: dict[str, object],
    ) -> dict[str, object]:
        notification_id = f"copilot-{request_id}"
        return {
            "schema_version": get_envelope_schema_version(),
            "resolution_id": request_id,
            "actor_id": auth_context.actor_subject,
            "country_code": auth_context.country_code,
            "locale": request.locale,
            "route_path": request.route_path,
            "request_text": request.message,
            "intent": intent,
            "status": status,
            "summary": summary,
            "explanation": explanation,
            "confirmation_copy": confirmation_copy,
            "action": action,
            "channel_dispatch": build_copilot_dispatch_plan(
                notification_id=notification_id,
                template_key=f"copilot.{intent}.resolution",
                dedupe_key=f"{request.route_path}:{intent}:{auth_context.actor_subject}",
                summary=summary,
            ),
            "human_handoff": human_handoff,
            "created_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        }

    @staticmethod
    def _handoff(
        *,
        required: bool,
        queue_label: str,
        reason_code: str,
        reviewer_roles: list[str],
    ) -> dict[str, object]:
        return {
            "required": required,
            "queue_label": queue_label,
            "reason_code": reason_code,
            "reviewer_roles": reviewer_roles,
        }

    @staticmethod
    def _topic_for_message(message: str) -> str:
        normalized = message.strip()
        if len(normalized) <= 72:
            return normalized
        return f"{normalized[:69]}..."
