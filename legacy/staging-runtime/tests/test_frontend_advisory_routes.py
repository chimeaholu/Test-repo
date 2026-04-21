from agro_v2.advisory_retrieval import CitationMetadata, AdvisoryRetrievalResult
from agro_v2.frontend_accessibility_primitives import (
    build_default_frontend_accessibility_primitives,
)
from agro_v2.frontend_advisory_routes import FrontendAdvisoryRoutes
from agro_v2.multilingual_delivery import (
    DeliveryAudience,
    LocalizedCopy,
    MultilingualDeliveryFramework,
)


def build_result() -> AdvisoryRetrievalResult:
    return AdvisoryRetrievalResult(
        query="maize rust",
        country_code="GH",
        citations=(
            CitationMetadata(
                citation_id="cite-011",
                source_id="src-011",
                rank=1,
                title="Maize Rust Guide",
                publisher="MoFA Ghana",
                url="https://example.com/rust",
                published_at="2026-04-01",
                excerpt="Inspect leaves twice each week.",
                relevance_score=0.91,
                retrieved_at="2026-04-13T00:00:00Z",
                render_label="[1] Maize Rust Guide (MoFA Ghana)",
            ),
        ),
        source_ids=("src-011",),
        total_candidates=3,
        filtered_candidates=1,
    )


def test_advisory_routes_build_composer_and_localized_answer():
    routes = FrontendAdvisoryRoutes(
        accessibility=build_default_frontend_accessibility_primitives(),
        delivery=MultilingualDeliveryFramework(),
    )

    composer = routes.build_composer()
    answer = routes.build_answer(
        audience=DeliveryAudience(country_code="GH", preferred_locale="en-GH"),
        advisory_result=build_result(),
        localized_content={
            "en": LocalizedCopy(
                body="Inspect leaves twice each week. Remove infected plants early.",
                cta_label="Read sources",
            )
        },
    )
    audit = routes.audit(composer=composer, answer=answer)

    assert composer.submit_label == "Ask for advice"
    assert answer.locale == "en"
    assert answer.citations == ("[1] Maize Rust Guide (MoFA Ghana)",)
    assert audit.passed is True
