from __future__ import annotations

from typing import Final

DEMO_TENANT_ID: Final[str] = "tenant:shared-demo"
DEMO_TENANT_LABEL: Final[str] = "Agrodomain shared demo tenant"
DEMO_ENVIRONMENT_SCOPE: Final[str] = "shared_demo_tenant"
DEMO_DATA_ORIGIN: Final[str] = "synthetic_demo"
DEMO_WATERMARK: Final[str] = (
    "Synthetic demo data only. Shared-environment demo tenant; do not treat as production truth."
)
DEMO_NAME_PREFIX: Final[str] = "AGD Demo | "
DEMO_ACTOR_PREFIX: Final[str] = "demo:"
DEMO_ID_PREFIX: Final[str] = "demo-"
DEMO_EMAIL_DOMAIN: Final[str] = "agrodomain-demo.invalid"
DEMO_OPERATOR_ACTOR_ID: Final[str] = "demo:operator:admin"
DEMO_OPERATOR_PASSWORD: Final[str] = "DemoAccess2026!"
DEMO_PROVENANCE_TAG: Final[str] = "synthetic_demo_seed"
DEMO_SCENARIO_PACK_VERSION: Final[str] = "eh2-2026-04-29"

DEMO_PERSONA_CATALOG: Final[list[dict[str, object]]] = [
    {
        "actor_id": DEMO_OPERATOR_ACTOR_ID,
        "role": "admin",
        "country_code": "GH",
        "display_name": f"{DEMO_NAME_PREFIX}Operator Console",
        "email": f"operator@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+233000100000",
        "organization_id": "demo-org-shared-operator",
        "organization_name": f"{DEMO_NAME_PREFIX}Operator Console",
        "scenario_key": "shared-operator",
        "scenario_label": "Shared demo control",
        "scenario_summary": "Switch across personas, keep the boundary labels visible, and guide shared-environment walkthroughs.",
        "operator": True,
    },
    {
        "actor_id": "demo:gh:farmer:kwame",
        "role": "farmer",
        "country_code": "GH",
        "display_name": f"{DEMO_NAME_PREFIX}Kwame Maize Farmer",
        "email": f"kwame.gh@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+233000100101",
        "organization_id": "demo-org-gh-market",
        "organization_name": f"{DEMO_NAME_PREFIX}Ghana Grain Corridor",
        "scenario_key": "gh-marketplace",
        "scenario_label": "Ghana marketplace trade",
        "scenario_summary": "Publishes maize supply, reviews wallet payout, and hands off to transport after buyer confirmation.",
        "operator": False,
    },
    {
        "actor_id": "demo:gh:buyer:ama",
        "role": "buyer",
        "country_code": "GH",
        "display_name": f"{DEMO_NAME_PREFIX}Ama Buyer Desk",
        "email": f"ama.gh@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+233000100202",
        "organization_id": "demo-org-gh-market",
        "organization_name": f"{DEMO_NAME_PREFIX}Ghana Grain Corridor",
        "scenario_key": "gh-marketplace",
        "scenario_label": "Ghana marketplace trade",
        "scenario_summary": "Shortlists the maize lot, negotiates the final price, and confirms escrow release readiness.",
        "operator": False,
    },
    {
        "actor_id": "demo:gh:transporter:kofi",
        "role": "transporter",
        "country_code": "GH",
        "display_name": f"{DEMO_NAME_PREFIX}Kofi Trucker",
        "email": f"kofi.gh@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+233000100303",
        "organization_id": "demo-org-gh-logistics",
        "organization_name": f"{DEMO_NAME_PREFIX}Northern Logistics Lane",
        "scenario_key": "gh-logistics",
        "scenario_label": "Ghana logistics handoff",
        "scenario_summary": "Claims the scheduled load, updates shipment milestones, and closes the last-mile proof trail.",
        "operator": False,
    },
    {
        "actor_id": "demo:gh:finance:esi",
        "role": "finance",
        "country_code": "GH",
        "display_name": f"{DEMO_NAME_PREFIX}Esi Finance Queue",
        "email": f"esi.gh@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+233000100404",
        "organization_id": "demo-org-gh-finance",
        "organization_name": f"{DEMO_NAME_PREFIX}Settlement Desk",
        "scenario_key": "gh-wallet",
        "scenario_label": "Ghana settlement controls",
        "scenario_summary": "Monitors payout balances, escrow settlement events, and operator-visible financial controls.",
        "operator": False,
    },
    {
        "actor_id": "demo:ng:farmer:chioma",
        "role": "farmer",
        "country_code": "NG",
        "display_name": f"{DEMO_NAME_PREFIX}Chioma Rice Farmer",
        "email": f"chioma.ng@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+234000100101",
        "organization_id": "demo-org-ng-climate",
        "organization_name": f"{DEMO_NAME_PREFIX}Nigeria Climate Response Lane",
        "scenario_key": "ng-climate",
        "scenario_label": "Nigeria climate and advisory",
        "scenario_summary": "Receives flood-risk alerts, logs farm activity, and requests advisory guidance with grounded evidence.",
        "operator": False,
    },
    {
        "actor_id": "demo:ng:buyer:emeka",
        "role": "buyer",
        "country_code": "NG",
        "display_name": f"{DEMO_NAME_PREFIX}Emeka Procurement Desk",
        "email": f"emeka.ng@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+234000100202",
        "organization_id": "demo-org-ng-market",
        "organization_name": f"{DEMO_NAME_PREFIX}Nigeria Demand Desk",
        "scenario_key": "ng-marketplace",
        "scenario_label": "Nigeria demand discovery",
        "scenario_summary": "Explores active supply and tracks pricing posture without touching operational entities.",
        "operator": False,
    },
    {
        "actor_id": "demo:ng:transporter:halima",
        "role": "transporter",
        "country_code": "NG",
        "display_name": f"{DEMO_NAME_PREFIX}Halima Fleet Dispatch",
        "email": f"halima.ng@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+234000100303",
        "organization_id": "demo-org-ng-logistics",
        "organization_name": f"{DEMO_NAME_PREFIX}Kaduna Dispatch Lane",
        "scenario_key": "ng-logistics",
        "scenario_label": "Nigeria dispatch monitor",
        "scenario_summary": "Shows active lane capacity, shipment event tracking, and transport coordination status.",
        "operator": False,
    },
    {
        "actor_id": "demo:ng:extension:fatima",
        "role": "extension_agent",
        "country_code": "NG",
        "display_name": f"{DEMO_NAME_PREFIX}Fatima Advisory Desk",
        "email": f"fatima.ng@{DEMO_EMAIL_DOMAIN}",
        "phone_number": "+234000100404",
        "organization_id": "demo-org-ng-climate",
        "organization_name": f"{DEMO_NAME_PREFIX}Nigeria Climate Response Lane",
        "scenario_key": "ng-climate",
        "scenario_label": "Nigeria climate and advisory",
        "scenario_summary": "Responds to farmer questions, cites synthetic agronomy sources, and closes the reviewer loop.",
        "operator": False,
    },
]

