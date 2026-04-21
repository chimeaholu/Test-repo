"""B-052 accessibility and readability compliance pack."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .interaction_feedback_library import (
    CriticalFlow,
    InteractionFeedbackLibrary,
    InteractionState,
    build_default_interaction_feedback_library,
)
from .visual_language_system import VisualLanguageSystem, build_default_visual_language_system


class AccessibilityReadabilityError(ValueError):
    """Raised when accessibility review rules or evidence are malformed."""


class LiteracyBand(str, Enum):
    LOW_LITERACY = "low_literacy"
    TRANSITIONAL = "transitional"
    ADVANCED = "advanced"


@dataclass(frozen=True)
class AccessibilityStandard:
    component_name: str
    max_reading_grade: float
    min_font_size_px: int
    min_contrast_ratio: float
    min_tap_target_px: int
    max_primary_action_words: int
    requires_screen_reader_label: bool = True
    requires_visual_label: bool = True
    voice_hint_states: tuple[InteractionState, ...] = ()

    def __post_init__(self) -> None:
        if not self.component_name.strip():
            raise AccessibilityReadabilityError("component_name is required")
        if self.max_reading_grade <= 0:
            raise AccessibilityReadabilityError("max_reading_grade must be greater than zero")
        if self.min_font_size_px <= 0:
            raise AccessibilityReadabilityError("min_font_size_px must be greater than zero")
        if self.min_contrast_ratio < 4.5:
            raise AccessibilityReadabilityError("min_contrast_ratio must be at least 4.5")
        if self.min_tap_target_px < 44:
            raise AccessibilityReadabilityError("min_tap_target_px must be at least 44")
        if self.max_primary_action_words <= 0:
            raise AccessibilityReadabilityError(
                "max_primary_action_words must be greater than zero"
            )


@dataclass(frozen=True)
class AccessibilityReviewItem:
    flow: CriticalFlow
    state: InteractionState
    component_name: str
    reading_grade: float
    font_size_px: int
    contrast_ratio: float
    tap_target_px: int
    primary_action_words: int
    has_visual_label: bool
    screen_reader_label: str
    has_voice_hint: bool
    support_contact_visible: bool

    def __post_init__(self) -> None:
        if not self.component_name.strip():
            raise AccessibilityReadabilityError("component_name is required")
        if self.reading_grade < 0:
            raise AccessibilityReadabilityError("reading_grade must be >= 0")
        if self.font_size_px <= 0:
            raise AccessibilityReadabilityError("font_size_px must be greater than zero")
        if self.contrast_ratio <= 0:
            raise AccessibilityReadabilityError("contrast_ratio must be greater than zero")
        if self.tap_target_px <= 0:
            raise AccessibilityReadabilityError("tap_target_px must be greater than zero")
        if self.primary_action_words <= 0:
            raise AccessibilityReadabilityError(
                "primary_action_words must be greater than zero"
            )


@dataclass(frozen=True)
class AccessibilityAuditResult:
    flow: CriticalFlow
    state: InteractionState
    passed: bool
    literacy_band: LiteracyBand
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


@dataclass(frozen=True)
class AccessibilityWorkflowReport:
    passed: bool
    reviewed_items: int
    missing_pairs: tuple[str, ...]
    failing_pairs: tuple[str, ...]
    covered_flows: tuple[str, ...]


class AccessibilityReadabilityCompliancePack:
    """Audits low-literacy and mobile accessibility evidence for UX flows."""

    def __init__(
        self,
        *,
        visual_system: VisualLanguageSystem,
        interaction_library: InteractionFeedbackLibrary,
        standards: tuple[AccessibilityStandard, ...],
    ) -> None:
        if not standards:
            raise AccessibilityReadabilityError("standards must not be empty")
        self.visual_system = visual_system
        self.interaction_library = interaction_library
        self._standards = {standard.component_name: standard for standard in standards}
        if len(self._standards) != len(standards):
            raise AccessibilityReadabilityError("duplicate accessibility standard registration")
        self._validate_standards()

    def audit(self, item: AccessibilityReviewItem) -> AccessibilityAuditResult:
        try:
            self.interaction_library.resolve(flow=item.flow, state=item.state)
        except Exception as exc:
            raise AccessibilityReadabilityError(
                f"interaction pattern missing for {item.flow.value}:{item.state.value}"
            ) from exc

        standard = self._get_standard(item.component_name)
        issues: list[str] = []

        if item.reading_grade > standard.max_reading_grade:
            issues.append("reading_grade_too_high")
        if item.font_size_px < standard.min_font_size_px:
            issues.append("font_size_too_small")
        if item.contrast_ratio < standard.min_contrast_ratio:
            issues.append("contrast_ratio_too_low")
        if item.tap_target_px < standard.min_tap_target_px:
            issues.append("tap_target_too_small")
        if item.primary_action_words > standard.max_primary_action_words:
            issues.append("primary_action_too_long")
        if standard.requires_visual_label and not item.has_visual_label:
            issues.append("visual_label_missing")
        if standard.requires_screen_reader_label and not item.screen_reader_label.strip():
            issues.append("screen_reader_label_missing")
        if item.state in standard.voice_hint_states and not item.has_voice_hint:
            issues.append("voice_hint_missing")
        if item.state in {
            InteractionState.ERROR,
            InteractionState.OFFLINE,
            InteractionState.RETRY,
        } and not item.support_contact_visible:
            issues.append("support_contact_missing")

        return AccessibilityAuditResult(
            flow=item.flow,
            state=item.state,
            passed=not issues,
            literacy_band=_literacy_band_for_grade(item.reading_grade),
            issues=tuple(issues),
            ux_journey_id="UXJ-003",
            ux_data_check_id="UXDI-003",
        )

    def validate_workflow(
        self,
        review_items: tuple[AccessibilityReviewItem, ...],
    ) -> AccessibilityWorkflowReport:
        if not review_items:
            raise AccessibilityReadabilityError("review_items must not be empty")

        audits = {(item.flow, item.state): self.audit(item) for item in review_items}
        missing_pairs: list[str] = []
        failing_pairs: list[str] = []

        for flow in CriticalFlow:
            for state in InteractionState:
                key = (flow, state)
                audit = audits.get(key)
                if audit is None:
                    missing_pairs.append(f"{flow.value}:{state.value}")
                    continue
                if not audit.passed:
                    failing_pairs.append(f"{flow.value}:{state.value}")

        return AccessibilityWorkflowReport(
            passed=not missing_pairs and not failing_pairs,
            reviewed_items=len(review_items),
            missing_pairs=tuple(missing_pairs),
            failing_pairs=tuple(failing_pairs),
            covered_flows=tuple(sorted({item.flow.value for item in review_items})),
        )

    def compliance_snapshot(self) -> dict[str, object]:
        return {
            "standard_count": len(self._standards),
            "components": sorted(self._standards),
            "voice_hint_states": {
                component: sorted(state.value for state in standard.voice_hint_states)
                for component, standard in self._standards.items()
            },
        }

    def _get_standard(self, component_name: str) -> AccessibilityStandard:
        try:
            return self._standards[component_name]
        except KeyError as exc:
            raise AccessibilityReadabilityError(
                f"component {component_name} has no accessibility standard"
            ) from exc

    def _validate_standards(self) -> None:
        for component_name in self._standards:
            if component_name not in self.visual_system.component_rules:
                raise AccessibilityReadabilityError(
                    f"accessibility standard references unknown component {component_name}"
                )


def build_default_accessibility_readability_pack() -> AccessibilityReadabilityCompliancePack:
    return AccessibilityReadabilityCompliancePack(
        visual_system=build_default_visual_language_system(),
        interaction_library=build_default_interaction_feedback_library(),
        standards=(
            AccessibilityStandard(
                component_name="body_card",
                max_reading_grade=6.0,
                min_font_size_px=16,
                min_contrast_ratio=4.5,
                min_tap_target_px=44,
                max_primary_action_words=3,
                voice_hint_states=(
                    InteractionState.ERROR,
                    InteractionState.OFFLINE,
                    InteractionState.RETRY,
                ),
            ),
            AccessibilityStandard(
                component_name="primary_button",
                max_reading_grade=5.0,
                min_font_size_px=16,
                min_contrast_ratio=4.5,
                min_tap_target_px=48,
                max_primary_action_words=2,
                voice_hint_states=(
                    InteractionState.ERROR,
                    InteractionState.OFFLINE,
                    InteractionState.RETRY,
                ),
            ),
        ),
    )


def _literacy_band_for_grade(reading_grade: float) -> LiteracyBand:
    if reading_grade <= 5:
        return LiteracyBand.LOW_LITERACY
    if reading_grade <= 8:
        return LiteracyBand.TRANSITIONAL
    return LiteracyBand.ADVANCED
