from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.core.auth import AuthContext
from app.core.contracts_catalog import get_envelope_schema_version
from app.core.demo import same_demo_boundary
from app.db.models.climate import ClimateAlert
from app.db.models.marketplace import Listing, NegotiationThread
from app.db.models.transport import Shipment, TransportLoad
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.transport import TransportRepository

PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2}
SELLER_ROLES = {"farmer", "cooperative", "admin"}
CHANNELS = ["web", "whatsapp", "sms"]


@dataclass(slots=True, frozen=True)
class CopilotRecommendationContext:
    actor_id: str
    country_code: str
    role: str


class CopilotRecommendationEngine:
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

    def list_recommendations(self, auth_context: AuthContext) -> list[dict[str, object]]:
        if auth_context.role is None or auth_context.country_code is None:
            return []

        context = CopilotRecommendationContext(
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
            role=auth_context.role,
        )
        recommendations: list[dict[str, object]] = []
        recommendations.extend(self._build_climate_recommendations(context))
        recommendations.extend(self._build_marketplace_recommendations(context))
        recommendations.extend(self._build_transport_recommendations(context))
        recommendations.sort(
            key=lambda item: (
                PRIORITY_RANK.get(str(item["priority"]), 99),
                str(item["created_at"]),
                str(item["recommendation_id"]),
            )
        )
        return recommendations[:4]

    def _build_climate_recommendations(
        self, context: CopilotRecommendationContext
    ) -> list[dict[str, object]]:
        alerts = self.climate_repository.list_alerts_for_actor(
            actor_id=context.actor_id,
            country_code=context.country_code,
        )
        for alert in alerts:
            if alert.status == "acknowledged":
                continue
            farm_profile = self.climate_repository.get_farm_profile(farm_id=alert.farm_id)
            farm_label = farm_profile.farm_name if farm_profile is not None else alert.farm_id
            return [
                self._recommendation(
                    context=context,
                    recommendation_id=f"copilot-climate-{alert.alert_id}",
                    category="climate",
                    priority="critical" if alert.severity == "critical" else "high",
                    title=f"Acknowledge {alert.headline}",
                    summary=(
                        f"{farm_label} has an open {alert.alert_type.replace('_', ' ')} alert. "
                        "Acknowledge it so the weather-risk queue and follow-up guidance stay in sync."
                    ),
                    rationale=alert.detail,
                    source_domains=["climate", "weather"],
                    source_refs=[alert.alert_id, alert.observation_id or alert.alert_id],
                    guardrails=[
                        "Writes an audited acknowledgement but does not silence future alerts.",
                        "Requires confirmation before the command is sent.",
                    ],
                    action={
                        "aggregate_ref": alert.alert_id,
                        "channel_seam": self._channel_seam(
                            delivery_key="copilot.climate.acknowledge_alert",
                            web_label="Acknowledge climate alert",
                        ),
                        "command_name": "climate.alerts.acknowledge",
                        "data_check_ids": ["DI-006"],
                        "journey_ids": ["CJ-006"],
                        "kind": "workflow_command",
                        "label": "Acknowledge alert",
                        "mutation_scope": "climate.alerts",
                        "payload": {
                            "alert_id": alert.alert_id,
                            "note": "Acknowledged from AgroGuide proactive recommendation.",
                        },
                        "requires_confirmation": True,
                        "route": "/climate/alerts",
                        "transport_endpoint": None,
                    },
                )
            ]
        return []

    def _build_marketplace_recommendations(
        self, context: CopilotRecommendationContext
    ) -> list[dict[str, object]]:
        recommendations: list[dict[str, object]] = []

        if context.role in SELLER_ROLES:
            owned_listings = self.marketplace_repository.list_listings(
                actor_id=context.actor_id,
                country_code=context.country_code,
            )
            listing_recommendation = self._draft_listing_recommendation(
                context=context,
                listings=owned_listings,
            )
            if listing_recommendation is not None:
                recommendations.append(listing_recommendation)

        threads = self.marketplace_repository.list_negotiation_threads(
            actor_id=context.actor_id,
            country_code=context.country_code,
        )
        buyer_confirmation = self._buyer_confirmation_recommendation(
            context=context,
            threads=threads,
        )
        if buyer_confirmation is not None:
            recommendations.append(buyer_confirmation)

        return recommendations

    def _draft_listing_recommendation(
        self,
        *,
        context: CopilotRecommendationContext,
        listings: list[Listing],
    ) -> dict[str, object] | None:
        for listing in listings:
            has_unpublished_changes = listing.published_revision_number != listing.revision_number
            if listing.status != "draft" and not has_unpublished_changes:
                continue
            summary = (
                f"{listing.title} is still private to you."
                if listing.status == "draft"
                else f"{listing.title} has newer draft changes that buyers still cannot see."
            )
            return self._recommendation(
                context=context,
                recommendation_id=f"copilot-marketplace-publish-{listing.listing_id}",
                category="marketplace",
                priority="high",
                title=f"Publish {listing.title}",
                summary=f"{summary} Publish now to reopen discovery and negotiation momentum.",
                rationale=(
                    f"Listing status is {listing.status} with revision {listing.revision_number}. "
                    "Publishing exposes the latest trusted snapshot to buyers."
                ),
                source_domains=["marketplace"],
                source_refs=[listing.listing_id],
                guardrails=[
                    "Publishes only the listing you own.",
                    "Requires confirmation before the workflow command is sent.",
                ],
                action={
                    "aggregate_ref": listing.listing_id,
                    "channel_seam": self._channel_seam(
                        delivery_key="copilot.marketplace.publish_listing",
                        web_label="Publish listing",
                    ),
                    "command_name": "market.listings.publish",
                    "data_check_ids": ["DI-001"],
                    "journey_ids": ["CJ-002", "CJ-003"],
                    "kind": "workflow_command",
                    "label": "Publish listing",
                    "mutation_scope": "marketplace.listings",
                    "payload": {"listing_id": listing.listing_id},
                    "requires_confirmation": True,
                    "route": "/market/my-listings",
                    "transport_endpoint": None,
                },
            )
        return None

    def _buyer_confirmation_recommendation(
        self,
        *,
        context: CopilotRecommendationContext,
        threads: list[NegotiationThread],
    ) -> dict[str, object] | None:
        for thread in threads:
            if (
                thread.status != "pending_confirmation"
                or thread.required_confirmer_actor_id != context.actor_id
            ):
                continue
            return self._recommendation(
                context=context,
                recommendation_id=f"copilot-marketplace-confirm-{thread.thread_id}",
                category="marketplace",
                priority="critical",
                title="Close the pending negotiation checkpoint",
                summary=(
                    f"Thread {thread.thread_id} is waiting on your approval to finalize "
                    f"{thread.current_offer_amount:.2f} {thread.current_offer_currency}."
                ),
                rationale=(
                    "The seller already requested explicit confirmation. Approving here is faster "
                    "than reopening the thread and preserves the existing audit trail."
                ),
                source_domains=["marketplace"],
                source_refs=[thread.thread_id, thread.listing_id],
                guardrails=[
                    "Approves only the thread already assigned to you as confirmer.",
                    "Requires confirmation before the workflow command is sent.",
                ],
                action={
                    "aggregate_ref": thread.thread_id,
                    "channel_seam": self._channel_seam(
                        delivery_key="copilot.marketplace.approve_confirmation",
                        web_label="Approve negotiation checkpoint",
                    ),
                    "command_name": "market.negotiations.confirm.approve",
                    "data_check_ids": ["DI-002"],
                    "journey_ids": ["CJ-003", "RJ-002"],
                    "kind": "workflow_command",
                    "label": "Approve offer",
                    "mutation_scope": "marketplace.negotiations",
                    "payload": {
                        "note": "Approved from AgroGuide proactive recommendation.",
                        "thread_id": thread.thread_id,
                    },
                    "requires_confirmation": True,
                    "route": "/market/negotiations",
                    "transport_endpoint": None,
                },
            )
        return None

    def _build_transport_recommendations(
        self, context: CopilotRecommendationContext
    ) -> list[dict[str, object]]:
        if context.role != "transporter":
            return []

        shipments = self.transport_repository.list_shipments_for_transporter(
            actor_id=context.actor_id,
            country_code=context.country_code,
        )
        for shipment in shipments:
            load = self.transport_repository.get_load(
                load_id=shipment.load_id,
                country_code=context.country_code,
            )
            if load is None or not same_demo_boundary(context.actor_id, load.poster_actor_id):
                continue
            if shipment.status == "assigned":
                return [self._pickup_recommendation(context=context, shipment=shipment, load=load)]
            if shipment.status == "in_transit":
                return [self._checkpoint_recommendation(context=context, shipment=shipment, load=load)]

        available_loads = self.transport_repository.list_available_loads(
            country_code=context.country_code,
            status="posted",
        )
        for load in available_loads:
            if not same_demo_boundary(context.actor_id, load.poster_actor_id):
                continue
            return [
                self._recommendation(
                    context=context,
                    recommendation_id=f"copilot-transport-open-{load.load_id}",
                    category="transport",
                    priority="medium",
                    title="Review the next open load",
                    summary=(
                        f"{load.commodity} is waiting on a transporter from {load.origin_location} "
                        f"to {load.destination_location}."
                    ),
                    rationale=(
                        "The runtime can surface the next dispatch candidate immediately, even when "
                        "claiming the load still needs vehicle details."
                    ),
                    source_domains=["transport"],
                    source_refs=[load.load_id],
                    guardrails=[
                        "Navigation only; no shipment or assignment is mutated.",
                        "Vehicle details are still required before claiming a load.",
                    ],
                    action={
                        "aggregate_ref": load.load_id,
                        "channel_seam": self._channel_seam(
                            delivery_key="copilot.transport.open_dispatch",
                            web_label="Open dispatch workspace",
                        ),
                        "command_name": None,
                        "data_check_ids": [],
                        "journey_ids": ["CJ-011"],
                        "kind": "open_route",
                        "label": "Open dispatch",
                        "mutation_scope": None,
                        "payload": {},
                        "requires_confirmation": False,
                        "route": "/trucker",
                        "transport_endpoint": None,
                    },
                )
            ]
        return []

    def _pickup_recommendation(
        self,
        *,
        context: CopilotRecommendationContext,
        shipment: Shipment,
        load: TransportLoad,
    ) -> dict[str, object]:
        return self._recommendation(
            context=context,
            recommendation_id=f"copilot-transport-pickup-{shipment.shipment_id}",
            category="transport",
            priority="critical",
            title=f"Mark pickup for {load.commodity}",
            summary=(
                f"Shipment {shipment.shipment_id} is assigned but still waiting for pickup "
                f"confirmation from {load.origin_location}."
            ),
            rationale=(
                "Logging pickup moves the shipment into transit and updates the dispatch audit trail "
                "without requiring settlement or proof-of-delivery changes."
            ),
            source_domains=["transport"],
            source_refs=[shipment.shipment_id, load.load_id],
            guardrails=[
                "Posts only a pickup event for your assigned shipment.",
                "Requires confirmation before the transport event is sent.",
            ],
            action={
                "aggregate_ref": shipment.shipment_id,
                "channel_seam": self._channel_seam(
                    delivery_key="copilot.transport.mark_pickup",
                    web_label="Mark shipment picked up",
                ),
                "command_name": None,
                "data_check_ids": ["DI-011"],
                "journey_ids": ["CJ-011"],
                "kind": "transport_endpoint",
                "label": "Mark picked up",
                "mutation_scope": None,
                "payload": {
                    "event_type": "picked_up",
                    "notes": "Pickup logged from AgroGuide proactive recommendation.",
                },
                "requires_confirmation": True,
                "route": "/trucker",
                "transport_endpoint": {
                    "method": "POST",
                    "path": f"/api/v1/transport/shipments/{shipment.shipment_id}/events",
                },
            },
        )

    def _checkpoint_recommendation(
        self,
        *,
        context: CopilotRecommendationContext,
        shipment: Shipment,
        load: TransportLoad,
    ) -> dict[str, object]:
        return self._recommendation(
            context=context,
            recommendation_id=f"copilot-transport-checkpoint-{shipment.shipment_id}",
            category="transport",
            priority="high",
            title=f"Log a checkpoint for {load.commodity}",
            summary=(
                f"Shipment {shipment.shipment_id} is already in transit. Record a checkpoint so "
                "buyers and operators see fresh route progress."
            ),
            rationale=(
                "A checkpoint is the lightest safe transport mutation available before delivery proof, "
                "and it keeps route status visible to downstream trade workflows."
            ),
            source_domains=["transport", "marketplace"],
            source_refs=[shipment.shipment_id, load.load_id],
            guardrails=[
                "Posts only a checkpoint event for your assigned shipment.",
                "Requires confirmation before the transport event is sent.",
            ],
            action={
                "aggregate_ref": shipment.shipment_id,
                "channel_seam": self._channel_seam(
                    delivery_key="copilot.transport.log_checkpoint",
                    web_label="Log shipment checkpoint",
                ),
                "command_name": None,
                "data_check_ids": ["DI-011"],
                "journey_ids": ["CJ-011"],
                "kind": "transport_endpoint",
                "label": "Log checkpoint",
                "mutation_scope": None,
                "payload": {
                    "event_type": "checkpoint",
                    "notes": "Checkpoint logged from AgroGuide proactive recommendation.",
                },
                "requires_confirmation": True,
                "route": "/trucker",
                "transport_endpoint": {
                    "method": "POST",
                    "path": f"/api/v1/transport/shipments/{shipment.shipment_id}/events",
                },
            },
        )

    @staticmethod
    def _channel_seam(*, delivery_key: str, web_label: str) -> dict[str, object]:
        return {
            "delivery_key": delivery_key,
            "fallback_channels": CHANNELS[1:],
            "supported_channels": CHANNELS,
            "web_label": web_label,
        }

    @staticmethod
    def _recommendation(
        *,
        context: CopilotRecommendationContext,
        recommendation_id: str,
        category: str,
        priority: str,
        title: str,
        summary: str,
        rationale: str,
        source_domains: list[str],
        source_refs: list[str],
        guardrails: list[str],
        action: dict[str, object],
    ) -> dict[str, object]:
        return {
            "schema_version": get_envelope_schema_version(),
            "recommendation_id": recommendation_id,
            "actor_id": context.actor_id,
            "role": context.role,
            "country_code": context.country_code,
            "title": title,
            "summary": summary,
            "rationale": rationale,
            "priority": priority,
            "category": category,
            "source_domains": source_domains,
            "source_refs": source_refs,
            "guardrails": guardrails,
            "action": action,
            "created_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        }
