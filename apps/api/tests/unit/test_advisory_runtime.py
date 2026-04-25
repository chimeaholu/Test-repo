from app.db.repositories.advisory import AdvisoryRepository
from app.modules.advisory.runtime import AdvisoryRuntime


def test_advisory_runtime_uses_vetted_country_sources_and_confidence_mapping(session) -> None:
    runtime = AdvisoryRuntime(AdvisoryRepository(session))

    result = runtime.submit_request(
        request_id="req-advisory-unit-1",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        locale="en-GH",
        channel="pwa",
        correlation_id="corr-advisory-unit-1",
        topic="soil moisture planning",
        question_text="What should I do about low soil moisture before replanting weak maize pockets?",
        transcript_entries=[],
        policy_context={"crop": "maize", "sensitive_topics": []},
    )

    assert result.advisory_request.country_code == "GH"
    assert result.advisory_request.confidence_band in {"medium", "high"}
    assert result.advisory_request.source_ids
    assert all(citation["country_code"] == "GH" for citation in result.citations)
    assert result.reviewer_decision.outcome in {"approve", "revise"}


def test_advisory_runtime_escalates_low_confidence_or_policy_sensitive_requests(session) -> None:
    runtime = AdvisoryRuntime(AdvisoryRepository(session))

    low_confidence = runtime.submit_request(
        request_id="req-advisory-unit-2",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        locale="en-GH",
        channel="pwa",
        correlation_id="corr-advisory-unit-2",
        topic="unmapped topic",
        question_text="Tell me the exact market outlook for an unmapped specialty crop with no seeded guidance.",
        transcript_entries=[],
        policy_context={"crop": "specialty", "sensitive_topics": []},
    )

    assert low_confidence.advisory_request.confidence_band == "low"
    assert low_confidence.advisory_request.status == "hitl_required"
    assert low_confidence.reviewer_decision.reason_code == "low_confidence_sources"

    policy_sensitive = runtime.submit_request(
        request_id="req-advisory-unit-3",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        locale="en-GH",
        channel="pwa",
        correlation_id="corr-advisory-unit-3",
        topic="fall armyworm treatment",
        question_text="What pesticide dosage should I spray for fall armyworm this week?",
        transcript_entries=[],
        policy_context={"crop": "maize", "sensitive_topics": ["pesticide"]},
    )

    assert policy_sensitive.advisory_request.source_ids
    assert policy_sensitive.advisory_request.status == "hitl_required"
    assert policy_sensitive.reviewer_decision.reason_code == "policy_sensitive_guidance"
