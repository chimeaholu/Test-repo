"""B-041 sync conflict resolver policy for Android replay parity."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum

from .offline_action_queue import ConflictState, OfflineAction, OfflineActionStatus
from .verifier_loop import VerifierDecision


class SyncConflictResolverError(ValueError):
    """Raised when a conflict resolution request is invalid."""


class SyncConflictType(str, Enum):
    VERSION_MISMATCH = "version_mismatch"
    DUPLICATE_COMMIT = "duplicate_commit"
    SESSION_REFRESH_REQUIRED = "session_refresh_required"
    SESSION_REVOKED = "session_revoked"
    DEVICE_BINDING_CHANGED = "device_binding_changed"
    POLICY_CHALLENGE = "policy_challenge"


class SessionParityState(str, Enum):
    HEALTHY = "healthy"
    REFRESH_REQUIRED = "refresh_required"
    REVOKED = "revoked"
    DEVICE_REBIND_REQUIRED = "device_rebind_required"


class ConflictResolutionPolicy(str, Enum):
    SERVER_PRECEDENCE = "server_precedence"
    CLIENT_RETRY = "client_retry"
    SESSION_REFRESH = "session_refresh"
    REAUTHENTICATE = "reauthenticate"
    MANUAL_REVIEW = "manual_review"


class UserResolutionState(str, Enum):
    SERVER_VERSION_APPLIED = "server_version_applied"
    RETRY_READY = "retry_ready"
    SESSION_REFRESH_REQUIRED = "session_refresh_required"
    REAUTH_REQUIRED = "reauth_required"
    MANUAL_REVIEW_REQUIRED = "manual_review_required"


class ClientAction(str, Enum):
    NONE = "none"
    RETRY_SYNC = "retry_sync"
    REFRESH_SESSION = "refresh_session"
    REAUTHENTICATE = "reauthenticate"
    CONTACT_SUPPORT = "contact_support"


@dataclass(frozen=True)
class SyncConflictRequest:
    action: OfflineAction
    conflict_type: SyncConflictType
    session_parity: SessionParityState = SessionParityState.HEALTHY
    verifier_decision: VerifierDecision = VerifierDecision.APPROVE
    server_result_ref: str | None = None
    reason_code: str | None = None
    pwa_session_id: str | None = None
    android_session_id: str | None = None


@dataclass(frozen=True)
class ConflictAuditRecord:
    operation_id: str
    conflict_type: SyncConflictType
    resolution_policy: ConflictResolutionPolicy
    user_state: UserResolutionState
    final_status: OfflineActionStatus
    final_conflict_state: ConflictState
    session_parity: SessionParityState
    client_action: ClientAction
    reason_code: str
    result_ref: str | None


@dataclass(frozen=True)
class SyncConflictResolution:
    operation_id: str
    resolution_policy: ConflictResolutionPolicy
    user_state: UserResolutionState
    client_action: ClientAction
    final_status: OfflineActionStatus
    final_conflict_state: ConflictState
    requires_user_action: bool
    result_ref: str | None
    reason_code: str
    audit_record: ConflictAuditRecord

    def apply(self, action: OfflineAction) -> OfflineAction:
        """Project the resolution onto the conflicted queue action."""
        return replace(
            action,
            status=self.final_status,
            result_ref=self.result_ref,
            conflict_state=self.final_conflict_state,
            conflict_reason=self.reason_code,
            last_error_code=None if self.final_status == OfflineActionStatus.SYNCED else action.last_error_code,
        )


class SyncConflictResolverPolicy:
    """Applies deterministic precedence for conflicted Android replay actions."""

    def resolve(self, request: SyncConflictRequest) -> SyncConflictResolution:
        action = request.action
        self._validate_request(request)

        reason_code = request.reason_code or request.conflict_type.value
        policy = ConflictResolutionPolicy.CLIENT_RETRY
        user_state = UserResolutionState.RETRY_READY
        client_action = ClientAction.RETRY_SYNC
        final_status = OfflineActionStatus.FAILED_RETRYABLE
        final_conflict_state = ConflictState.CLIENT_RETRY_REQUIRED
        requires_user_action = True
        result_ref = None

        if request.session_parity in {
            SessionParityState.REVOKED,
            SessionParityState.DEVICE_REBIND_REQUIRED,
        } or request.conflict_type in {
            SyncConflictType.SESSION_REVOKED,
            SyncConflictType.DEVICE_BINDING_CHANGED,
        }:
            policy = ConflictResolutionPolicy.REAUTHENTICATE
            user_state = UserResolutionState.REAUTH_REQUIRED
            client_action = ClientAction.REAUTHENTICATE
            final_status = OfflineActionStatus.FAILED_TERMINAL
            final_conflict_state = ConflictState.CLIENT_RETRY_REQUIRED
        elif request.session_parity == SessionParityState.REFRESH_REQUIRED or (
            request.conflict_type == SyncConflictType.SESSION_REFRESH_REQUIRED
        ):
            policy = ConflictResolutionPolicy.SESSION_REFRESH
            user_state = UserResolutionState.SESSION_REFRESH_REQUIRED
            client_action = ClientAction.REFRESH_SESSION
            final_status = OfflineActionStatus.FAILED_RETRYABLE
            final_conflict_state = ConflictState.CLIENT_RETRY_REQUIRED
        elif request.verifier_decision == VerifierDecision.BLOCK or (
            request.conflict_type == SyncConflictType.POLICY_CHALLENGE
        ):
            policy = ConflictResolutionPolicy.MANUAL_REVIEW
            user_state = UserResolutionState.MANUAL_REVIEW_REQUIRED
            client_action = ClientAction.CONTACT_SUPPORT
            final_status = OfflineActionStatus.FAILED_TERMINAL
            final_conflict_state = ConflictState.SERVER_PRECEDENCE
        elif request.conflict_type in {
            SyncConflictType.VERSION_MISMATCH,
            SyncConflictType.DUPLICATE_COMMIT,
        } and (
            action.conflict_state == ConflictState.SERVER_PRECEDENCE
            or request.conflict_type == SyncConflictType.DUPLICATE_COMMIT
        ):
            policy = ConflictResolutionPolicy.SERVER_PRECEDENCE
            user_state = UserResolutionState.SERVER_VERSION_APPLIED
            client_action = ClientAction.NONE
            final_status = OfflineActionStatus.SYNCED
            final_conflict_state = ConflictState.NONE
            requires_user_action = False
            result_ref = request.server_result_ref or action.result_ref

        audit_record = ConflictAuditRecord(
            operation_id=action.operation_id,
            conflict_type=request.conflict_type,
            resolution_policy=policy,
            user_state=user_state,
            final_status=final_status,
            final_conflict_state=final_conflict_state,
            session_parity=request.session_parity,
            client_action=client_action,
            reason_code=reason_code,
            result_ref=result_ref,
        )
        return SyncConflictResolution(
            operation_id=action.operation_id,
            resolution_policy=policy,
            user_state=user_state,
            client_action=client_action,
            final_status=final_status,
            final_conflict_state=final_conflict_state,
            requires_user_action=requires_user_action,
            result_ref=result_ref,
            reason_code=reason_code,
            audit_record=audit_record,
        )

    @staticmethod
    def _validate_request(request: SyncConflictRequest) -> None:
        if request.action.status != OfflineActionStatus.CONFLICTED:
            raise SyncConflictResolverError("action must be in conflicted status")
        if (
            request.conflict_type in {SyncConflictType.VERSION_MISMATCH, SyncConflictType.DUPLICATE_COMMIT}
            and not request.server_result_ref
            and request.action.conflict_state == ConflictState.SERVER_PRECEDENCE
        ):
            raise SyncConflictResolverError(
                "server_result_ref is required for server-precedence conflict resolution"
            )
