import pytest

from agro_v2.whatsapp_adapter import (
    InboundWhatsAppMessage,
    ParsedWhatsAppCommand,
    WhatsAppAdapterContract,
    WhatsAppAdapterError,
    WhatsAppFallbackChannel,
    WhatsAppIntent,
    WhatsAppMessageType,
)


def build_message(**overrides) -> InboundWhatsAppMessage:
    payload = {
        "message_id": "wamid-1",
        "contact_id": "farmer-123",
        "message_type": WhatsAppMessageType.TEXT,
        "text": "help",
        "locale": "en",
    }
    payload.update(overrides)
    return InboundWhatsAppMessage(**payload)


def test_text_message_requires_body():
    with pytest.raises(WhatsAppAdapterError, match="text is required"):
        build_message(text=" ")


def test_parse_help_command():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(build_message(text="help"))

    assert command == ParsedWhatsAppCommand(
        intent=WhatsAppIntent.HELP,
        command_name="help",
        arguments={},
        confidence_score=1.0,
    )


def test_parse_sell_command_extracts_listing_details():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(build_message(text="sell maize 20 bags kumasi"))

    assert command.intent == WhatsAppIntent.CREATE_LISTING
    assert command.arguments == {
        "commodity": "maize",
        "details": "20 bags kumasi",
    }


def test_parse_negotiation_reply_command():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(build_message(text="counter offer-44 4800 ngn"))

    assert command.intent == WhatsAppIntent.NEGOTIATION_REPLY
    assert command.arguments["action"] == "counter"
    assert command.arguments["offer_id"] == "offer-44"
    assert command.arguments["details"] == "4800 ngn"


def test_parse_settlement_status_command():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(build_message(text="settlement esc-900"))

    assert command.intent == WhatsAppIntent.SETTLEMENT_STATUS
    assert command.arguments == {"escrow_id": "esc-900"}


def test_parse_interactive_payload_supports_settlement_buttons():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(
        build_message(
            message_type=WhatsAppMessageType.INTERACTIVE,
            text="",
            interactive_payload="intent:settlement_status|escrow_id:esc-901",
        )
    )

    assert command.intent == WhatsAppIntent.SETTLEMENT_STATUS
    assert command.arguments == {"escrow_id": "esc-901"}
    assert command.confidence_score == 0.98


def test_select_template_uses_locale_specific_variant_with_default_fallback():
    contract = WhatsAppAdapterContract()

    fr_template = contract.select_template(event_type="settlement_update", locale="fr")
    default_template = contract.select_template(event_type="listing_alert", locale="pt")

    assert fr_template.template_name == "settlement_update_fr_v1"
    assert default_template.template_name == "listing_alert_v1"
    assert default_template.fallback_channel == WhatsAppFallbackChannel.USSD


def test_fallback_hook_prefers_sms_for_delivery_failure_and_ussd_for_network():
    contract = WhatsAppAdapterContract()

    delivery_failed = contract.fallback_hook(
        delivery_failed=True,
        session_window_expired=False,
        network_degraded=False,
    )
    degraded_network = contract.fallback_hook(
        delivery_failed=False,
        session_window_expired=False,
        network_degraded=True,
    )

    assert delivery_failed.should_fallback is True
    assert delivery_failed.channel == WhatsAppFallbackChannel.SMS
    assert delivery_failed.reason == "delivery_failed"
    assert degraded_network.channel == WhatsAppFallbackChannel.USSD
    assert degraded_network.reason == "network_degraded"


def test_unknown_text_command_returns_low_confidence_unknown_intent():
    contract = WhatsAppAdapterContract()

    command = contract.parse_command(build_message(text="weather tomorrow"))

    assert command.intent == WhatsAppIntent.UNKNOWN
    assert command.command_name == "weather"
    assert command.arguments == {"raw_text": "weather tomorrow"}
    assert command.confidence_score == 0.2
