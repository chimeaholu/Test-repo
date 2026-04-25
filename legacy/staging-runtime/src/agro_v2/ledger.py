"""Wallet ledger invariant validation for Agrodomain v2 bead B-011."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class LedgerEntry:
    """Immutable debit/credit ledger entry."""

    entry_id: str
    account_id: str
    currency: str
    amount_minor: int
    entry_type: str  # "debit" or "credit"


def validate_ledger_invariants(entries: Iterable[LedgerEntry]) -> list[str]:
    """Return a list of invariant violations, or an empty list if valid."""
    errors: list[str] = []
    seen_ids: set[str] = set()
    balances: dict[tuple[str, str], int] = {}

    for idx, entry in enumerate(entries):
        location = f"entry[{idx}]"

        if entry.entry_id in seen_ids:
            errors.append(f"{location}: duplicate entry_id '{entry.entry_id}'")
        else:
            seen_ids.add(entry.entry_id)

        if isinstance(entry.amount_minor, bool) or not isinstance(entry.amount_minor, int):
            errors.append(f"{location}: amount_minor must be a positive integer")
            continue

        if entry.amount_minor <= 0:
            errors.append(f"{location}: amount_minor must be a positive integer")

        if entry.entry_type not in {"debit", "credit"}:
            errors.append(f"{location}: entry_type must be debit or credit")
            continue

        if (
            len(entry.currency) != 3
            or not entry.currency.isalpha()
            or entry.currency != entry.currency.upper()
        ):
            errors.append(f"{location}: currency must be a 3-letter uppercase code")

        key = (entry.account_id, entry.currency)
        running = balances.get(key, 0)
        if entry.entry_type == "credit":
            running += entry.amount_minor
        else:
            running -= entry.amount_minor

        if running < 0:
            errors.append(
                f"{location}: account '{entry.account_id}' balance cannot go negative"
            )

        balances[key] = running

    return errors


def assert_ledger_invariants(entries: Iterable[LedgerEntry]) -> None:
    """Raise ValueError when ledger invariants are violated."""
    violations = validate_ledger_invariants(entries)
    if violations:
        raise ValueError("Ledger invariant violation(s): " + "; ".join(violations))


class WalletLedgerService:
    """Minimal append-only in-memory wallet ledger scaffold for B-011."""

    def __init__(self, entries: Iterable[LedgerEntry] | None = None) -> None:
        initial_entries = tuple(entries or ())
        assert_ledger_invariants(list(initial_entries))
        self._entries = initial_entries

    @property
    def entries(self) -> tuple[LedgerEntry, ...]:
        return self._entries

    def append(self, entry: LedgerEntry) -> LedgerEntry:
        next_entries = [*self._entries, entry]
        assert_ledger_invariants(next_entries)
        self._entries = tuple(next_entries)
        return entry

    def balance(self, account_id: str, currency: str) -> int:
        running = 0
        for entry in self._entries:
            if entry.account_id != account_id or entry.currency != currency:
                continue
            if entry.entry_type == "credit":
                running += entry.amount_minor
            else:
                running -= entry.amount_minor
        return running
