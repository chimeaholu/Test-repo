"""B-050 visual language tokens and component conformance rules."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class VisualLanguageError(ValueError):
    """Raised when design-token or component style contracts are invalid."""


class TypographyRole(str, Enum):
    DISPLAY = "display"
    HEADING = "heading"
    BODY = "body"
    CAPTION = "caption"
    LABEL = "label"


GENERIC_FONT_FAMILIES = frozenset({"arial", "roboto", "inter", "system-ui", "sans-serif"})


@dataclass(frozen=True)
class TypographyToken:
    token_id: str
    role: TypographyRole
    font_family: str
    size_px: int
    line_height: float
    weight: int
    tracking_em: float

    def __post_init__(self) -> None:
        if not self.token_id.strip():
            raise VisualLanguageError("token_id is required")
        if not self.font_family.strip():
            raise VisualLanguageError("font_family is required")
        normalized = self.font_family.lower().replace('"', "").replace("'", "")
        if normalized in GENERIC_FONT_FAMILIES:
            raise VisualLanguageError("generic font families are prohibited")
        if self.size_px <= 0:
            raise VisualLanguageError("size_px must be > 0")
        if self.line_height < 1:
            raise VisualLanguageError("line_height must be >= 1")
        if self.weight < 100 or self.weight > 900:
            raise VisualLanguageError("weight must be between 100 and 900")


@dataclass(frozen=True)
class ColorToken:
    token_id: str
    hex_value: str
    semantic_role: str

    def __post_init__(self) -> None:
        if not self.token_id.strip():
            raise VisualLanguageError("token_id is required")
        if not self.semantic_role.strip():
            raise VisualLanguageError("semantic_role is required")
        if not self.hex_value.startswith("#") or len(self.hex_value) != 7:
            raise VisualLanguageError("hex_value must be a 6-digit hex color")


@dataclass(frozen=True)
class SpacingToken:
    token_id: str
    value_px: int

    def __post_init__(self) -> None:
        if not self.token_id.strip():
            raise VisualLanguageError("token_id is required")
        if self.value_px <= 0:
            raise VisualLanguageError("value_px must be > 0")


@dataclass(frozen=True)
class ComponentStyleRule:
    component_name: str
    typography_token: str
    foreground_color_token: str
    background_color_token: str
    spacing_token: str
    min_border_radius_px: int

    def __post_init__(self) -> None:
        if not self.component_name.strip():
            raise VisualLanguageError("component_name is required")
        if not self.typography_token.strip():
            raise VisualLanguageError("typography_token is required")
        if not self.foreground_color_token.strip():
            raise VisualLanguageError("foreground_color_token is required")
        if not self.background_color_token.strip():
            raise VisualLanguageError("background_color_token is required")
        if not self.spacing_token.strip():
            raise VisualLanguageError("spacing_token is required")
        if self.min_border_radius_px < 0:
            raise VisualLanguageError("min_border_radius_px must be >= 0")


@dataclass(frozen=True)
class ComponentStyleDecision:
    component_name: str
    passed: bool
    rule_id: str
    violations: tuple[str, ...]
    ux_data_check_id: str


class VisualLanguageSystem:
    """Codifies typography, color, and spacing with explicit component rules."""

    def __init__(
        self,
        *,
        theme_name: str,
        typography_tokens: tuple[TypographyToken, ...],
        color_tokens: tuple[ColorToken, ...],
        spacing_tokens: tuple[SpacingToken, ...],
        component_rules: tuple[ComponentStyleRule, ...],
    ) -> None:
        if not theme_name.strip():
            raise VisualLanguageError("theme_name is required")
        if not typography_tokens:
            raise VisualLanguageError("typography_tokens must not be empty")
        if not color_tokens:
            raise VisualLanguageError("color_tokens must not be empty")
        if not spacing_tokens:
            raise VisualLanguageError("spacing_tokens must not be empty")
        if not component_rules:
            raise VisualLanguageError("component_rules must not be empty")
        self.theme_name = theme_name
        self.typography_tokens = {token.token_id: token for token in typography_tokens}
        self.color_tokens = {token.token_id: token for token in color_tokens}
        self.spacing_tokens = {token.token_id: token for token in spacing_tokens}
        self.component_rules = {rule.component_name: rule for rule in component_rules}
        self._validate_hierarchy()

    def validate_component_style(
        self,
        *,
        component_name: str,
        typography_token: str,
        foreground_color_token: str,
        background_color_token: str,
        spacing_token: str,
        border_radius_px: int,
    ) -> ComponentStyleDecision:
        rule = self._get_rule(component_name)
        violations: list[str] = []
        if typography_token != rule.typography_token:
            violations.append("typography_token_mismatch")
        if foreground_color_token != rule.foreground_color_token:
            violations.append("foreground_color_mismatch")
        if background_color_token != rule.background_color_token:
            violations.append("background_color_mismatch")
        if spacing_token != rule.spacing_token:
            violations.append("spacing_token_mismatch")
        if border_radius_px < rule.min_border_radius_px:
            violations.append("border_radius_too_small")
        return ComponentStyleDecision(
            component_name=component_name,
            passed=not violations,
            rule_id=f"{self.theme_name}:{component_name}",
            violations=tuple(violations),
            ux_data_check_id="UXDI-001",
        )

    def token_snapshot(self) -> dict[str, object]:
        return {
            "theme_name": self.theme_name,
            "typography": {
                token_id: {
                    "role": token.role.value,
                    "font_family": token.font_family,
                    "size_px": token.size_px,
                    "line_height": token.line_height,
                    "weight": token.weight,
                }
                for token_id, token in self.typography_tokens.items()
            },
            "colors": {
                token_id: {
                    "hex_value": token.hex_value,
                    "semantic_role": token.semantic_role,
                }
                for token_id, token in self.color_tokens.items()
            },
            "spacing": {token_id: token.value_px for token_id, token in self.spacing_tokens.items()},
        }

    def _get_rule(self, component_name: str) -> ComponentStyleRule:
        try:
            return self.component_rules[component_name]
        except KeyError as exc:
            raise VisualLanguageError("component_name is not registered") from exc

    def _validate_hierarchy(self) -> None:
        ordered_roles = [
            TypographyRole.DISPLAY,
            TypographyRole.HEADING,
            TypographyRole.BODY,
            TypographyRole.CAPTION,
        ]
        sizes = {}
        for role in ordered_roles:
            matches = [token.size_px for token in self.typography_tokens.values() if token.role == role]
            if not matches:
                raise VisualLanguageError(f"missing typography token for role {role.value}")
            sizes[role] = max(matches)
        if not (
            sizes[TypographyRole.DISPLAY]
            > sizes[TypographyRole.HEADING]
            > sizes[TypographyRole.BODY]
            > sizes[TypographyRole.CAPTION]
        ):
            raise VisualLanguageError("typography hierarchy must descend display > heading > body > caption")

        spacing_values = [token.value_px for token in self.spacing_tokens.values()]
        if spacing_values != sorted(spacing_values):
            raise VisualLanguageError("spacing tokens must be ordered from tight to loose")

        for rule in self.component_rules.values():
            if rule.typography_token not in self.typography_tokens:
                raise VisualLanguageError("component rule references unknown typography token")
            if rule.foreground_color_token not in self.color_tokens:
                raise VisualLanguageError("component rule references unknown foreground color token")
            if rule.background_color_token not in self.color_tokens:
                raise VisualLanguageError("component rule references unknown background color token")
            if rule.spacing_token not in self.spacing_tokens:
                raise VisualLanguageError("component rule references unknown spacing token")


def build_default_visual_language_system() -> VisualLanguageSystem:
    return VisualLanguageSystem(
        theme_name="agro-harvest",
        typography_tokens=(
            TypographyToken(
                token_id="display-xl",
                role=TypographyRole.DISPLAY,
                font_family="Space Grotesk",
                size_px=48,
                line_height=1.05,
                weight=700,
                tracking_em=-0.03,
            ),
            TypographyToken(
                token_id="heading-lg",
                role=TypographyRole.HEADING,
                font_family="Space Grotesk",
                size_px=32,
                line_height=1.1,
                weight=600,
                tracking_em=-0.02,
            ),
            TypographyToken(
                token_id="body-md",
                role=TypographyRole.BODY,
                font_family="Source Sans 3",
                size_px=18,
                line_height=1.5,
                weight=400,
                tracking_em=0.0,
            ),
            TypographyToken(
                token_id="caption-sm",
                role=TypographyRole.CAPTION,
                font_family="Source Sans 3",
                size_px=14,
                line_height=1.4,
                weight=500,
                tracking_em=0.01,
            ),
            TypographyToken(
                token_id="label-sm",
                role=TypographyRole.LABEL,
                font_family="Space Grotesk",
                size_px=12,
                line_height=1.2,
                weight=600,
                tracking_em=0.08,
            ),
        ),
        color_tokens=(
            ColorToken("soil-950", "#1F130D", "surface_inverse"),
            ColorToken("leaf-500", "#5FAF4E", "accent_primary"),
            ColorToken("grain-100", "#F2E7C9", "surface_default"),
            ColorToken("sun-500", "#E59B2F", "accent_secondary"),
            ColorToken("cloud-050", "#FBF7EF", "surface_muted"),
        ),
        spacing_tokens=(
            SpacingToken("space-2", 8),
            SpacingToken("space-3", 12),
            SpacingToken("space-4", 16),
            SpacingToken("space-6", 24),
            SpacingToken("space-8", 32),
        ),
        component_rules=(
            ComponentStyleRule(
                component_name="hero_banner",
                typography_token="display-xl",
                foreground_color_token="soil-950",
                background_color_token="grain-100",
                spacing_token="space-8",
                min_border_radius_px=20,
            ),
            ComponentStyleRule(
                component_name="primary_button",
                typography_token="label-sm",
                foreground_color_token="grain-100",
                background_color_token="leaf-500",
                spacing_token="space-4",
                min_border_radius_px=14,
            ),
            ComponentStyleRule(
                component_name="body_card",
                typography_token="body-md",
                foreground_color_token="soil-950",
                background_color_token="cloud-050",
                spacing_token="space-6",
                min_border_radius_px=18,
            ),
        ),
    )
