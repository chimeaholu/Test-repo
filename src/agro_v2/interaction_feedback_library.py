"""B-051 interaction and feedback pattern library."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .offline_queue import ConnectivityState, OfflineQueue
from .visual_language_system import VisualLanguageSystem, build_default_visual_language_system


class InteractionFeedbackError(ValueError):
    """Raised when interaction feedback patterns are incomplete or invalid."""


class CriticalFlow(str, Enum):
    LISTING_CREATE = "listing_create"
    NEGOTIATION_REPLY = "negotiation_reply"
    SETTLEMENT_STATUS = "settlement_status"
    ADVISORY_REQUEST = "advisory_request"
    OFFLINE_SYNC = "offline_sync"


class InteractionState(str, Enum):
    LOADING = "loading"
    ERROR = "error"
    OFFLINE = "offline"
    RETRY = "retry"
    TRUST = "trust"


@dataclass(frozen=True)
class FeedbackPattern:
    flow: CriticalFlow
    state: InteractionState
    component_name: str
    headline: str
    body: str
    primary_action: str
    trust_markers: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.component_name.strip():
            raise InteractionFeedbackError("component_name is required")
        if not self.headline.strip():
            raise InteractionFeedbackError("headline is required")
        if not self.body.strip():
            raise InteractionFeedbackError("body is required")
        if not self.primary_action.strip():
            raise InteractionFeedbackError("primary_action is required")
        if self.state == InteractionState.TRUST and not self.trust_markers:
            raise InteractionFeedbackError("trust state patterns require trust_markers")


@dataclass(frozen=True)
class FeedbackDecision:
    flow: CriticalFlow
    state: InteractionState
    passed: bool
    issues: tuple[str, ...]
    suggested_channel: str | None
    ux_journey_id: str
    ux_data_check_id: str


class InteractionFeedbackLibrary:
    """Enforces interaction-state coverage and offline guidance for critical flows."""

    def __init__(
        self,
        *,
        visual_system: VisualLanguageSystem,
        offline_queue: OfflineQueue | None = None,
        patterns: tuple[FeedbackPattern, ...],
    ) -> None:
        if not patterns:
            raise InteractionFeedbackError("patterns must not be empty")
        self.visual_system = visual_system
        self.offline_queue = offline_queue or OfflineQueue()
        self._patterns = {(pattern.flow, pattern.state): pattern for pattern in patterns}
        if len(self._patterns) != len(patterns):
            raise InteractionFeedbackError("duplicate flow/state pattern registration")
        self._validate_coverage()

    def resolve(
        self,
        *,
        flow: CriticalFlow,
        state: InteractionState,
        connectivity_state: ConnectivityState = ConnectivityState.ONLINE,
        queue_depth: int = 0,
    ) -> FeedbackPattern:
        decision = self.audit_flow(
            flow=flow,
            connectivity_state=connectivity_state,
            queue_depth=queue_depth,
        )
        if not decision.passed:
            raise InteractionFeedbackError(
                f"flow {flow.value} failed interaction coverage audit: {decision.issues!r}"
            )
        try:
            return self._patterns[(flow, state)]
        except KeyError as exc:
            raise InteractionFeedbackError(
                f"missing interaction pattern for {flow.value}:{state.value}"
            ) from exc

    def audit_flow(
        self,
        *,
        flow: CriticalFlow,
        connectivity_state: ConnectivityState = ConnectivityState.ONLINE,
        queue_depth: int = 0,
    ) -> FeedbackDecision:
        issues: list[str] = []
        for state in InteractionState:
            pattern = self._patterns.get((flow, state))
            if pattern is None:
                issues.append(f"missing_state:{state.value}")
                continue
            if pattern.component_name not in self.visual_system.component_rules:
                issues.append(f"unknown_component:{pattern.component_name}")

        suggested_channel = None
        if connectivity_state != ConnectivityState.ONLINE:
            handoff = self.offline_queue.connectivity_handoff(
                connectivity_state,
                queue_depth=queue_depth,
            )
            suggested_channel = handoff.suggested_channel.value if handoff.suggested_channel else None
            if not handoff.should_prompt:
                issues.append("offline_state_missing_handoff")

        return FeedbackDecision(
            flow=flow,
            state=InteractionState.OFFLINE if connectivity_state != ConnectivityState.ONLINE else InteractionState.LOADING,
            passed=not issues,
            issues=tuple(issues),
            suggested_channel=suggested_channel,
            ux_journey_id="UXJ-002",
            ux_data_check_id="UXDI-002",
        )

    def coverage_snapshot(self) -> dict[str, object]:
        return {
            "flow_count": len(CriticalFlow),
            "states_per_flow": {
                flow.value: sorted(
                    state.value
                    for registered_flow, state in self._patterns
                    if registered_flow == flow
                )
                for flow in CriticalFlow
            },
            "component_names": sorted(
                {pattern.component_name for pattern in self._patterns.values()}
            ),
        }

    def _validate_coverage(self) -> None:
        missing_components: list[str] = []
        for flow in CriticalFlow:
            for state in InteractionState:
                pattern = self._patterns.get((flow, state))
                if pattern is None:
                    raise InteractionFeedbackError(
                        f"missing interaction pattern for {flow.value}:{state.value}"
                    )
                if pattern.component_name not in self.visual_system.component_rules:
                    missing_components.append(pattern.component_name)
        if missing_components:
            raise InteractionFeedbackError(
                "patterns reference unknown visual components: "
                + ", ".join(sorted(set(missing_components)))
            )


def build_default_interaction_feedback_library() -> InteractionFeedbackLibrary:
    visual_system = build_default_visual_language_system()
    patterns = tuple(
        _pattern_for(flow, state)
        for flow in CriticalFlow
        for state in InteractionState
    )
    return InteractionFeedbackLibrary(
        visual_system=visual_system,
        patterns=patterns,
    )


def _pattern_for(flow: CriticalFlow, state: InteractionState) -> FeedbackPattern:
    flow_label = {
        CriticalFlow.LISTING_CREATE: "listing",
        CriticalFlow.NEGOTIATION_REPLY: "offer response",
        CriticalFlow.SETTLEMENT_STATUS: "settlement status",
        CriticalFlow.ADVISORY_REQUEST: "advice request",
        CriticalFlow.OFFLINE_SYNC: "sync queue",
    }[flow]

    component_name = (
        "primary_button"
        if state in {InteractionState.LOADING, InteractionState.RETRY, InteractionState.TRUST}
        else "body_card"
    )
    headline = {
        InteractionState.LOADING: f"Preparing {flow_label}",
        InteractionState.ERROR: f"{flow_label.title()} needs attention",
        InteractionState.OFFLINE: f"{flow_label.title()} saved for low signal",
        InteractionState.RETRY: f"Retry {flow_label}",
        InteractionState.TRUST: f"{flow_label.title()} proof ready",
    }[state]
    body = {
        InteractionState.LOADING: "Keep the user informed while the next step is prepared.",
        InteractionState.ERROR: "Explain the blocker in plain language and keep the recovery path explicit.",
        InteractionState.OFFLINE: "Preserve the action, show the fallback path, and avoid silent loss.",
        InteractionState.RETRY: "Expose a deterministic retry action with the same intent token.",
        InteractionState.TRUST: "Surface source, policy, or audit cues before asking for confidence.",
    }[state]
    primary_action = {
        InteractionState.LOADING: "wait",
        InteractionState.ERROR: "review",
        InteractionState.OFFLINE: "switch_channel",
        InteractionState.RETRY: "retry",
        InteractionState.TRUST: "view_proof",
    }[state]
    trust_markers = (
        ("audit_log", "source_link")
        if state == InteractionState.TRUST
        else ()
    )
    return FeedbackPattern(
        flow=flow,
        state=state,
        component_name=component_name,
        headline=headline,
        body=body,
        primary_action=primary_action,
        trust_markers=trust_markers,
    )
