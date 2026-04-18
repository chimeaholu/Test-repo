"""B-004 USSD adapter contract and session handling."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, replace
from enum import Enum

from .state_store import CanonicalStateStore, WorkflowCommand


class UssdAdapterError(ValueError):
    """Raised when USSD menu/session inputs violate the contract."""


class UssdSessionStatus(str, Enum):
    ACTIVE = "active"
    TIMED_OUT = "timed_out"
    RECOVERED = "recovered"
    CLOSED = "closed"


@dataclass(frozen=True)
class UssdMenuOption:
    digit: str
    label: str
    next_menu_id: str
    event_type: str | None = None
    state_delta: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.digit.strip():
            raise UssdAdapterError("digit is required")
        if len(self.digit) > 1:
            raise UssdAdapterError("digit must be compact")
        if not self.label.strip():
            raise UssdAdapterError("label is required")
        if not self.next_menu_id.strip():
            raise UssdAdapterError("next_menu_id is required")


@dataclass(frozen=True)
class UssdMenu:
    menu_id: str
    prompt: str
    options: tuple[UssdMenuOption, ...]
    terminal: bool = False

    def __post_init__(self) -> None:
        if not self.menu_id.strip():
            raise UssdAdapterError("menu_id is required")
        if not self.prompt.strip():
            raise UssdAdapterError("prompt is required")
        digits = [option.digit for option in self.options]
        if len(digits) != len(set(digits)):
            raise UssdAdapterError("menu option digits must be unique")


@dataclass(frozen=True)
class UssdSession:
    session_id: str
    workflow_id: str
    phone_number: str
    country_code: str
    current_menu_id: str
    revision: int
    started_at_epoch_ms: int
    last_seen_epoch_ms: int
    expires_at_epoch_ms: int
    status: UssdSessionStatus = UssdSessionStatus.ACTIVE
    last_input: str | None = None
    last_event_type: str | None = None
    resume_menu_id: str | None = None
    locale: str = "en"

    def __post_init__(self) -> None:
        if not self.session_id.strip():
            raise UssdAdapterError("session_id is required")
        if not self.workflow_id.strip():
            raise UssdAdapterError("workflow_id is required")
        if not self.phone_number.strip():
            raise UssdAdapterError("phone_number is required")
        if not self.country_code.strip():
            raise UssdAdapterError("country_code is required")
        if not self.current_menu_id.strip():
            raise UssdAdapterError("current_menu_id is required")
        if self.revision < 0:
            raise UssdAdapterError("revision must be >= 0")


@dataclass(frozen=True)
class UssdResponse:
    session: UssdSession
    screen_text: str
    end_session: bool
    recovery_required: bool
    transition_applied: bool
    serialized_session: str
    journey_id: str
    data_check_id: str


class UssdAdapterContract:
    """Maintains compact menu flows, serialization, and timeout recovery."""

    def __init__(
        self,
        *,
        state_store: CanonicalStateStore,
        menus: tuple[UssdMenu, ...],
        session_timeout_ms: int = 90_000,
    ) -> None:
        if session_timeout_ms <= 0:
            raise UssdAdapterError("session_timeout_ms must be > 0")
        if not menus:
            raise UssdAdapterError("menus must not be empty")
        self._state_store = state_store
        self._menus = {menu.menu_id: menu for menu in menus}
        self._timeout_ms = session_timeout_ms
        self._validate_menus()

    def start_session(
        self,
        *,
        session_id: str,
        workflow_id: str,
        phone_number: str,
        country_code: str,
        now_epoch_ms: int,
        locale: str = "en",
    ) -> UssdResponse:
        session = UssdSession(
            session_id=session_id,
            workflow_id=workflow_id,
            phone_number=phone_number,
            country_code=country_code,
            current_menu_id="root",
            revision=0,
            started_at_epoch_ms=now_epoch_ms,
            last_seen_epoch_ms=now_epoch_ms,
            expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
            locale=locale,
        )
        return self._render_response(
            session=session,
            end_session=False,
            recovery_required=False,
            transition_applied=False,
            journey_id="CJ-001",
        )

    def serialize_session(self, session: UssdSession) -> str:
        return json.dumps(
            {
                "country_code": session.country_code,
                "current_menu_id": session.current_menu_id,
                "expires_at_epoch_ms": session.expires_at_epoch_ms,
                "last_event_type": session.last_event_type,
                "last_input": session.last_input,
                "last_seen_epoch_ms": session.last_seen_epoch_ms,
                "locale": session.locale,
                "phone_number": session.phone_number,
                "resume_menu_id": session.resume_menu_id,
                "revision": session.revision,
                "session_id": session.session_id,
                "started_at_epoch_ms": session.started_at_epoch_ms,
                "status": session.status.value,
                "workflow_id": session.workflow_id,
            },
            sort_keys=True,
            separators=(",", ":"),
        )

    def deserialize_session(self, payload: str) -> UssdSession:
        try:
            raw = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise UssdAdapterError("session payload must be valid JSON") from exc
        return UssdSession(
            session_id=raw["session_id"],
            workflow_id=raw["workflow_id"],
            phone_number=raw["phone_number"],
            country_code=raw["country_code"],
            current_menu_id=raw["current_menu_id"],
            revision=raw["revision"],
            started_at_epoch_ms=raw["started_at_epoch_ms"],
            last_seen_epoch_ms=raw["last_seen_epoch_ms"],
            expires_at_epoch_ms=raw["expires_at_epoch_ms"],
            status=UssdSessionStatus(raw["status"]),
            last_input=raw.get("last_input"),
            last_event_type=raw.get("last_event_type"),
            resume_menu_id=raw.get("resume_menu_id"),
            locale=raw.get("locale", "en"),
        )

    def handle_input(
        self,
        *,
        session: UssdSession,
        input_text: str,
        now_epoch_ms: int,
    ) -> UssdResponse:
        digit = input_text.strip()
        if not digit:
            raise UssdAdapterError("input_text is required")

        if self._is_expired(session, now_epoch_ms) and session.status != UssdSessionStatus.TIMED_OUT:
            timed_out = replace(
                session,
                current_menu_id="timeout_recovery",
                status=UssdSessionStatus.TIMED_OUT,
                last_seen_epoch_ms=now_epoch_ms,
                expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
                last_input=digit,
                resume_menu_id=session.current_menu_id,
            )
            return self._render_response(
                session=timed_out,
                end_session=False,
                recovery_required=True,
                transition_applied=False,
                journey_id="EP-002",
            )

        if session.status == UssdSessionStatus.TIMED_OUT:
            return self._handle_timeout_recovery(session=session, digit=digit, now_epoch_ms=now_epoch_ms)

        menu = self._menu(session.current_menu_id)
        option = next((item for item in menu.options if item.digit == digit), None)
        if option is None:
            same_session = replace(
                session,
                last_seen_epoch_ms=now_epoch_ms,
                expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
                last_input=digit,
            )
            return UssdResponse(
                session=same_session,
                screen_text=f"Invalid choice.\n{self._render_menu(menu)}",
                end_session=False,
                recovery_required=False,
                transition_applied=False,
                serialized_session=self.serialize_session(same_session),
                journey_id="CJ-001",
                data_check_id="DI-001",
            )

        next_session = replace(
            session,
            current_menu_id=option.next_menu_id,
            revision=session.revision + 1,
            last_seen_epoch_ms=now_epoch_ms,
            expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
            last_input=digit,
            last_event_type=option.event_type,
            resume_menu_id=option.next_menu_id if option.next_menu_id != "timeout_recovery" else session.resume_menu_id,
            status=UssdSessionStatus.ACTIVE,
        )

        transition_applied = False
        end_session = False
        journey_id = "CJ-001"
        next_menu = self._menu(option.next_menu_id)
        if option.event_type is not None:
            transition_applied = True
            self._state_store.apply(
                WorkflowCommand(
                    workflow_id=session.workflow_id,
                    channel="ussd",
                    idempotency_key=f"{session.session_id}:{next_session.revision}",
                    event_type=option.event_type,
                    state_delta={
                        "ussd": {
                            "country_code": session.country_code,
                            "current_menu_id": option.next_menu_id,
                            "selected_digit": digit,
                        },
                        **option.state_delta,
                    },
                    metadata={"journey": "CJ-001", "data_check": "DI-001"},
                )
            )
        if next_menu.terminal:
            end_session = True
            journey_id = "EP-002"
            next_session = replace(next_session, status=UssdSessionStatus.CLOSED)

        return self._render_response(
            session=next_session,
            end_session=end_session,
            recovery_required=False,
            transition_applied=transition_applied,
            journey_id=journey_id,
        )

    def _handle_timeout_recovery(
        self,
        *,
        session: UssdSession,
        digit: str,
        now_epoch_ms: int,
    ) -> UssdResponse:
        if digit == "9" and session.resume_menu_id is not None:
            recovered = replace(
                session,
                current_menu_id=session.resume_menu_id,
                status=UssdSessionStatus.RECOVERED,
                revision=session.revision + 1,
                last_input=digit,
                last_seen_epoch_ms=now_epoch_ms,
                expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
            )
            menu = self._menu(recovered.current_menu_id)
            return UssdResponse(
                session=recovered,
                screen_text=f"Session resumed.\n{self._render_menu(menu)}",
                end_session=False,
                recovery_required=False,
                transition_applied=False,
                serialized_session=self.serialize_session(recovered),
                journey_id="EP-002",
                data_check_id="DI-001",
            )

        if digit == "0":
            restarted = replace(
                session,
                current_menu_id="root",
                status=UssdSessionStatus.RECOVERED,
                revision=session.revision + 1,
                last_input=digit,
                last_seen_epoch_ms=now_epoch_ms,
                expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
                resume_menu_id="root",
            )
            return self._render_response(
                session=restarted,
                end_session=False,
                recovery_required=False,
                transition_applied=False,
                journey_id="EP-002",
            )

        same_session = replace(
            session,
            last_input=digit,
            last_seen_epoch_ms=now_epoch_ms,
            expires_at_epoch_ms=now_epoch_ms + self._timeout_ms,
        )
        return UssdResponse(
            session=same_session,
            screen_text=f"Reply 9 to resume or 0 to restart.\n{self._render_menu(self._menu('timeout_recovery'))}",
            end_session=False,
            recovery_required=True,
            transition_applied=False,
            serialized_session=self.serialize_session(same_session),
            journey_id="EP-002",
            data_check_id="DI-001",
        )

    def _render_response(
        self,
        *,
        session: UssdSession,
        end_session: bool,
        recovery_required: bool,
        transition_applied: bool,
        journey_id: str,
    ) -> UssdResponse:
        menu = self._menu(session.current_menu_id)
        return UssdResponse(
            session=session,
            screen_text=self._render_menu(menu),
            end_session=end_session,
            recovery_required=recovery_required,
            transition_applied=transition_applied,
            serialized_session=self.serialize_session(session),
            journey_id=journey_id,
            data_check_id="DI-001",
        )

    def _render_menu(self, menu: UssdMenu) -> str:
        lines = [menu.prompt]
        for option in menu.options:
            lines.append(f"{option.digit}. {option.label}")
        return "\n".join(lines)

    def _menu(self, menu_id: str) -> UssdMenu:
        try:
            return self._menus[menu_id]
        except KeyError as exc:
            raise UssdAdapterError(f"unknown menu_id: {menu_id}") from exc

    def _validate_menus(self) -> None:
        if "root" not in self._menus:
            raise UssdAdapterError("menus must include root")
        if "timeout_recovery" not in self._menus:
            raise UssdAdapterError("menus must include timeout_recovery")
        for menu in self._menus.values():
            for option in menu.options:
                if option.next_menu_id not in self._menus:
                    raise UssdAdapterError(
                        f"menu option points to unknown menu_id: {option.next_menu_id}"
                    )

    @staticmethod
    def _is_expired(session: UssdSession, now_epoch_ms: int) -> bool:
        return now_epoch_ms > session.expires_at_epoch_ms


def build_default_ussd_adapter(*, state_store: CanonicalStateStore | None = None) -> UssdAdapterContract:
    return UssdAdapterContract(
        state_store=state_store or CanonicalStateStore(),
        menus=(
            UssdMenu(
                menu_id="root",
                prompt="Agrodomain\n1. Profile\n2. Marketplace\n3. Escrow",
                options=(
                    UssdMenuOption(
                        digit="1",
                        label="Profile",
                        next_menu_id="profile_capture",
                        event_type="identity.capture_requested",
                        state_delta={"profile": {"capture_requested": True}},
                    ),
                    UssdMenuOption(
                        digit="2",
                        label="Marketplace",
                        next_menu_id="marketplace",
                    ),
                    UssdMenuOption(
                        digit="3",
                        label="Escrow",
                        next_menu_id="escrow_status",
                        event_type="escrow.status_requested",
                        state_delta={"escrow": {"status_requested": True}},
                    ),
                ),
            ),
            UssdMenu(
                menu_id="marketplace",
                prompt="Marketplace\n1. Create listing\n2. My offers",
                options=(
                    UssdMenuOption(
                        digit="1",
                        label="Create listing",
                        next_menu_id="listing_terminal",
                        event_type="listing.create_requested",
                        state_delta={"listing": {"draft_requested": True}},
                    ),
                    UssdMenuOption(
                        digit="2",
                        label="My offers",
                        next_menu_id="offers_terminal",
                        event_type="offer.list_requested",
                        state_delta={"offers": {"list_requested": True}},
                    ),
                ),
            ),
            UssdMenu(
                menu_id="profile_capture",
                prompt="Profile capture queued. We will continue in session.",
                options=(),
                terminal=True,
            ),
            UssdMenu(
                menu_id="escrow_status",
                prompt="Escrow status queued. A summary will be returned next.",
                options=(),
                terminal=True,
            ),
            UssdMenu(
                menu_id="listing_terminal",
                prompt="Listing draft started. Follow the next prompts to finish.",
                options=(),
                terminal=True,
            ),
            UssdMenu(
                menu_id="offers_terminal",
                prompt="Offers summary requested. Response queued.",
                options=(),
                terminal=True,
            ),
            UssdMenu(
                menu_id="timeout_recovery",
                prompt="Session timed out\n9. Resume\n0. Restart",
                options=(
                    UssdMenuOption(digit="9", label="Resume", next_menu_id="marketplace"),
                    UssdMenuOption(digit="0", label="Restart", next_menu_id="root"),
                ),
            ),
        ),
    )
