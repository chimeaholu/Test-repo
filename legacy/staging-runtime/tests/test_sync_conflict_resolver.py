import pytest

from agro_v2.offline_action_queue import ConflictState, OfflineAction, OfflineActionStatus
from agro_v2.sync_conflict_resolver import (
    ClientAction,
    ConflictResolutionPolicy,
    SessionParityState,
    SyncConflictRequest,
    SyncConflictResolverError,
    SyncConflictResolverPolicy,
    SyncConflictType,
    UserResolutionState,
)
from agro_v2.verifier_loop import VerifierDecision


def build_action(**overrides) -> OfflineAction:
    payload = {
        "operation_id": "op-41-1",
        "operation_name": "market.offers.mutate",
        "payload": {"offer_id": "offer-41", "price_minor": 4200},
        "operation_token": "token-41-1",
        "profile_version": "2026-04-13",
        "enqueued_at": "2026-04-13T08:00:00Z",
        "status": OfflineActionStatus.CONFLICTED,
        "replay_attempt_count": 1,
        "last_error_code": "sync_conflict",
        "conflict_state": ConflictState.SERVER_PRECEDENCE,
        "conflict_reason": "server_version_newer",
    }
    payload.update(overrides)
    return OfflineAction(**payload)


def test_server_precedence_wins_version_conflict_and_marks_action_synced():
    resolver = SyncConflictResolverPolicy()

    resolution = resolver.resolve(
        SyncConflictRequest(
            action=build_action(),
            conflict_type=SyncConflictType.VERSION_MISMATCH,
            server_result_ref="offer:server-41",
        )
    )
    updated = resolution.apply(build_action())

    assert resolution.resolution_policy == ConflictResolutionPolicy.SERVER_PRECEDENCE
    assert resolution.user_state == UserResolutionState.SERVER_VERSION_APPLIED
    assert resolution.client_action == ClientAction.NONE
    assert resolution.requires_user_action is False
    assert updated.status == OfflineActionStatus.SYNCED
    assert updated.result_ref == "offer:server-41"
    assert updated.conflict_state == ConflictState.NONE


def test_session_revocation_takes_precedence_over_server_acknowledgement():
    resolver = SyncConflictResolverPolicy()

    resolution = resolver.resolve(
        SyncConflictRequest(
            action=build_action(),
            conflict_type=SyncConflictType.DUPLICATE_COMMIT,
            session_parity=SessionParityState.REVOKED,
            server_result_ref="offer:server-41",
        )
    )

    assert resolution.resolution_policy == ConflictResolutionPolicy.REAUTHENTICATE
    assert resolution.user_state == UserResolutionState.REAUTH_REQUIRED
    assert resolution.client_action == ClientAction.REAUTHENTICATE
    assert resolution.final_status == OfflineActionStatus.FAILED_TERMINAL
    assert resolution.final_conflict_state == ConflictState.CLIENT_RETRY_REQUIRED


def test_session_refresh_requirement_preserves_retry_path_for_reconnect_parity():
    resolver = SyncConflictResolverPolicy()

    resolution = resolver.resolve(
        SyncConflictRequest(
            action=build_action(conflict_state=ConflictState.CLIENT_RETRY_REQUIRED),
            conflict_type=SyncConflictType.SESSION_REFRESH_REQUIRED,
            session_parity=SessionParityState.REFRESH_REQUIRED,
            reason_code="refresh_access_token",
        )
    )

    assert resolution.resolution_policy == ConflictResolutionPolicy.SESSION_REFRESH
    assert resolution.user_state == UserResolutionState.SESSION_REFRESH_REQUIRED
    assert resolution.client_action == ClientAction.REFRESH_SESSION
    assert resolution.final_status == OfflineActionStatus.FAILED_RETRYABLE
    assert resolution.audit_record.reason_code == "refresh_access_token"


def test_policy_block_forces_manual_review_even_with_retryable_conflict_state():
    resolver = SyncConflictResolverPolicy()

    resolution = resolver.resolve(
        SyncConflictRequest(
            action=build_action(conflict_state=ConflictState.CLIENT_RETRY_REQUIRED),
            conflict_type=SyncConflictType.POLICY_CHALLENGE,
            verifier_decision=VerifierDecision.BLOCK,
        )
    )

    assert resolution.resolution_policy == ConflictResolutionPolicy.MANUAL_REVIEW
    assert resolution.user_state == UserResolutionState.MANUAL_REVIEW_REQUIRED
    assert resolution.client_action == ClientAction.CONTACT_SUPPORT
    assert resolution.final_status == OfflineActionStatus.FAILED_TERMINAL
    assert resolution.audit_record.final_status == OfflineActionStatus.FAILED_TERMINAL


def test_retry_resolution_persists_conflict_and_resolution_metadata():
    resolver = SyncConflictResolverPolicy()

    resolution = resolver.resolve(
        SyncConflictRequest(
            action=build_action(
                conflict_state=ConflictState.CLIENT_RETRY_REQUIRED,
                conflict_reason="client_snapshot_stale",
            ),
            conflict_type=SyncConflictType.VERSION_MISMATCH,
            session_parity=SessionParityState.HEALTHY,
            verifier_decision=VerifierDecision.REVISE,
            reason_code="client_snapshot_stale",
        )
    )

    assert resolution.resolution_policy == ConflictResolutionPolicy.CLIENT_RETRY
    assert resolution.user_state == UserResolutionState.RETRY_READY
    assert resolution.audit_record.conflict_type == SyncConflictType.VERSION_MISMATCH
    assert resolution.audit_record.reason_code == "client_snapshot_stale"
    assert resolution.audit_record.final_conflict_state == ConflictState.CLIENT_RETRY_REQUIRED


def test_resolver_rejects_non_conflicted_actions():
    resolver = SyncConflictResolverPolicy()

    with pytest.raises(SyncConflictResolverError, match="conflicted status"):
        resolver.resolve(
            SyncConflictRequest(
                action=build_action(status=OfflineActionStatus.SYNCED, conflict_state=ConflictState.NONE),
                conflict_type=SyncConflictType.DUPLICATE_COMMIT,
                server_result_ref="offer:server-41",
            )
        )


def test_server_precedence_requires_server_reference():
    resolver = SyncConflictResolverPolicy()

    with pytest.raises(SyncConflictResolverError, match="server_result_ref is required"):
        resolver.resolve(
            SyncConflictRequest(
                action=build_action(),
                conflict_type=SyncConflictType.VERSION_MISMATCH,
            )
        )
