from agro_v2.advisory_retrieval import CitationMetadata, AdvisoryRetrievalResult
from agro_v2.multilingual_delivery import (
    DeliveryAudience,
    LocalizedCopy,
    MultilingualDeliveryFramework,
    MultilingualDeliveryError,
    ReadabilityState,
)


def build_result() -> AdvisoryRetrievalResult:
    return AdvisoryRetrievalResult(
        query="maize rust prevention",
        country_code="GH",
        citations=(
            CitationMetadata(
                citation_id="cite-001",
                source_id="src-1",
                rank=1,
                title="Rust Prevention Guide",
                publisher="Agro Extension",
                url="https://example.com/rust",
                published_at="2026-04-01",
                excerpt="Use certified seed and inspect leaves weekly.",
                relevance_score=0.91,
                retrieved_at="2026-04-13T00:00:00Z",
                render_label="[1] Rust Prevention Guide (Agro Extension)",
            ),
        ),
        source_ids=("src-1",),
        total_candidates=3,
        filtered_candidates=1,
    )


def test_resolve_locale_prefers_explicit_match():
    framework = MultilingualDeliveryFramework()

    locale, fallback_used = framework.resolve_locale(
        audience=DeliveryAudience(country_code="GH", preferred_locale="fr"),
        available_locales=("en", "fr"),
    )

    assert locale == "fr"
    assert fallback_used is False


def test_resolve_locale_falls_back_to_country_default_language():
    framework = MultilingualDeliveryFramework()

    locale, fallback_used = framework.resolve_locale(
        audience=DeliveryAudience(country_code="GH", preferred_locale="pt-BR"),
        available_locales=("en", "fr"),
    )

    assert locale == "en"
    assert fallback_used is True


def test_prepare_advisory_delivery_trims_copy_and_limits_citations():
    framework = MultilingualDeliveryFramework()
    result = build_result()

    plan = framework.prepare_advisory_delivery(
        audience=DeliveryAudience(country_code="GH", preferred_locale="en-GH"),
        advisory_result=result,
        localized_content={
            "en": LocalizedCopy(
                body="Check the leaves twice each week. Remove infected plants early.",
                cta_label="Read sources",
                summary="Rust prevention guidance",
            ),
        },
    )

    assert plan.locale == "en"
    assert plan.body == "Check the leaves twice each week. Remove infected plants early."
    assert plan.citations == ("[1] Rust Prevention Guide (Agro Extension)",)
    assert plan.readability.state == ReadabilityState.PASS


def test_assess_readability_flags_dense_copy_for_review():
    framework = MultilingualDeliveryFramework(max_sentence_words=8, max_long_words=1)

    assessment = framework.assess_readability(
        "Apply phytosanitary countermeasures immediately because infestation acceleration "
        "causes substantial downstream contamination risk."
    )

    assert assessment.state == ReadabilityState.REVIEW
    assert "sentence_length_exceeds_budget" in assessment.warnings
    assert "too_many_long_words" in assessment.warnings


def test_prepare_advisory_delivery_requires_localized_content():
    framework = MultilingualDeliveryFramework()

    try:
        framework.prepare_advisory_delivery(
            audience=DeliveryAudience(country_code="GH"),
            advisory_result=build_result(),
            localized_content={},
        )
    except MultilingualDeliveryError as exc:
        assert str(exc) == "localized_content must not be empty"
    else:
        raise AssertionError("expected MultilingualDeliveryError")
