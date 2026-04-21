"""B-013 settlement notification planning with channel-aware fallback."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .escrow import EscrowFundingStatus, EscrowRecord, EscrowState
from .whatsapp_adapter import (
    WhatsAppAdapterContract,
    WhatsAppFallbackChannel,
)


class SettlementNotificationError(ValueError):
    """Raised when settlement notification inputs are invalid."""


class NotificationChannel(str, Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"


class NotificationFeedbackState(str, Enum):
    READY = "ready"
    SENT = "sent"
    FALLBACK_SENT = "fallback_sent"
    ACTION_REQUIRED = "action_required"


@dataclass(frozen=True)
class NotificationRecipient:
    contact_id: str
    phone_number: str
    locale: str = "en"
    preferred_channel: NotificationChannel = NotificationChannel.WHATSAPP

    def __post_init__(self) -> None:
        if not self.contact_id.strip():
            raise SettlementNotificationError("contact_id is required")
        if not self.phone_number.strip():
            raise SettlementNotificationError("phone_number is required")
        if not self.locale.strip():
            raise SettlementNotificationError("locale is required")


@dataclass(frozen=True)
class SettlementNotificationRequest:
    escrow_record: EscrowRecord
    recipient: NotificationRecipient
    buyer_name: str
    commodity: str
    actor_id: str
    delivery_failed: bool = False
    session_window_expired: bool = False
    network_degraded: bool = False

    def __post_init__(self) -> None:
        if not self.buyer_name.strip():
            raise SettlementNotificationError("buyer_name is required")
        if not self.commodity.strip():
            raise SettlementNotificationError("commodity is required")
        if not self.actor_id.strip():
            raise SettlementNotificationError("actor_id is required")


@dataclass(frozen=True)
class ChannelDeliveryPlan:
    channel: NotificationChannel
    template_name: str | None
    message_text: str
    status_label: str


@dataclass(frozen=True)
class SettlementNotificationPlan:
    escrow_id: str
    event_type: str
    status_label: str
    primary_plan: ChannelDeliveryPlan
    fallback_plan: ChannelDeliveryPlan | None
    fallback_reason: str | None
    channels_attempted: tuple[NotificationChannel, ...]
    final_channel: NotificationChannel
    feedback_state: NotificationFeedbackState
    requires_retry: bool


class SettlementNotificationPlanner:
    """Creates deterministic settlement notification plans from escrow state."""

    def __init__(
        self,
        *,
        whatsapp_contract: WhatsAppAdapterContract | None = None,
    ) -> None:
        self._whatsapp = whatsapp_contract or WhatsAppAdapterContract()

    def plan(self, request: SettlementNotificationRequest) -> SettlementNotificationPlan:
        self._validate_escrow(request.escrow_record)

        event_type, status_label = _notification_status(request.escrow_record)
        primary_plan = self._primary_plan(
            recipient=request.recipient,
            buyer_name=request.buyer_name,
            commodity=request.commodity,
            amount_minor=request.escrow_record.amount_minor,
            currency=request.escrow_record.currency,
            status_label=status_label,
        )

        fallback_plan = None
        fallback_reason = None
        channels_attempted = [primary_plan.channel]
        final_channel = primary_plan.channel
        feedback_state = NotificationFeedbackState.SENT
        requires_retry = False

        if primary_plan.channel == NotificationChannel.WHATSAPP:
            fallback_decision = self._whatsapp.fallback_hook(
                delivery_failed=request.delivery_failed,
                session_window_expired=request.session_window_expired,
                network_degraded=request.network_degraded,
            )
            if fallback_decision.should_fallback:
                fallback_plan = self._fallback_plan(
                    buyer_name=request.buyer_name,
                    commodity=request.commodity,
                    amount_minor=request.escrow_record.amount_minor,
                    currency=request.escrow_record.currency,
                    status_label=status_label,
                    fallback_channel=fallback_decision.channel,
                )
                fallback_reason = fallback_decision.reason
                channels_attempted.append(fallback_plan.channel)
                final_channel = fallback_plan.channel
                feedback_state = (
                    NotificationFeedbackState.ACTION_REQUIRED
                    if fallback_plan.channel != NotificationChannel.SMS
                    else NotificationFeedbackState.FALLBACK_SENT
                )
                requires_retry = fallback_plan.channel != NotificationChannel.SMS

        return SettlementNotificationPlan(
            escrow_id=request.escrow_record.escrow_id,
            event_type=event_type,
            status_label=status_label,
            primary_plan=primary_plan,
            fallback_plan=fallback_plan,
            fallback_reason=fallback_reason,
            channels_attempted=tuple(channels_attempted),
            final_channel=final_channel,
            feedback_state=feedback_state,
            requires_retry=requires_retry,
        )

    def _primary_plan(
        self,
        *,
        recipient: NotificationRecipient,
        buyer_name: str,
        commodity: str,
        amount_minor: int,
        currency: str,
        status_label: str,
    ) -> ChannelDeliveryPlan:
        if recipient.preferred_channel == NotificationChannel.SMS:
            return ChannelDeliveryPlan(
                channel=NotificationChannel.SMS,
                template_name=None,
                message_text=_sms_message(
                    buyer_name=buyer_name,
                    commodity=commodity,
                    amount_minor=amount_minor,
                    currency=currency,
                    status_label=status_label,
                ),
                status_label=status_label,
            )

        template = self._whatsapp.select_template(
            event_type="settlement_update",
            locale=recipient.locale,
        )
        return ChannelDeliveryPlan(
            channel=NotificationChannel.WHATSAPP,
            template_name=template.template_name,
            message_text=_sms_message(
                buyer_name=buyer_name,
                commodity=commodity,
                amount_minor=amount_minor,
                currency=currency,
                status_label=status_label,
            ),
            status_label=status_label,
        )

    def _fallback_plan(
        self,
        *,
        buyer_name: str,
        commodity: str,
        amount_minor: int,
        currency: str,
        status_label: str,
        fallback_channel: WhatsAppFallbackChannel,
    ) -> ChannelDeliveryPlan:
        if fallback_channel == WhatsAppFallbackChannel.SMS:
            return ChannelDeliveryPlan(
                channel=NotificationChannel.SMS,
                template_name=None,
                message_text=_sms_message(
                    buyer_name=buyer_name,
                    commodity=commodity,
                    amount_minor=amount_minor,
                    currency=currency,
                    status_label=status_label,
                ),
                status_label=status_label,
            )

        return ChannelDeliveryPlan(
            channel=NotificationChannel.SMS,
            template_name=None,
            message_text=_sms_message(
                buyer_name=buyer_name,
                commodity=commodity,
                amount_minor=amount_minor,
                currency=currency,
                status_label=f"{status_label}; reply STATUS for retry",
            ),
            status_label=status_label,
        )

    @staticmethod
    def _validate_escrow(record: EscrowRecord) -> None:
        if record.state == EscrowState.INITIATED and record.funding_status == EscrowFundingStatus.NONE:
            raise SettlementNotificationError("escrow has no settlement status to notify")


def _notification_status(record: EscrowRecord) -> tuple[str, str]:
    if record.state == EscrowState.INITIATED and record.funding_status == EscrowFundingStatus.PENDING:
        return "settlement_update", "funding pending"
    if record.state == EscrowState.FUNDED:
        return "settlement_update", "funded"
    if record.state == EscrowState.RELEASED:
        return "settlement_update", "released"
    if record.state == EscrowState.REVERSED:
        return "settlement_update", "reversed"
    if record.state == EscrowState.DISPUTED:
        return "settlement_update", "disputed"
    raise SettlementNotificationError(f"unsupported escrow state: {record.state.value}")


def _sms_message(
    *,
    buyer_name: str,
    commodity: str,
    amount_minor: int,
    currency: str,
    status_label: str,
) -> str:
    return (
        f"Settlement {status_label}: {buyer_name} {commodity} "
        f"{currency} {amount_minor}."
    )
