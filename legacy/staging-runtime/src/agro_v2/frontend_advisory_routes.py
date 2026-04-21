"""F-011 advisory request and answer route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .advisory_retrieval import AdvisoryRetrievalResult
from .frontend_accessibility_primitives import FrontendAccessibilityPrimitives
from .multilingual_delivery import DeliveryAudience, LocalizedCopy, MultilingualDeliveryFramework


class FrontendAdvisoryRouteError(ValueError):
    """Raised when advisory request or answer surfaces are incomplete."""


@dataclass(frozen=True)
class AdvisoryComposerSurface:
    request_route: str
    field_ids: tuple[str, ...]
    helper_text: tuple[str, ...]
    submit_label: str


@dataclass(frozen=True)
class AdvisoryAnswerSurface:
    answer_route: str
    locale: str
    body: str
    cta_label: str
    citations: tuple[str, ...]
    readability_warnings: tuple[str, ...]


@dataclass(frozen=True)
class AdvisoryRouteAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendAdvisoryRoutes:
    """Builds advisory request and answer surfaces from retrieval plus localization."""

    def __init__(
        self,
        *,
        accessibility: FrontendAccessibilityPrimitives,
        delivery: MultilingualDeliveryFramework,
    ) -> None:
        self._accessibility = accessibility
        self._delivery = delivery

    def build_composer(self) -> AdvisoryComposerSurface:
        phone_helper = self._accessibility.helper_for("consent-phone")
        language_helper = self._accessibility.helper_for("consent-language")
        return AdvisoryComposerSurface(
            request_route="/app/advisory/request",
            field_ids=("crop_type", "question", "photo_optional", "preferred_locale"),
            helper_text=(phone_helper.helper_text, language_helper.helper_text),
            submit_label="Ask for advice",
        )

    def build_answer(
        self,
        *,
        audience: DeliveryAudience,
        advisory_result: AdvisoryRetrievalResult,
        localized_content: dict[str, LocalizedCopy],
    ) -> AdvisoryAnswerSurface:
        delivery_plan = self._delivery.prepare_advisory_delivery(
            audience=audience,
            advisory_result=advisory_result,
            localized_content=localized_content,
        )
        return AdvisoryAnswerSurface(
            answer_route="/app/advisory/answers/latest",
            locale=delivery_plan.locale,
            body=delivery_plan.body,
            cta_label=delivery_plan.cta_label,
            citations=delivery_plan.citations,
            readability_warnings=delivery_plan.readability.warnings,
        )

    def audit(
        self,
        *,
        composer: AdvisoryComposerSurface,
        answer: AdvisoryAnswerSurface,
    ) -> AdvisoryRouteAudit:
        issues: list[str] = []
        if "question" not in composer.field_ids:
            issues.append("question_field_missing")
        if not answer.citations:
            issues.append("citations_missing")
        return AdvisoryRouteAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C05",
            ux_data_check_id="F-011",
        )
