import pytest

from agro_v2.architecture_adversarial_review_gate import (
    ArchitectureAdversarialReviewError,
    ArchitectureAdversarialReviewGate,
    ArchitectureReviewCheck,
    ArchitectureReviewRequest,
    DeploymentReview,
    ScaleReview,
    SecurityControlReview,
    ServiceBoundaryReview,
)


def build_boundary(boundary_id: str, **overrides) -> ServiceBoundaryReview:
    payload = {
        "boundary_id": boundary_id,
        "owner": f"{boundary_id}-owner",
        "dependency_ids": (),
        "trust_boundary": "internal",
        "public_entrypoint": False,
    }
    payload.update(overrides)
    return ServiceBoundaryReview(**payload)


def build_scale(boundary_id: str, **overrides) -> ScaleReview:
    payload = {
        "boundary_id": boundary_id,
        "peak_rps": 250,
        "headroom_ratio": 2.0,
        "backpressure_defined": True,
    }
    payload.update(overrides)
    return ScaleReview(**payload)


def build_security_controls(**overrides) -> tuple[SecurityControlReview, ...]:
    controls = {
        "auth_boundary": SecurityControlReview("auth_boundary", owner="platform", enforced=True),
        "data_isolation": SecurityControlReview("data_isolation", owner="platform", enforced=True),
        "audit_logging": SecurityControlReview("audit_logging", owner="platform", enforced=True),
        "secret_management": SecurityControlReview(
            "secret_management",
            owner="platform",
            enforced=True,
        ),
    }
    controls.update(overrides)
    return tuple(controls.values())


def build_deployments(**overrides) -> tuple[DeploymentReview, ...]:
    deployments = {
        "staging": DeploymentReview(
            environment="staging",
            target="railway-staging",
            regions=("us-east-1",),
            healthcheck_defined=True,
            rollback_defined=True,
        ),
        "production": DeploymentReview(
            environment="production",
            target="railway-production",
            regions=("us-east-1", "eu-west-1"),
            healthcheck_defined=True,
            rollback_defined=True,
        ),
    }
    deployments.update(overrides)
    return tuple(deployments.values())


def build_request(**overrides) -> ArchitectureReviewRequest:
    payload = {
        "review_id": "arch-gate-001",
        "expected_boundary_ids": ("api", "worker", "web"),
        "boundary_reviews": (
            build_boundary("api", dependency_ids=("worker",)),
            build_boundary("worker"),
            build_boundary("web", dependency_ids=("api",), public_entrypoint=True, trust_boundary="edge"),
        ),
        "scale_reviews": (
            build_scale("api"),
            build_scale("worker"),
            build_scale("web"),
        ),
        "security_controls": build_security_controls(),
        "deployment_reviews": build_deployments(),
        "required_requirement_ids": ("FR-001", "FR-110", "NFR-016"),
        "requirement_mapping": {
            "FR-001": ("api-boundary",),
            "FR-110": ("ux-gate",),
            "NFR-016": ("production-deployment",),
        },
    }
    payload.update(overrides)
    return ArchitectureReviewRequest(**payload)


def test_gate_passes_with_complete_architecture_review_package():
    outcome = ArchitectureAdversarialReviewGate().review(build_request())

    assert outcome.passed is True
    assert outcome.blocking_reason_codes == ()
    assert [item.check for item in outcome.checklist] == [
        ArchitectureReviewCheck.BOUNDARY_INTEGRITY,
        ArchitectureReviewCheck.SCALE_FEASIBILITY,
        ArchitectureReviewCheck.SECURITY_CONTROLS,
        ArchitectureReviewCheck.DEPLOYMENT_FEASIBILITY,
        ArchitectureReviewCheck.REQUIREMENT_MAPPING,
    ]


def test_gate_fails_when_boundary_review_is_missing_or_unresolved():
    outcome = ArchitectureAdversarialReviewGate().review(
        build_request(
            boundary_reviews=(
                build_boundary("api", dependency_ids=("ghost",)),
                build_boundary("worker"),
            )
        )
    )

    assert outcome.passed is False
    assert outcome.missing_boundary_ids == ("web",)
    assert outcome.unknown_dependency_ids == ("ghost",)
    assert "boundary_reviews_incomplete" in outcome.blocking_reason_codes


def test_gate_fails_when_scale_security_or_deployment_evidence_is_incomplete():
    outcome = ArchitectureAdversarialReviewGate().review(
        build_request(
            scale_reviews=(
                build_scale("api"),
                build_scale("worker", backpressure_defined=False),
                build_scale("web"),
            ),
            security_controls=build_security_controls(
                secret_management=SecurityControlReview(
                    "secret_management",
                    owner="platform",
                    enforced=False,
                )
            ),
            deployment_reviews=build_deployments(
                production=DeploymentReview(
                    environment="production",
                    target="railway-production",
                    regions=("us-east-1",),
                    healthcheck_defined=True,
                    rollback_defined=False,
                )
            ),
        )
    )

    assert outcome.passed is False
    assert "backpressure_not_defined" in outcome.blocking_reason_codes
    assert "security_controls_incomplete" in outcome.blocking_reason_codes
    assert "deployment_recovery_incomplete" in outcome.blocking_reason_codes


def test_gate_fails_when_requirement_mapping_is_missing():
    outcome = ArchitectureAdversarialReviewGate().review(
        build_request(requirement_mapping={"FR-001": ("api-boundary",)})
    )

    assert outcome.passed is False
    assert outcome.missing_requirement_ids == ("FR-110", "NFR-016")
    assert "requirement_mapping_incomplete" in outcome.blocking_reason_codes


def test_boundary_review_rejects_self_dependency():
    with pytest.raises(ArchitectureAdversarialReviewError, match="cannot depend on itself"):
        build_boundary("api", dependency_ids=("api",))
