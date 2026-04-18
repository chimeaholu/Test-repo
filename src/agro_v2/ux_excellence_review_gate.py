"""B-054 UX excellence design review gate."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .accessibility_readability_pack import AccessibilityWorkflowReport
from .android_mobile_ux_harness import AndroidUxSuiteReport


REQUIRED_TRUST_SIGNALS: tuple[str, ...] = (
    "confirmation_clarity",
    "ai_explainability",
    "offline_recovery",
    "support_path",
)
REQUIRED_CONVERSION_METRICS: tuple[str, ...] = (
    "onboarding_completion",
    "offer_to_settlement_completion",
    "advisory_follow_through",
    "dispute_resolution_completion",
)
GENERIC_FAIL_FINDINGS: tuple[str, ...] = (
    "template_like_layout",
    "generic_placeholder_copy",
    "missing_trust_cues",
)


class UxReviewPhase(str, Enum):
    PRE_BUILD = "pre_build"
    PRE_RELEASE = "pre_release"


class UxReviewCheck(str, Enum):
    VISUAL_LANGUAGE = "visual_language"
    INTERACTION_PATTERNS = "interaction_patterns"
    ACCESSIBILITY_BASELINE = "accessibility_baseline"
    TRUST_PATTERN_CHECKLIST = "trust_pattern_checklist"
    USABILITY_HEURISTICS = "usability_heuristics"
    CONVERSION_METRICS = "conversion_metrics"
    LOW_END_ANDROID = "low_end_android"
    GENERIC_PATTERN_AUDIT = "generic_pattern_audit"


class ReviewFindingSeverity(str, Enum):
    BLOCKER = "blocker"
    NON_BLOCKER = "non_blocker"


class UxExcellenceReviewError(ValueError):
    """Raised when UX excellence review evidence is malformed."""


@dataclass(frozen=True)
class ConversionMetric:
    metric_id: str
    actual: float
    threshold: float

    def __post_init__(self) -> None:
        if not self.metric_id.strip():
            raise UxExcellenceReviewError("metric_id is required")
        if self.threshold <= 0:
            raise UxExcellenceReviewError("threshold must be greater than zero")
        if self.actual < 0:
            raise UxExcellenceReviewError("actual must be greater than or equal to zero")


@dataclass(frozen=True)
class UxReviewFinding:
    finding_id: str
    summary: str
    severity: ReviewFindingSeverity

    def __post_init__(self) -> None:
        if not self.finding_id.strip():
            raise UxExcellenceReviewError("finding_id is required")
        if not self.summary.strip():
            raise UxExcellenceReviewError("summary is required")


@dataclass(frozen=True)
class UxReviewRequest:
    review_id: str
    phase: UxReviewPhase
    visual_language_approved: bool
    interaction_patterns_approved: bool
    accessibility_report: AccessibilityWorkflowReport
    trust_signals: tuple[str, ...]
    usability_heuristics_passed: bool
    conversion_metrics: tuple[ConversionMetric, ...]
    android_report: AndroidUxSuiteReport
    findings: tuple[UxReviewFinding, ...] = ()

    def __post_init__(self) -> None:
        if not self.review_id.strip():
            raise UxExcellenceReviewError("review_id is required")


@dataclass(frozen=True)
class UxReviewChecklistItem:
    check: UxReviewCheck
    passed: bool
    reason_code: str
    blocker: bool


@dataclass(frozen=True)
class UxReviewOutcome:
    passed: bool
    checklist: tuple[UxReviewChecklistItem, ...]
    blocking_reason_codes: tuple[str, ...]
    missing_trust_signals: tuple[str, ...]
    missing_metric_ids: tuple[str, ...]
    generic_blockers: tuple[str, ...]


class UxExcellenceDesignReviewGate:
    """Applies the UX hard-gate checklist for pre-build and pre-release signoff."""

    def review(self, request: UxReviewRequest) -> UxReviewOutcome:
        checklist = tuple(self._build_checklist(request))
        blocking_reason_codes = tuple(
            item.reason_code for item in checklist if not item.passed and item.blocker
        )
        missing_trust_signals = _missing_trust_signals(request.trust_signals)
        missing_metric_ids = _missing_metric_ids(request.conversion_metrics)
        generic_blockers = _generic_blockers(request.findings)
        return UxReviewOutcome(
            passed=not blocking_reason_codes,
            checklist=checklist,
            blocking_reason_codes=blocking_reason_codes,
            missing_trust_signals=missing_trust_signals,
            missing_metric_ids=missing_metric_ids,
            generic_blockers=generic_blockers,
        )

    def _build_checklist(self, request: UxReviewRequest) -> list[UxReviewChecklistItem]:
        if request.phase == UxReviewPhase.PRE_BUILD:
            return [
                self._visual_language_item(request),
                self._interaction_patterns_item(request),
                self._accessibility_item(request),
                self._trust_pattern_item(request),
            ]
        return [
            self._usability_item(request),
            self._conversion_metrics_item(request),
            self._android_item(request),
            self._generic_pattern_item(request),
        ]

    def _visual_language_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        if request.visual_language_approved:
            return UxReviewChecklistItem(
                check=UxReviewCheck.VISUAL_LANGUAGE,
                passed=True,
                reason_code="visual_language_approved",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.VISUAL_LANGUAGE,
            passed=False,
            reason_code="visual_language_not_approved",
            blocker=True,
        )

    def _interaction_patterns_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        if request.interaction_patterns_approved:
            return UxReviewChecklistItem(
                check=UxReviewCheck.INTERACTION_PATTERNS,
                passed=True,
                reason_code="interaction_patterns_approved",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.INTERACTION_PATTERNS,
            passed=False,
            reason_code="interaction_patterns_not_approved",
            blocker=True,
        )

    def _accessibility_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        if request.accessibility_report.passed:
            return UxReviewChecklistItem(
                check=UxReviewCheck.ACCESSIBILITY_BASELINE,
                passed=True,
                reason_code="accessibility_baseline_passed",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.ACCESSIBILITY_BASELINE,
            passed=False,
            reason_code="accessibility_baseline_incomplete",
            blocker=True,
        )

    def _trust_pattern_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        missing = _missing_trust_signals(request.trust_signals)
        if not missing:
            return UxReviewChecklistItem(
                check=UxReviewCheck.TRUST_PATTERN_CHECKLIST,
                passed=True,
                reason_code="trust_patterns_complete",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.TRUST_PATTERN_CHECKLIST,
            passed=False,
            reason_code="trust_patterns_incomplete",
            blocker=True,
        )

    def _usability_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        if request.usability_heuristics_passed:
            return UxReviewChecklistItem(
                check=UxReviewCheck.USABILITY_HEURISTICS,
                passed=True,
                reason_code="usability_heuristics_passed",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.USABILITY_HEURISTICS,
            passed=False,
            reason_code="usability_heuristics_failed",
            blocker=True,
        )

    def _conversion_metrics_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        missing = _missing_metric_ids(request.conversion_metrics)
        if missing:
            return UxReviewChecklistItem(
                check=UxReviewCheck.CONVERSION_METRICS,
                passed=False,
                reason_code="conversion_metrics_incomplete",
                blocker=True,
            )
        failed = [
            metric.metric_id
            for metric in request.conversion_metrics
            if metric.actual < metric.threshold
        ]
        if failed:
            return UxReviewChecklistItem(
                check=UxReviewCheck.CONVERSION_METRICS,
                passed=False,
                reason_code="conversion_metrics_below_threshold",
                blocker=True,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.CONVERSION_METRICS,
            passed=True,
            reason_code="conversion_metrics_passed",
            blocker=False,
        )

    def _android_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        if request.android_report.passed:
            return UxReviewChecklistItem(
                check=UxReviewCheck.LOW_END_ANDROID,
                passed=True,
                reason_code="low_end_android_passed",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.LOW_END_ANDROID,
            passed=False,
            reason_code="low_end_android_failed",
            blocker=True,
        )

    def _generic_pattern_item(self, request: UxReviewRequest) -> UxReviewChecklistItem:
        blockers = _generic_blockers(request.findings)
        if not blockers:
            return UxReviewChecklistItem(
                check=UxReviewCheck.GENERIC_PATTERN_AUDIT,
                passed=True,
                reason_code="generic_pattern_audit_clear",
                blocker=False,
            )
        return UxReviewChecklistItem(
            check=UxReviewCheck.GENERIC_PATTERN_AUDIT,
            passed=False,
            reason_code="generic_pattern_detected",
            blocker=True,
        )


def _missing_trust_signals(trust_signals: tuple[str, ...]) -> tuple[str, ...]:
    present = {signal.strip() for signal in trust_signals if signal.strip()}
    return tuple(signal for signal in REQUIRED_TRUST_SIGNALS if signal not in present)


def _missing_metric_ids(conversion_metrics: tuple[ConversionMetric, ...]) -> tuple[str, ...]:
    seen = {metric.metric_id for metric in conversion_metrics}
    return tuple(metric_id for metric_id in REQUIRED_CONVERSION_METRICS if metric_id not in seen)


def _generic_blockers(findings: tuple[UxReviewFinding, ...]) -> tuple[str, ...]:
    blockers = [
        finding.finding_id
        for finding in findings
        if finding.severity == ReviewFindingSeverity.BLOCKER
        and finding.finding_id in GENERIC_FAIL_FINDINGS
    ]
    return tuple(sorted(blockers))