DEMO_RUNBOOK: Final[list[dict[str, object]]] = [
    {
        "runbook_id": "gh-marketplace-walkthrough",
        "title": "Ghana maize trade walkthrough",
        "summary": "Operator -> Farmer -> Buyer -> Transporter -> Finance. Demonstrates listing, negotiation, escrow release, and payout progression.",
        "actor_ids": [
            DEMO_OPERATOR_ACTOR_ID,
            "demo:gh:farmer:kwame",
            "demo:gh:buyer:ama",
            "demo:gh:transporter:kofi",
            "demo:gh:finance:esi",
        ],
    },
    {
        "runbook_id": "ng-climate-walkthrough",
        "title": "Nigeria climate response walkthrough",
        "summary": "Operator -> Farmer -> Extension Agent. Demonstrates advisory grounding, alert provenance, and admin-safe synthetic reporting.",
        "actor_ids": [
            DEMO_OPERATOR_ACTOR_ID,
            "demo:ng:farmer:chioma",
            "demo:ng:extension:fatima",
        ],
    },
]


def is_demo_actor_id(actor_id: str | None) -> bool:
    return bool(actor_id and actor_id.startswith(DEMO_ACTOR_PREFIX))


def is_demo_operator_actor_id(actor_id: str | None) -> bool:
    return actor_id == DEMO_OPERATOR_ACTOR_ID


def is_demo_email(email: str | None) -> bool:
    return bool(email and email.lower().endswith(f"@{DEMO_EMAIL_DOMAIN}"))


def is_demo_phone_number(phone_number: str | None) -> bool:
    return bool(phone_number and (phone_number.startswith("+233000") or phone_number.startswith("+234000")))


def is_demo_identifier(value: str | None) -> bool:
    return bool(value and value.startswith(DEMO_ID_PREFIX))


def same_demo_boundary(left_actor_id: str | None, right_actor_id: str | None) -> bool:
    return is_demo_actor_id(left_actor_id) == is_demo_actor_id(right_actor_id)


def workspace_payload_for_session_record(record) -> dict[str, object] | None:
    if not is_demo_actor_id(getattr(record, "actor_id", None)):
        return None

    return {
        "tenant_id": DEMO_TENANT_ID,
        "tenant_label": DEMO_TENANT_LABEL,
        "environment_scope": DEMO_ENVIRONMENT_SCOPE,
        "data_origin": DEMO_DATA_ORIGIN,
        "is_demo_tenant": True,
        "watermark": DEMO_WATERMARK,
        "suppressed_rails": [
            "production_reporting",
            "operational_entity_lookup",
            "external_contact_delivery",
        ],
        "operator_can_switch_personas": is_demo_operator_actor_id(getattr(record, "actor_id", None)),
    }


def demo_persona_definition(actor_id: str) -> dict[str, object] | None:
    for persona in DEMO_PERSONA_CATALOG:
        if persona["actor_id"] == actor_id:
            return persona
    return None
