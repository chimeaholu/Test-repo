from agro_v2.advisory_retrieval import CitationMetadata
from agro_v2.frontend_citation_drawer import FrontendCitationDrawer
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives


def test_citation_drawer_keeps_proof_rows_and_trust_markers():
    drawer = FrontendCitationDrawer(
        state_library=build_default_frontend_state_primitives()
    )

    surface = drawer.build_surface(
        (
            CitationMetadata(
                citation_id="cite-012",
                source_id="src-012",
                rank=1,
                title="Certified Seed Guide",
                publisher="Extension",
                url="https://example.com/seed",
                published_at="2026-04-01",
                excerpt="Use certified seed.",
                relevance_score=0.8,
                retrieved_at="2026-04-13T00:00:00Z",
                render_label="[1] Certified Seed Guide (Extension)",
            ),
        )
    )
    audit = drawer.audit(surface)

    assert surface.proof_rows[0].citation_id == "cite-012"
    assert "audit_log" in surface.trust_state.trust_markers
    assert audit.passed is True
