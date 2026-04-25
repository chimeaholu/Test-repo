"""B-014 advisory retrieval contract and citation metadata model."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tokenize(text: str) -> set[str]:
    return {token.strip(".,:;!?()[]{}\"'").lower() for token in text.split() if token.strip()}


class AdvisoryRetrievalContractError(ValueError):
    """Raised when an advisory retrieval request or catalog entry is invalid."""


@dataclass(frozen=True)
class VettedKnowledgeSource:
    source_id: str
    title: str
    publisher: str
    url: str
    body: str
    keywords: tuple[str, ...]
    country_codes: tuple[str, ...] = ()
    vetted: bool = True
    active: bool = True
    trust_tier: int = 1
    published_at: str = ""

    def __post_init__(self) -> None:
        if not self.source_id.strip():
            raise AdvisoryRetrievalContractError("source_id is required")
        if not self.title.strip():
            raise AdvisoryRetrievalContractError("title is required")
        if not self.publisher.strip():
            raise AdvisoryRetrievalContractError("publisher is required")
        if not self.url.strip():
            raise AdvisoryRetrievalContractError("url is required")
        if not self.body.strip():
            raise AdvisoryRetrievalContractError("body is required")
        if not self.keywords:
            raise AdvisoryRetrievalContractError("keywords must contain at least one term")
        if self.trust_tier < 1:
            raise AdvisoryRetrievalContractError("trust_tier must be >= 1")


@dataclass(frozen=True)
class AdvisoryRetrievalRequest:
    query: str
    country_code: str
    top_k: int = 3
    allowed_source_ids: tuple[str, ...] = ()
    min_trust_tier: int = 1

    def __post_init__(self) -> None:
        if not self.query.strip():
            raise AdvisoryRetrievalContractError("query is required")
        if not self.country_code.strip():
            raise AdvisoryRetrievalContractError("country_code is required")
        if self.top_k <= 0:
            raise AdvisoryRetrievalContractError("top_k must be greater than zero")
        if self.top_k > 20:
            raise AdvisoryRetrievalContractError("top_k must be <= 20")
        if self.min_trust_tier < 1:
            raise AdvisoryRetrievalContractError("min_trust_tier must be >= 1")


@dataclass(frozen=True)
class CitationMetadata:
    citation_id: str
    source_id: str
    rank: int
    title: str
    publisher: str
    url: str
    published_at: str
    excerpt: str
    relevance_score: float
    retrieved_at: str
    render_label: str


@dataclass(frozen=True)
class AdvisoryRetrievalResult:
    query: str
    country_code: str
    citations: tuple[CitationMetadata, ...]
    source_ids: tuple[str, ...]
    total_candidates: int
    filtered_candidates: int


class AdvisoryRetrievalContract:
    """Deterministic retrieval contract over vetted knowledge sources."""

    def __init__(
        self,
        *,
        sources: tuple[VettedKnowledgeSource, ...],
        clock: Callable[[], str] | None = None,
    ) -> None:
        self._sources = sources
        self._clock = clock or _utc_now_iso
        self._index = {source.source_id: source for source in sources}
        if len(self._index) != len(self._sources):
            raise AdvisoryRetrievalContractError("duplicate source_id values are not allowed")

    def retrieve(self, request: AdvisoryRetrievalRequest) -> AdvisoryRetrievalResult:
        query_tokens = _tokenize(request.query)
        country_code = request.country_code.upper()
        allowed_ids = {item for item in request.allowed_source_ids}

        def is_candidate(source: VettedKnowledgeSource) -> bool:
            if not source.vetted or not source.active:
                return False
            if source.trust_tier < request.min_trust_tier:
                return False
            if allowed_ids and source.source_id not in allowed_ids:
                return False
            if source.country_codes and country_code not in source.country_codes:
                return False
            return True

        candidates = [source for source in self._sources if is_candidate(source)]
        scored = [
            (source, self._score(source=source, query_tokens=query_tokens))
            for source in candidates
        ]
        relevant = [(source, score) for source, score in scored if score > 0]
        relevant.sort(key=lambda item: (-item[1], -item[0].trust_tier, item[0].source_id))
        selected = relevant[: request.top_k]

        retrieved_at = self._clock()
        citations: list[CitationMetadata] = []
        for index, (source, score) in enumerate(selected, start=1):
            excerpt = source.body[:160].strip()
            citations.append(
                CitationMetadata(
                    citation_id=f"cite-{index:03d}",
                    source_id=source.source_id,
                    rank=index,
                    title=source.title,
                    publisher=source.publisher,
                    url=source.url,
                    published_at=source.published_at,
                    excerpt=excerpt,
                    relevance_score=score,
                    retrieved_at=retrieved_at,
                    render_label=f"[{index}] {source.title} ({source.publisher})",
                )
            )

        return AdvisoryRetrievalResult(
            query=request.query,
            country_code=country_code,
            citations=tuple(citations),
            source_ids=tuple(item.source_id for item in citations),
            total_candidates=len(self._sources),
            filtered_candidates=len(candidates),
        )

    def _score(self, *, source: VettedKnowledgeSource, query_tokens: set[str]) -> float:
        source_tokens = _tokenize(source.title) | _tokenize(source.body) | {
            token.lower() for token in source.keywords
        }
        overlap = query_tokens.intersection(source_tokens)
        if not overlap:
            return 0.0
        score = len(overlap) + (source.trust_tier * 0.1)
        return round(score, 4)
