from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.contracts_catalog import get_envelope_schema_version


EVALUATOR_VERSION = "eh4-rec-evaluator-v1"
NON_WEB_CHANNELS = {"whatsapp", "sms"}
MUTATING_KINDS = {"workflow_command", "transport_endpoint"}


def evaluate_recommendation_scenarios(
    *,
    scenarios: list[dict[str, Any]],
) -> dict[str, Any]:
    evaluated_scenarios: list[dict[str, Any]] = []
    for scenario in scenarios:
        recommendations = [
            item for item in scenario.get("recommendations", []) if isinstance(item, dict)
        ]
        expected_action_kinds = [
            str(item) for item in scenario.get("expected_action_kinds", []) if str(item)
        ]

        checks = [
            _check(
                check="non_empty_recommendation_set",
                passed=len(recommendations) > 0,
                detail=f"{len(recommendations)} recommendation(s) produced.",
            ),
            _check(
                check="expected_action_kind_present",
                passed=all(
                    any(
                        str(rec.get("action", {}).get("kind")) == expected_kind
                        for rec in recommendations
                    )
                    for expected_kind in expected_action_kinds
                ),
                detail=(
                    "Expected action kinds: "
                    + ", ".join(expected_action_kinds or ["none"])
                ),
            ),
            _check(
                check="mutating_actions_require_confirmation",
                passed=all(
                    str(rec.get("action", {}).get("kind")) not in MUTATING_KINDS
                    or bool(rec.get("action", {}).get("requires_confirmation"))
                    for rec in recommendations
                ),
                detail="Every workflow or transport mutation stays behind confirmation.",
            ),
            _check(
                check="channel_seam_not_web_only",
                passed=all(
                    "web" in set(_channels(rec))
                    and bool(set(_channels(rec)) & NON_WEB_CHANNELS)
                    for rec in recommendations
                ),
                detail="Each recommendation exposes web plus at least one non-web delivery path.",
            ),
        ]

        evaluated_scenarios.append(
            {
                "scenario_id": str(scenario["scenario_id"]),
                "actor_id": str(scenario["actor_id"]),
                "role": str(scenario["role"]),
                "expected_action_kinds": expected_action_kinds,
                "checks": checks,
                "passed": all(item["passed"] for item in checks),
            }
        )

    return {
        "schema_version": get_envelope_schema_version(),
        "evaluator_version": EVALUATOR_VERSION,
        "evaluated_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        "scenarios": evaluated_scenarios,
    }


def _channels(recommendation: dict[str, Any]) -> list[str]:
    action = recommendation.get("action", {})
    if not isinstance(action, dict):
        return []
    channel_seam = action.get("channel_seam", {})
    if not isinstance(channel_seam, dict):
        return []
    return [str(item) for item in channel_seam.get("supported_channels", []) if str(item)]


def _check(*, check: str, passed: bool, detail: str) -> dict[str, Any]:
    return {"check": check, "passed": passed, "detail": detail}
