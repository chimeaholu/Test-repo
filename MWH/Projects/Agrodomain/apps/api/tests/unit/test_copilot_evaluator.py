from app.modules.copilot.evaluator import evaluate_recommendation_scenarios


def test_copilot_evaluator_flags_missing_confirmation_on_mutating_actions() -> None:
    report = evaluate_recommendation_scenarios(
        scenarios=[
            {
                "scenario_id": "unsafe-marketplace-command",
                "actor_id": "actor-farmer-gh-evaluator",
                "role": "farmer",
                "expected_action_kinds": ["workflow_command"],
                "recommendations": [
                    {
                        "action": {
                            "channel_seam": {
                                "supported_channels": ["web", "whatsapp"],
                            },
                            "kind": "workflow_command",
                            "requires_confirmation": False,
                        }
                    }
                ],
            }
        ]
    )

    scenario = report["scenarios"][0]
    assert scenario["passed"] is False
    assert any(
        check["check"] == "mutating_actions_require_confirmation" and check["passed"] is False
        for check in scenario["checks"]
    )
