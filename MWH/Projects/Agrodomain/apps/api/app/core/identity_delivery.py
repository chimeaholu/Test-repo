from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.core.config import Settings

DeliveryChannel = Literal["sms", "email"]


@dataclass(frozen=True)
class DeliveryPlan:
    channel: DeliveryChannel
    provider: str
    fallback_provider: str | None
    target: str
    masked_target: str


def normalize_phone_number(phone_number: str, *, country_code: str) -> str:
    digits = "".join(character for character in phone_number if character.isdigit())
    if phone_number.startswith("+"):
        return f"+{digits}"
    if country_code == "GH":
        if digits.startswith("0"):
            digits = digits[1:]
        return f"+233{digits}"
    if country_code == "NG":
        if digits.startswith("0"):
            digits = digits[1:]
        return f"+234{digits}"
    return f"+{digits}"


def mask_delivery_target(target: str, *, channel: DeliveryChannel) -> str:
    if channel == "email":
        local_part, _, domain = target.partition("@")
        prefix = local_part[:2]
        return f"{prefix}***@{domain}"
    suffix = target[-4:] if len(target) >= 4 else target
    return f"***{suffix}"


def select_delivery_plan(
    *,
    settings: Settings,
    country_code: str,
    channel: DeliveryChannel,
    email: str | None,
    phone_number: str | None,
) -> DeliveryPlan:
    if channel == "sms":
        if not phone_number:
            raise ValueError("sms_delivery_requires_phone_number")
        normalized_phone = normalize_phone_number(phone_number, country_code=country_code)
        fallback_provider = settings.auth_magic_link_fallback_provider
        if settings.auth_magic_link_primary_provider == "africas_talking" and country_code == "NG":
            fallback_provider = "termii"
        return DeliveryPlan(
            channel="sms",
            provider=settings.auth_magic_link_primary_provider,
            fallback_provider=fallback_provider,
            target=normalized_phone,
            masked_target=mask_delivery_target(normalized_phone, channel="sms"),
        )
    if not email:
        raise ValueError("email_delivery_requires_email")
    normalized_email = email.strip().lower()
    return DeliveryPlan(
        channel="email",
        provider="smtp",
        fallback_provider=None,
        target=normalized_email,
        masked_target=mask_delivery_target(normalized_email, channel="email"),
    )
