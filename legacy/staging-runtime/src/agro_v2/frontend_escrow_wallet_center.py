"""F-010 escrow timeline and wallet center surfaces."""

from __future__ import annotations

from dataclasses import dataclass

from .escrow import EscrowRecord, EscrowState


class FrontendEscrowWalletError(ValueError):
    """Raised when escrow timeline or wallet center outputs are incomplete."""


@dataclass(frozen=True)
class EscrowTimelineEntry:
    event_type: str
    label: str
    occurred_at: str


@dataclass(frozen=True)
class WalletActivityRow:
    wallet_id: str
    direction: str
    amount_label: str


@dataclass(frozen=True)
class EscrowWalletSurface:
    escrow_id: str
    status_label: str
    timeline: tuple[EscrowTimelineEntry, ...]
    wallet_rows: tuple[WalletActivityRow, ...]
    detail_route: str


@dataclass(frozen=True)
class EscrowWalletAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendEscrowWalletCenter:
    """Builds escrow state timelines and wallet activity summaries."""

    def build_surface(self, record: EscrowRecord) -> EscrowWalletSurface:
        timeline = tuple(
            EscrowTimelineEntry(
                event_type=event.event_type,
                label=event.event_type.replace("_", " ").title(),
                occurred_at=event.occurred_at,
            )
            for event in record.events
        )
        wallet_rows = (
            WalletActivityRow(
                wallet_id=record.buyer_wallet_id,
                direction="debit" if record.state != EscrowState.INITIATED else "pending",
                amount_label=_format_minor(record.amount_minor, record.currency),
            ),
            WalletActivityRow(
                wallet_id=record.escrow_wallet_id,
                direction="hold",
                amount_label=_format_minor(record.amount_minor, record.currency),
            ),
            WalletActivityRow(
                wallet_id=record.seller_wallet_id,
                direction="credit" if record.state == EscrowState.RELEASED else "pending",
                amount_label=_format_minor(record.amount_minor, record.currency),
            ),
        )
        return EscrowWalletSurface(
            escrow_id=record.escrow_id,
            status_label=record.state.value.replace("_", " ").title(),
            timeline=timeline,
            wallet_rows=wallet_rows,
            detail_route=f"/app/wallet/escrow/{record.escrow_id}",
        )

    def audit(self, surface: EscrowWalletSurface) -> EscrowWalletAudit:
        issues: list[str] = []
        if len(surface.timeline) < 2:
            issues.append("timeline_too_short")
        if len(surface.wallet_rows) != 3:
            issues.append("wallet_rows_incomplete")
        return EscrowWalletAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C04",
            ux_data_check_id="F-010",
        )


def _format_minor(amount_minor: int, currency: str) -> str:
    return f"{currency} {amount_minor / 100:.2f}"
