import pytest

from agro_v2.visual_language_system import (
    ColorToken,
    ComponentStyleRule,
    SpacingToken,
    TypographyToken,
    TypographyRole,
    VisualLanguageError,
    VisualLanguageSystem,
    build_default_visual_language_system,
)


def test_default_visual_language_system_uses_non_generic_fonts_and_ordered_tokens():
    system = build_default_visual_language_system()
    snapshot = system.token_snapshot()

    assert system.theme_name == "agro-harvest"
    assert snapshot["typography"]["display-xl"]["font_family"] == "Space Grotesk"
    assert snapshot["typography"]["body-md"]["font_family"] == "Source Sans 3"
    assert snapshot["spacing"]["space-8"] == 32


def test_component_style_validation_accepts_conforming_profile():
    system = build_default_visual_language_system()

    decision = system.validate_component_style(
        component_name="primary_button",
        typography_token="label-sm",
        foreground_color_token="grain-100",
        background_color_token="leaf-500",
        spacing_token="space-4",
        border_radius_px=16,
    )

    assert decision.passed is True
    assert decision.violations == ()
    assert decision.ux_data_check_id == "UXDI-001"


def test_component_style_validation_rejects_generic_or_mismatched_patterns():
    with pytest.raises(VisualLanguageError, match="generic font"):
        TypographyToken(
            token_id="body-generic",
            role=TypographyRole.BODY,
            font_family="Arial",
            size_px=16,
            line_height=1.4,
            weight=400,
            tracking_em=0.0,
        )

    system = build_default_visual_language_system()
    decision = system.validate_component_style(
        component_name="body_card",
        typography_token="heading-lg",
        foreground_color_token="soil-950",
        background_color_token="cloud-050",
        spacing_token="space-6",
        border_radius_px=8,
    )

    assert decision.passed is False
    assert "typography_token_mismatch" in decision.violations
    assert "border_radius_too_small" in decision.violations


def test_visual_language_hierarchy_requires_descending_roles():
    with pytest.raises(VisualLanguageError, match="typography hierarchy"):
        VisualLanguageSystem(
            theme_name="broken",
            typography_tokens=(
                TypographyToken("display", TypographyRole.DISPLAY, "Space Grotesk", 20, 1.0, 700, 0),
                TypographyToken("heading", TypographyRole.HEADING, "Space Grotesk", 24, 1.1, 600, 0),
                TypographyToken("body", TypographyRole.BODY, "Source Sans 3", 18, 1.4, 400, 0),
                TypographyToken("caption", TypographyRole.CAPTION, "Source Sans 3", 12, 1.4, 500, 0),
                TypographyToken("label", TypographyRole.LABEL, "Space Grotesk", 10, 1.2, 600, 0),
            ),
            color_tokens=(
                ColorToken("soil", "#1F130D", "surface_inverse"),
                ColorToken("grain", "#F2E7C9", "surface_default"),
            ),
            spacing_tokens=(SpacingToken("space-4", 16),),
            component_rules=(
                ComponentStyleRule(
                    component_name="body_card",
                    typography_token="body",
                    foreground_color_token="soil",
                    background_color_token="grain",
                    spacing_token="space-4",
                    min_border_radius_px=8,
                ),
            ),
        )
