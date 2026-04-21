"""B-005 WhatsApp adapter contract and template strategy primitives."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class WhatsAppAdapterError(ValueError):
    """Raised when WhatsApp adapter inputs violate contract requirements."""


class WhatsAppMessageType(str, Enum):
    TEXT = "text"
    INTERACTIVE = "interactive"
    TEMPLATE = "template"
    UNKNOWN = "unknown"


class WhatsAppIntent(str, Enum):
    HELP = "help"
    CREATE_LISTING = "create_listing"
    NEGOTIATION_REPLY = "negotiation_reply"
    SETTLEMENT_STATUS = "settlement_status"
    UNKNOWN = "unknown"


class WhatsAppFallbackChannel(str, Enum):
    NONE = "none"
    SMS = "sms"
    USSD = "ussd"


@dataclass(frozen=True)
class InboundWhatsAppMessage:
    message_id: str
    contact_id: str
    message_type: WhatsAppMessageType
    text: str = ""
    interactive_payload: str | None = None
    locale: str = "en"

    def __post_init__(self) -> None:
        if not self.message_id.strip():
            raise WhatsAppAdapterError("message_id is required")
        if not self.contact_id.strip():
            raise WhatsAppAdapterError("contact_id is required")
        if self.message_type == WhatsAppMessageType.TEXT and not self.text.strip():
            raise WhatsAppAdapterError("text is required for text messages")
        if (
            self.message_type == WhatsAppMessageType.INTERACTIVE
            and not (self.interactive_payload or "").strip()
        ):
            raise WhatsAppAdapterError(
                "interactive_payload is required for interactive messages"
            )
        if not self.locale.strip():
            raise WhatsAppAdapterError("locale is required")


@dataclass(frozen=True)
class ParsedWhatsAppCommand:
    intent: WhatsAppIntent
    command_name: str
    arguments: dict[str, str]
    confidence_score: float


@dataclass(frozen=True)
class WhatsAppTemplateBinding:
    template_name: str
    locale: str
    parameter_keys: tuple[str, ...]
    fallback_channel: WhatsAppFallbackChannel


@dataclass(frozen=True)
class WhatsAppFallbackDecision:
    should_fallback: bool
    channel: WhatsAppFallbackChannel
    reason: str | None


class WhatsAppAdapterContract:
    """Parses inbound commands and selects deterministic outbound templates."""

    _TEMPLATE_REGISTRY = {
        "settlement_update": {
            "default": WhatsAppTemplateBinding(
                template_name="settlement_update_v1",
                locale="en",
                parameter_keys=("buyer_name", "commodity", "settlement_amount"),
                fallback_channel=WhatsAppFallbackChannel.SMS,
            ),
            "fr": WhatsAppTemplateBinding(
                template_name="settlement_update_fr_v1",
                locale="fr",
                parameter_keys=("buyer_name", "commodity", "settlement_amount"),
                fallback_channel=WhatsAppFallbackChannel.SMS,
            ),
        },
        "listing_alert": {
            "default": WhatsAppTemplateBinding(
                template_name="listing_alert_v1",
                locale="en",
                parameter_keys=("commodity", "price_band", "market_name"),
                fallback_channel=WhatsAppFallbackChannel.USSD,
            ),
        },
    }

    def parse_command(self, message: InboundWhatsAppMessage) -> ParsedWhatsAppCommand:
        if message.message_type == WhatsAppMessageType.INTERACTIVE:
            return self._parse_interactive_payload(message.interactive_payload or "")
        if message.message_type != WhatsAppMessageType.TEXT:
            return ParsedWhatsAppCommand(
                intent=WhatsAppIntent.UNKNOWN,
                command_name="unknown",
                arguments={},
                confidence_score=0.0,
            )

        normalized = " ".join(message.text.strip().lower().split())
        tokens = normalized.split()
        if not tokens:
            raise WhatsAppAdapterError("text is required for text messages")

        if tokens[0] == "help":
            return ParsedWhatsAppCommand(
                intent=WhatsAppIntent.HELP,
                command_name="help",
                arguments={},
                confidence_score=1.0,
            )

        if tokens[0] == "sell" and len(tokens) >= 2:
            arguments = {"commodity": tokens[1]}
            if len(tokens) > 2:
                arguments["details"] = " ".join(tokens[2:])
            return ParsedWhatsAppCommand(
                intent=WhatsAppIntent.CREATE_LISTING,
                command_name="sell",
                arguments=arguments,
                confidence_score=0.92,
            )

        if tokens[0] in {"accept", "reject", "counter"} and len(tokens) >= 2:
            arguments = {"action": tokens[0], "offer_id": tokens[1]}
            if len(tokens) > 2:
                arguments["details"] = " ".join(tokens[2:])
            return ParsedWhatsAppCommand(
                intent=WhatsAppIntent.NEGOTIATION_REPLY,
                command_name=tokens[0],
                arguments=arguments,
                confidence_score=0.94,
            )

        if tokens[0] == "settlement" and len(tokens) >= 2:
            return ParsedWhatsAppCommand(
                intent=WhatsAppIntent.SETTLEMENT_STATUS,
                command_name="settlement",
                arguments={"escrow_id": tokens[1]},
                confidence_score=0.95,
            )

        return ParsedWhatsAppCommand(
            intent=WhatsAppIntent.UNKNOWN,
            command_name=tokens[0],
            arguments={"raw_text": normalized},
            confidence_score=0.2,
        )

    def select_template(
        self,
        *,
        event_type: str,
        locale: str = "en",
    ) -> WhatsAppTemplateBinding:
        if not event_type.strip():
            raise WhatsAppAdapterError("event_type is required")

        locale_key = locale.strip().lower() or "en"
        event_templates = self._TEMPLATE_REGISTRY.get(event_type)
        if event_templates is None:
            raise WhatsAppAdapterError(f"unsupported event_type: {event_type}")

        if locale_key in event_templates:
            return event_templates[locale_key]
        return event_templates["default"]

    def fallback_hook(
        self,
        *,
        delivery_failed: bool,
        session_window_expired: bool,
        network_degraded: bool,
    ) -> WhatsAppFallbackDecision:
        if delivery_failed:
            return WhatsAppFallbackDecision(
                should_fallback=True,
                channel=WhatsAppFallbackChannel.SMS,
                reason="delivery_failed",
            )
        if session_window_expired:
            return WhatsAppFallbackDecision(
                should_fallback=True,
                channel=WhatsAppFallbackChannel.SMS,
                reason="session_window_expired",
            )
        if network_degraded:
            return WhatsAppFallbackDecision(
                should_fallback=True,
                channel=WhatsAppFallbackChannel.USSD,
                reason="network_degraded",
            )
        return WhatsAppFallbackDecision(
            should_fallback=False,
            channel=WhatsAppFallbackChannel.NONE,
            reason=None,
        )

    def _parse_interactive_payload(self, payload: str) -> ParsedWhatsAppCommand:
        if not payload.strip():
            raise WhatsAppAdapterError("interactive_payload is required")

        parts = [segment for segment in payload.split("|") if segment]
        arguments: dict[str, str] = {}
        for segment in parts:
            if ":" not in segment:
                raise WhatsAppAdapterError("interactive payload segments must contain ':'")
            key, value = segment.split(":", 1)
            arguments[key.strip()] = value.strip()

        intent_key = arguments.pop("intent", "unknown")
        try:
            intent = WhatsAppIntent(intent_key)
        except ValueError:
            intent = WhatsAppIntent.UNKNOWN

        return ParsedWhatsAppCommand(
            intent=intent,
            command_name=intent.value,
            arguments=arguments,
            confidence_score=0.98 if intent != WhatsAppIntent.UNKNOWN else 0.2,
        )
