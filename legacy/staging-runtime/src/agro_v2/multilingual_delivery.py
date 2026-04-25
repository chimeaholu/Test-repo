"""B-016 multilingual delivery framework for low-literacy advisory responses."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .advisory_retrieval import AdvisoryRetrievalResult
from .country_pack import resolve_country_policy


class ReadabilityState(str, Enum):
    PASS = "pass"
    REVIEW = "review"


class MultilingualDeliveryError(ValueError):
    """Raised when delivery inputs cannot be resolved safely."""


@dataclass(frozen=True)
class LocalizedCopy:
    body: str
    cta_label: str
    summary: str | None = None

    def __post_init__(self) -> None:
        if not self.body.strip():
            raise MultilingualDeliveryError("body is required")
        if not self.cta_label.strip():
            raise MultilingualDeliveryError("cta_label is required")


@dataclass(frozen=True)
class DeliveryAudience:
    country_code: str
    preferred_locale: str | None = None
    fallback_locale: str | None = None
    channel: str = "advisory"

    def __post_init__(self) -> None:
        if not self.country_code.strip():
            raise MultilingualDeliveryError("country_code is required")
        if not self.channel.strip():
            raise MultilingualDeliveryError("channel is required")


@dataclass(frozen=True)
class ReadabilityAssessment:
    state: ReadabilityState
    sentence_count: int
    longest_sentence_words: int
    long_word_count: int
    warnings: tuple[str, ...]


@dataclass(frozen=True)
class MultilingualDeliveryPlan:
    locale: str
    fallback_used: bool
    body: str
    cta_label: str
    summary: str | None
    citations: tuple[str, ...]
    readability: ReadabilityAssessment


class MultilingualDeliveryFramework:
    """Resolves localized copy and flags readability risks before delivery."""

    def __init__(
        self,
        *,
        supported_locales: tuple[str, ...] = ("en", "en-gh", "en-ng", "en-jm", "fr"),
        default_locale: str = "en",
        max_sentence_words: int = 18,
        max_long_words: int = 6,
    ) -> None:
        normalized = tuple(_normalize_locale(locale) for locale in supported_locales)
        if not normalized:
            raise MultilingualDeliveryError("supported_locales must not be empty")
        self._supported_locales = normalized
        self._default_locale = _normalize_locale(default_locale)
        self._max_sentence_words = max_sentence_words
        self._max_long_words = max_long_words

    def prepare_advisory_delivery(
        self,
        *,
        audience: DeliveryAudience,
        advisory_result: AdvisoryRetrievalResult,
        localized_content: dict[str, LocalizedCopy],
    ) -> MultilingualDeliveryPlan:
        if not localized_content:
            raise MultilingualDeliveryError("localized_content must not be empty")

        normalized_content = {
            _normalize_locale(locale): copy for locale, copy in localized_content.items()
        }
        resolved_locale, fallback_used = self.resolve_locale(
            audience=audience,
            available_locales=tuple(normalized_content),
        )
        copy = normalized_content[resolved_locale]
        readability = self.assess_readability(copy.body)

        citations = tuple(
            citation.render_label
            for citation in advisory_result.citations[:3]
        )
        return MultilingualDeliveryPlan(
            locale=resolved_locale,
            fallback_used=fallback_used,
            body=copy.body.strip(),
            cta_label=copy.cta_label.strip(),
            summary=(copy.summary or "").strip() or None,
            citations=citations,
            readability=readability,
        )

    def resolve_locale(
        self,
        *,
        audience: DeliveryAudience,
        available_locales: tuple[str, ...],
    ) -> tuple[str, bool]:
        if not available_locales:
            raise MultilingualDeliveryError("available_locales must not be empty")

        normalized_available = {_normalize_locale(locale) for locale in available_locales}
        policy = resolve_country_policy(audience.country_code)
        candidates = (
            audience.preferred_locale,
            audience.fallback_locale,
            policy.default_locale,
            self._default_locale,
        )
        for locale in candidates:
            for candidate in _locale_fallback_chain(locale):
                if candidate in normalized_available and candidate in self._supported_locales:
                    requested = _normalize_locale(audience.preferred_locale or "")
                    return candidate, bool(requested and candidate != requested)
        raise MultilingualDeliveryError("no supported locale available for audience")

    def assess_readability(self, text: str) -> ReadabilityAssessment:
        normalized_text = " ".join(text.split())
        if not normalized_text:
            raise MultilingualDeliveryError("text is required")

        sentences = [segment.strip() for segment in _split_sentences(normalized_text) if segment.strip()]
        sentence_lengths = [len(sentence.split()) for sentence in sentences] or [0]
        longest_sentence_words = max(sentence_lengths)
        long_word_count = sum(
            1
            for word in normalized_text.split()
            if len(word.strip(".,:;!?()[]{}\"'")) >= 10
        )

        warnings: list[str] = []
        if longest_sentence_words > self._max_sentence_words:
            warnings.append("sentence_length_exceeds_budget")
        if long_word_count > self._max_long_words:
            warnings.append("too_many_long_words")
        if len(sentences) < 2:
            warnings.append("single_sentence_delivery")

        state = ReadabilityState.PASS if not warnings else ReadabilityState.REVIEW
        return ReadabilityAssessment(
            state=state,
            sentence_count=len(sentences),
            longest_sentence_words=longest_sentence_words,
            long_word_count=long_word_count,
            warnings=tuple(warnings),
        )


def _normalize_locale(locale: str) -> str:
    normalized = locale.strip().replace("_", "-").lower()
    if not normalized:
        return "en"
    return normalized


def _locale_fallback_chain(locale: str | None) -> tuple[str, ...]:
    normalized = _normalize_locale(locale or "")
    language = normalized.split("-", 1)[0]
    if normalized == language:
        return (language,)
    return (normalized, language)


def _split_sentences(text: str) -> tuple[str, ...]:
    parts: list[str] = []
    current: list[str] = []
    for character in text:
        current.append(character)
        if character in ".!?":
            parts.append("".join(current))
            current = []
    if current:
        parts.append("".join(current))
    return tuple(parts)
