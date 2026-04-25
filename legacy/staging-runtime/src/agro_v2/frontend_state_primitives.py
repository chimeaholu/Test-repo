"""F-004 routed interaction-state primitives for the frontend foundation."""

from __future__ import annotations

from dataclasses import dataclass

from .interaction_feedback_library import (
    CriticalFlow,
    InteractionFeedbackLibrary,
    InteractionState,
    build_default_interaction_feedback_library,
)
from .offline_queue import ConnectivityState


class FrontendStatePrimitiveError(ValueError):
    """Raised when frontend state wrappers are missing or inconsistent."""


@dataclass(frozen=True)
class StatePrimitive:
    primitive_id: str
    wrapper_component: str
    state: InteractionState
    headline: str
    body: str
    primary_action: str
    suggested_channel: str | None
    trust_markers: tuple[str, ...]


@dataclass(frozen=True)
class StateCoverageReport:
    passed: bool
    missing_pairs: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendStatePrimitiveLibrary:
    """Projects interaction feedback into reusable frontend wrapper primitives."""

    def __init__(
        self,
        *,
        interaction_library: InteractionFeedbackLibrary,
    ) -> None:
        self.interaction_library = interaction_library

    def primitive_for(
        self,
        *,
        flow: CriticalFlow,
        state: InteractionState,
        connectivity_state: ConnectivityState = ConnectivityState.ONLINE,
        queue_depth: int = 0,
    ) -> StatePrimitive:
        pattern = self.interaction_library.resolve(
            flow=flow,
            state=state,
            connectivity_state=connectivity_state,
            queue_depth=queue_depth,
        )
        audit = self.interaction_library.audit_flow(
            flow=flow,
            connectivity_state=connectivity_state,
            queue_depth=queue_depth,
        )
        wrapper_component = {
            InteractionState.LOADING: "LoadingPanel",
            InteractionState.ERROR: "ErrorPanel",
            InteractionState.OFFLINE: "OfflinePanel",
            InteractionState.RETRY: "RetryPanel",
            InteractionState.TRUST: "TrustPanel",
        }[state]
        return StatePrimitive(
            primitive_id=f"{flow.value}:{state.value}",
            wrapper_component=wrapper_component,
            state=state,
            headline=pattern.headline,
            body=pattern.body,
            primary_action=pattern.primary_action,
            suggested_channel=audit.suggested_channel,
            trust_markers=pattern.trust_markers,
        )

    def coverage_report(self) -> StateCoverageReport:
        missing_pairs: list[str] = []
        for flow in CriticalFlow:
            for state in InteractionState:
                try:
                    self.primitive_for(flow=flow, state=state)
                except Exception:
                    missing_pairs.append(f"{flow.value}:{state.value}")
        return StateCoverageReport(
            passed=not missing_pairs,
            missing_pairs=tuple(missing_pairs),
            ux_journey_id="queue-state-tests",
            ux_data_check_id="F-004",
        )


def build_default_frontend_state_primitives() -> FrontendStatePrimitiveLibrary:
    return FrontendStatePrimitiveLibrary(
        interaction_library=build_default_interaction_feedback_library()
    )
