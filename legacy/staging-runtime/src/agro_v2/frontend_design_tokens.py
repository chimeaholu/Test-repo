"""F-003 frontend design token bindings built on the visual language system."""

from __future__ import annotations

from dataclasses import dataclass

from .visual_language_system import VisualLanguageSystem, build_default_visual_language_system


class FrontendDesignTokenError(ValueError):
    """Raised when frontend token bindings are incomplete or invalid."""


@dataclass(frozen=True)
class SurfaceTokenBinding:
    surface_name: str
    typography_token: str
    foreground_color_token: str
    background_color_token: str
    spacing_token: str
    emphasis_color_token: str

    def __post_init__(self) -> None:
        if not self.surface_name.strip():
            raise FrontendDesignTokenError("surface_name is required")


@dataclass(frozen=True)
class FrontendThemeAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendDesignTokenBundle:
    """Maps the generic visual language contract onto routed frontend surfaces."""

    def __init__(
        self,
        *,
        visual_system: VisualLanguageSystem,
        bindings: tuple[SurfaceTokenBinding, ...],
    ) -> None:
        if not bindings:
            raise FrontendDesignTokenError("bindings must not be empty")
        self.visual_system = visual_system
        self._bindings = {binding.surface_name: binding for binding in bindings}
        if len(self._bindings) != len(bindings):
            raise FrontendDesignTokenError("duplicate surface binding")
        self._validate_bindings()

    def binding_for(self, surface_name: str) -> SurfaceTokenBinding:
        try:
            return self._bindings[surface_name]
        except KeyError as exc:
            raise FrontendDesignTokenError(f"unknown surface binding: {surface_name}") from exc

    def token_snapshot(self) -> dict[str, object]:
        return {
            "theme_name": self.visual_system.theme_name,
            "surface_bindings": {
                surface_name: {
                    "typography_token": binding.typography_token,
                    "foreground_color_token": binding.foreground_color_token,
                    "background_color_token": binding.background_color_token,
                    "spacing_token": binding.spacing_token,
                    "emphasis_color_token": binding.emphasis_color_token,
                }
                for surface_name, binding in self._bindings.items()
            },
        }

    def audit(self) -> FrontendThemeAudit:
        issues: list[str] = []
        shell = self._bindings.get("app_shell")
        queue = self._bindings.get("queue_card")
        if shell is None:
            issues.append("app_shell_binding_missing")
        if queue is None:
            issues.append("queue_card_binding_missing")
        if shell and shell.background_color_token == queue.background_color_token:
            issues.append("surface_layers_not_distinct")
        if shell and shell.typography_token == "body-sm":
            issues.append("shell_typography_too_small")
        return FrontendThemeAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="visual-regression",
            ux_data_check_id="a11y-base",
        )

    def _validate_bindings(self) -> None:
        for binding in self._bindings.values():
            if binding.typography_token not in self.visual_system.typography_tokens:
                raise FrontendDesignTokenError("binding references unknown typography token")
            if binding.foreground_color_token not in self.visual_system.color_tokens:
                raise FrontendDesignTokenError("binding references unknown foreground color token")
            if binding.background_color_token not in self.visual_system.color_tokens:
                raise FrontendDesignTokenError("binding references unknown background color token")
            if binding.spacing_token not in self.visual_system.spacing_tokens:
                raise FrontendDesignTokenError("binding references unknown spacing token")
            if binding.emphasis_color_token not in self.visual_system.color_tokens:
                raise FrontendDesignTokenError("binding references unknown emphasis color token")


def build_default_frontend_design_tokens() -> FrontendDesignTokenBundle:
    visual_system = build_default_visual_language_system()
    return FrontendDesignTokenBundle(
        visual_system=visual_system,
        bindings=(
            SurfaceTokenBinding(
                surface_name="app_shell",
                typography_token="body-md",
                foreground_color_token="soil-950",
                background_color_token="grain-100",
                spacing_token="space-6",
                emphasis_color_token="leaf-500",
            ),
            SurfaceTokenBinding(
                surface_name="queue_card",
                typography_token="body-md",
                foreground_color_token="soil-950",
                background_color_token="cloud-050",
                spacing_token="space-4",
                emphasis_color_token="sun-500",
            ),
            SurfaceTokenBinding(
                surface_name="proof_drawer",
                typography_token="caption-sm",
                foreground_color_token="soil-950",
                background_color_token="grain-100",
                spacing_token="space-4",
                emphasis_color_token="leaf-500",
            ),
            SurfaceTokenBinding(
                surface_name="focus_ring",
                typography_token="label-sm",
                foreground_color_token="soil-950",
                background_color_token="cloud-050",
                spacing_token="space-2",
                emphasis_color_token="leaf-500",
            ),
        ),
    )
