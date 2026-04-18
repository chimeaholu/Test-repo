import pytest

from agro_v2.advisory_retrieval import (
    AdvisoryRetrievalContract,
    AdvisoryRetrievalContractError,
    AdvisoryRetrievalRequest,
    VettedKnowledgeSource,
)


def build_sources() -> tuple[VettedKnowledgeSource, ...]:
    return (
        VettedKnowledgeSource(
            source_id="src-001",
            title="Maize Pest Management Basics",
            publisher="MoFA Ghana",
            url="https://example.org/mofa/maize-pest",
            body="Maize farmers should scout weekly and use integrated pest management.",
            keywords=("maize", "pest", "management", "scout"),
            country_codes=("GH", "NG"),
            trust_tier=3,
            published_at="2026-03-01",
        ),
        VettedKnowledgeSource(
            source_id="src-002",
            title="Cassava Disease Advisory Note",
            publisher="RADA Jamaica",
            url="https://example.org/rada/cassava",
            body="Cassava disease response should include clean planting material and rotation.",
            keywords=("cassava", "disease", "rotation"),
            country_codes=("JM",),
            trust_tier=2,
            published_at="2026-02-15",
        ),
        VettedKnowledgeSource(
            source_id="src-003",
            title="Draft Unvetted Blog",
            publisher="Unknown",
            url="https://example.org/blog/draft",
            body="Unvetted claims should never appear in advisory output.",
            keywords=("advisory", "blog"),
            country_codes=("GH",),
            vetted=False,
            trust_tier=1,
            published_at="2026-01-10",
        ),
    )


def test_retrieve_filters_to_vetted_country_relevant_sources():
    contract = AdvisoryRetrievalContract(
        sources=build_sources(),
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )
    result = contract.retrieve(
        AdvisoryRetrievalRequest(
            query="maize pest control",
            country_code="gh",
            top_k=3,
        )
    )

    assert result.country_code == "GH"
    assert result.total_candidates == 3
    assert result.filtered_candidates == 1
    assert result.source_ids == ("src-001",)
    [citation] = result.citations
    assert citation.source_id == "src-001"
    assert citation.rank == 1
    assert citation.citation_id == "cite-001"
    assert citation.render_label == "[1] Maize Pest Management Basics (MoFA Ghana)"


def test_retrieve_respects_allowed_source_ids():
    contract = AdvisoryRetrievalContract(
        sources=build_sources(),
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )
    result = contract.retrieve(
        AdvisoryRetrievalRequest(
            query="maize pest management",
            country_code="GH",
            allowed_source_ids=("src-002",),
        )
    )

    assert result.filtered_candidates == 0
    assert result.citations == ()
    assert result.source_ids == ()


def test_retrieve_ranks_relevance_then_trust_tier():
    sources = (
        VettedKnowledgeSource(
            source_id="src-010",
            title="Maize Nutrition and Pest Guide",
            publisher="Agro Institute",
            url="https://example.org/agro/maize-guide",
            body="Maize nutrition and pest checks improve outcomes.",
            keywords=("maize", "nutrition", "pest"),
            country_codes=("GH",),
            trust_tier=2,
            published_at="2026-01-01",
        ),
        VettedKnowledgeSource(
            source_id="src-011",
            title="Maize Pest Guide Premium",
            publisher="Gov Extension",
            url="https://example.org/gov/maize-premium",
            body="Maize pest guidance with integrated scouting.",
            keywords=("maize", "pest", "scouting"),
            country_codes=("GH",),
            trust_tier=4,
            published_at="2026-01-02",
        ),
    )
    contract = AdvisoryRetrievalContract(
        sources=sources,
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )

    result = contract.retrieve(
        AdvisoryRetrievalRequest(
            query="maize pest scouting",
            country_code="GH",
            top_k=2,
        )
    )

    assert [item.source_id for item in result.citations] == ["src-011", "src-010"]
    assert result.citations[0].relevance_score >= result.citations[1].relevance_score


def test_retrieve_enforces_request_contract():
    contract = AdvisoryRetrievalContract(sources=build_sources())

    with pytest.raises(AdvisoryRetrievalContractError, match="query is required"):
        contract.retrieve(
            AdvisoryRetrievalRequest(query=" ", country_code="GH")
        )

    with pytest.raises(AdvisoryRetrievalContractError, match="top_k"):
        contract.retrieve(
            AdvisoryRetrievalRequest(query="maize", country_code="GH", top_k=0)
        )


def test_source_contract_rejects_invalid_catalog_entries():
    with pytest.raises(AdvisoryRetrievalContractError, match="keywords"):
        VettedKnowledgeSource(
            source_id="src-bad",
            title="Bad Source",
            publisher="Example",
            url="https://example.org/bad",
            body="No keywords included.",
            keywords=(),
        )
