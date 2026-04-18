"""F-012 citation and proof drawer primitives."""

from __future__ import annotations

from dataclasses import dataclass

from .advisory_retrieval import CitationMetadata
from .frontend_state_primitives import FrontendStatePrimitiveLibrary, StatePrimitive


class FrontendCitationDrawerError(ValueError):
    """Raised when citation drawers or proof rows are missing required trust cues."""


@dataclass(frozen=True)
class ProofRow:
    citation_id: str
    label: str
    excerpt: str
    url: str


@dataclass(frozen=True)
class CitationDrawerSurface:
    drawer_title: str
    proof_rows: tuple[ProofRow, ...]
    trust_state: StatePrimitive


@dataclass(frozen=True)
class CitationDrawerAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendCitationDrawer:
    """Builds proof-bearing citation drawers for advisory and trust surfaces."""

    def __init__(self, *, state_library: FrontendStatePrimitiveLibrary) -> None:
        self._state_library = state_library

    def build_surface(self, citations: tuple[CitationMetadata, ...]) -> CitationDrawerSurface:
        if not citations:
            raise FrontendCitationDrawerError("citations must not be empty")
        trust_state = self._state_library.primitive_for(
            flow=self._flow(),
            state=self._state(),
        )
        return CitationDrawerSurface(
            drawer_title="Sources and proof",
            proof_rows=tuple(
                ProofRow(
                    citation_id=citation.citation_id,
                    label=citation.render_label,
                    excerpt=citation.excerpt,
                    url=citation.url,
                )
                for citation in citations
            ),
            trust_state=trust_state,
        )

    def audit(self, surface: CitationDrawerSurface) -> CitationDrawerAudit:
        issues: list[str] = []
        if not surface.proof_rows:
            issues.append("proof_rows_missing")
        if "audit_log" not in surface.trust_state.trust_markers:
            issues.append("audit_log_marker_missing")
        return CitationDrawerAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="citation-inspection-tests",
            ux_data_check_id="F-012",
        )

    @staticmethod
    def _flow():
        from .interaction_feedback_library import CriticalFlow

        return CriticalFlow.ADVISORY_REQUEST

    @staticmethod
    def _state():
        from .interaction_feedback_library import InteractionState

        return InteractionState.TRUST
