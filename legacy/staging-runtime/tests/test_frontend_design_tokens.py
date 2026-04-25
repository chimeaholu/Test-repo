from agro_v2.frontend_design_tokens import (
    FrontendDesignTokenError,
    FrontendDesignTokenBundle,
    SurfaceTokenBinding,
    build_default_frontend_design_tokens,
)
from agro_v2.visual_language_system import build_default_visual_language_system
import pytest


def test_default_frontend_design_tokens_bind_shell_and_queue_surfaces():
    bundle = build_default_frontend_design_tokens()
    snapshot = bundle.token_snapshot()
    audit = bundle.audit()

    assert snapshot["theme_name"] == "agro-harvest"
    assert snapshot["surface_bindings"]["app_shell"]["foreground_color_token"] == "soil-950"
    assert snapshot["surface_bindings"]["queue_card"]["emphasis_color_token"] == "sun-500"
    assert audit.passed is True


def test_bundle_rejects_unknown_visual_token_reference():
    with pytest.raises(FrontendDesignTokenError, match="unknown emphasis color token"):
        FrontendDesignTokenBundle(
            visual_system=build_default_visual_language_system(),
            bindings=(
                SurfaceTokenBinding(
                    surface_name="bad",
                    typography_token="body-md",
                    foreground_color_token="soil-950",
                    background_color_token="grain-100",
                    spacing_token="space-4",
                    emphasis_color_token="ghost-500",
                ),
            ),
        )
