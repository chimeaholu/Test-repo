"""B-043 unified notification broker abstraction."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .mobile_api_profile import MobileApiProfileError, MobileApiProfileRegistry
from .settlement_notifications import (
    NotificationChannel,
    NotificationFeedbackState,
    SettlementNotificationPlanner,
    SettlementNotificationRequest,
)
from .whatsapp_adapter import WhatsAppAdapterContract


class NotificationBrokerError(ValueError):
    """Raised when broker inputs violate channel or parity rules."""


class BrokerChannel(str, Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"
    PUSH = "push"


class DeliveryState(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    FALLBACK_SENT = "fallback_sent"
    ACTION_REQUIRED = "action_required"
    FAILED = "failed"


class NotificationIntentType(str, Enum):
    SETTLEMENT_UPDATE = "settlement_update"
    LISTING_ALERT = "listing_alert"
    SYSTEM_ALERT = "system_alert"


@dataclass(frozen=True)
class NotificationRecipientProfile:
    contact_id: str
    locale: str = "en"
    phone_number: str | None = None
    device_token: str | None = None
    preferred_channels: tuple[BrokerChannel, ...] = (
        BrokerChannel.WHATSAPP,
        BrokerChannel.PUSH,
        BrokerChannel.SMS,
    )

    def __post_init__(self) -> None:
        if not self.contact_id.strip():
            raise NotificationBrokerError("contact_id is required")
        if not self.locale.strip():
            raise NotificationBrokerError("locale is required")
        if not self.preferred_channels:
            raise NotificationBrokerError("preferred_channels must not be empty")


@dataclass(frozen=True)
class NotificationBrokerRequest:
    notification_id: str
    intent_type: NotificationIntentType
    recipient: NotificationRecipientProfile
    body: str
    profile_version: str
    settlement_request: SettlementNotificationRequest | None = None

    def __post_init__(self) -> None:
        if not self.notification_id.strip():
            raise NotificationBrokerError("notification_id is required")
        if not self.body.strip():
            raise NotificationBrokerError("body is required")
        if not self.profile_version.strip():
            raise NotificationBrokerError("profile_version is required")
        if (
            self.intent_type == NotificationIntentType.SETTLEMENT_UPDATE
            and self.settlement_request is None
        ):
            raise NotificationBrokerError(
                "settlement_request is required for settlement_update notifications"
            )


@dataclass(frozen=True)
class ChannelDelivery:
    channel: BrokerChannel
    state: DeliveryState
    body: str
    template_name: str | None = None
    parity_key: str | None = None


@dataclass(frozen=True)
class NotificationBrokerPlan:
    notification_id: str
    intent_type: NotificationIntentType
    attempted_channels: tuple[BrokerChannel, ...]
    final_channel: BrokerChannel | None
    final_state: DeliveryState
    deliveries: tuple[ChannelDelivery, ...]


class NotificationBroker:
    """Normalizes notification routing and delivery-state parity across channels."""

    def __init__(
        self,
        *,
        profile_registry: MobileApiProfileRegistry,
        settlement_planner: SettlementNotificationPlanner | None = None,
        whatsapp_contract: WhatsAppAdapterContract | None = None,
    ) -> None:
        self._profiles = profile_registry
        self._settlement_planner = settlement_planner or SettlementNotificationPlanner()
        self._whatsapp = whatsapp_contract or WhatsAppAdapterContract()

    def plan(self, request: NotificationBrokerRequest) -> NotificationBrokerPlan:
        if request.intent_type == NotificationIntentType.SETTLEMENT_UPDATE:
            return self._plan_settlement_update(request)
        return self._plan_generic(request)

    def _plan_settlement_update(
        self,
        request: NotificationBrokerRequest,
    ) -> NotificationBrokerPlan:
        settlement_plan = self._settlement_planner.plan(request.settlement_request)  # type: ignore[arg-type]
        deliveries = [
            ChannelDelivery(
                channel=_map_settlement_channel(settlement_plan.primary_plan.channel),
                state=DeliveryState.SENT,
                body=settlement_plan.primary_plan.message_text,
                template_name=settlement_plan.primary_plan.template_name,
                parity_key=settlement_plan.event_type,
            )
        ]
        attempted_channels = [deliveries[0].channel]
        final_state = _map_feedback_state(settlement_plan.feedback_state)
        final_channel = attempted_channels[0]

        if settlement_plan.fallback_plan is not None:
            fallback_channel = _map_settlement_channel(settlement_plan.fallback_plan.channel)
            deliveries.append(
                ChannelDelivery(
                    channel=fallback_channel,
                    state=DeliveryState.FALLBACK_SENT,
                    body=settlement_plan.fallback_plan.message_text,
                    template_name=settlement_plan.fallback_plan.template_name,
                    parity_key=settlement_plan.event_type,
                )
            )
            attempted_channels.append(fallback_channel)
            final_channel = fallback_channel

        if (
            request.recipient.device_token
            and BrokerChannel.PUSH in request.recipient.preferred_channels
        ):
            push_delivery = self._build_push_delivery(request)
            deliveries.append(push_delivery)
            attempted_channels.append(BrokerChannel.PUSH)

        return NotificationBrokerPlan(
            notification_id=request.notification_id,
            intent_type=request.intent_type,
            attempted_channels=tuple(attempted_channels),
            final_channel=final_channel,
            final_state=final_state,
            deliveries=tuple(deliveries),
        )

    def _plan_generic(self, request: NotificationBrokerRequest) -> NotificationBrokerPlan:
        deliveries: list[ChannelDelivery] = []
        attempted_channels: list[BrokerChannel] = []
        final_channel: BrokerChannel | None = None
        final_state = DeliveryState.ACTION_REQUIRED

        for channel in request.recipient.preferred_channels:
            attempted_channels.append(channel)
            if channel == BrokerChannel.PUSH and request.recipient.device_token:
                try:
                    push_delivery = self._build_push_delivery(request)
                except NotificationBrokerError:
                    continue
                deliveries.append(push_delivery)
                final_channel = BrokerChannel.PUSH
                final_state = DeliveryState.SENT
                break

            if channel == BrokerChannel.WHATSAPP and request.recipient.phone_number:
                template = self._whatsapp.select_template(
                    event_type=_template_key_for_intent(request.intent_type),
                    locale=request.recipient.locale,
                )
                deliveries.append(
                    ChannelDelivery(
                        channel=BrokerChannel.WHATSAPP,
                        state=DeliveryState.SENT,
                        body=request.body,
                        template_name=template.template_name,
                        parity_key=request.intent_type.value,
                    )
                )
                final_channel = BrokerChannel.WHATSAPP
                final_state = DeliveryState.SENT
                break

            if channel == BrokerChannel.SMS and request.recipient.phone_number:
                deliveries.append(
                    ChannelDelivery(
                        channel=BrokerChannel.SMS,
                        state=DeliveryState.FALLBACK_SENT if deliveries else DeliveryState.SENT,
                        body=request.body,
                        parity_key=request.intent_type.value,
                    )
                )
                final_channel = BrokerChannel.SMS
                final_state = deliveries[-1].state
                break

        if final_channel is None:
            return NotificationBrokerPlan(
                notification_id=request.notification_id,
                intent_type=request.intent_type,
                attempted_channels=tuple(attempted_channels),
                final_channel=None,
                final_state=DeliveryState.ACTION_REQUIRED,
                deliveries=(),
            )

        return NotificationBrokerPlan(
            notification_id=request.notification_id,
            intent_type=request.intent_type,
            attempted_channels=tuple(attempted_channels),
            final_channel=final_channel,
            final_state=final_state,
            deliveries=tuple(deliveries),
        )

    def _build_push_delivery(self, request: NotificationBrokerRequest) -> ChannelDelivery:
        try:
            self._profiles.assert_payload_budget(
                version=request.profile_version,
                endpoint_name="notifications.push.deliver",
                payload={
                    "notification_id": request.notification_id,
                    "intent_type": request.intent_type.value,
                    "body": request.body,
                    "device_token": request.recipient.device_token,
                },
            )
        except MobileApiProfileError as exc:
            raise NotificationBrokerError(str(exc)) from exc

        return ChannelDelivery(
            channel=BrokerChannel.PUSH,
            state=DeliveryState.SENT,
            body=request.body,
            parity_key=request.intent_type.value,
        )


def _map_settlement_channel(channel: NotificationChannel) -> BrokerChannel:
    if channel == NotificationChannel.WHATSAPP:
        return BrokerChannel.WHATSAPP
    return BrokerChannel.SMS


def _map_feedback_state(state: NotificationFeedbackState) -> DeliveryState:
    if state == NotificationFeedbackState.FALLBACK_SENT:
        return DeliveryState.FALLBACK_SENT
    if state == NotificationFeedbackState.ACTION_REQUIRED:
        return DeliveryState.ACTION_REQUIRED
    return DeliveryState.SENT


def _template_key_for_intent(intent_type: NotificationIntentType) -> str:
    if intent_type == NotificationIntentType.LISTING_ALERT:
        return "listing_alert"
    return "settlement_update"

