"""Country pack policy resolution for West Africa and Caribbean bootstrap."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CountryPolicy:
    country_code: str
    region: str
    currency: str
    supports_ussd: bool
    supports_whatsapp: bool
    default_locale: str


_POLICIES = {
    "GH": CountryPolicy(
        country_code="GH",
        region="west_africa",
        currency="GHS",
        supports_ussd=True,
        supports_whatsapp=True,
        default_locale="en-GH",
    ),
    "NG": CountryPolicy(
        country_code="NG",
        region="west_africa",
        currency="NGN",
        supports_ussd=True,
        supports_whatsapp=True,
        default_locale="en-NG",
    ),
    "JM": CountryPolicy(
        country_code="JM",
        region="caribbean",
        currency="JMD",
        supports_ussd=False,
        supports_whatsapp=True,
        default_locale="en-JM",
    ),
}


def resolve_country_policy(country_code: str) -> CountryPolicy:
    """Resolve policy by ISO alpha-2 country code."""
    key = country_code.strip().upper()
    if key not in _POLICIES:
        raise ValueError(f"Unsupported country code: {country_code}")
    return _POLICIES[key]

