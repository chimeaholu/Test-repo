import pytest

from agro_v2.ledger import (
    LedgerEntry,
    WalletLedgerService,
    assert_ledger_invariants,
    validate_ledger_invariants,
)


def test_ledger_invariants_valid_sequence():
    entries = [
        LedgerEntry(
            entry_id="e1",
            account_id="wallet-001",
            currency="GHS",
            amount_minor=1500,
            entry_type="credit",
        ),
        LedgerEntry(
            entry_id="e2",
            account_id="wallet-001",
            currency="GHS",
            amount_minor=400,
            entry_type="debit",
        ),
    ]

    assert validate_ledger_invariants(entries) == []
    assert_ledger_invariants(entries)


def test_ledger_invariants_reject_duplicate_entry_id():
    entries = [
        LedgerEntry("dup-1", "wallet-001", "GHS", 100, "credit"),
        LedgerEntry("dup-1", "wallet-001", "GHS", 20, "debit"),
    ]

    violations = validate_ledger_invariants(entries)
    assert any("duplicate entry_id" in msg for msg in violations)


def test_ledger_invariants_reject_negative_balance():
    entries = [
        LedgerEntry("e1", "wallet-002", "NGN", 1000, "debit"),
    ]

    with pytest.raises(ValueError, match="balance cannot go negative"):
        assert_ledger_invariants(entries)


def test_ledger_invariants_reject_invalid_entry_type():
    entries = [
        LedgerEntry("e1", "wallet-003", "JMD", 100, "hold"),
    ]

    violations = validate_ledger_invariants(entries)
    assert any("entry_type must be debit or credit" in msg for msg in violations)


def test_ledger_invariants_reject_invalid_currency_and_amount():
    entries = [
        LedgerEntry("e1", "wallet-004", "gh", 0, "credit"),
    ]

    violations = validate_ledger_invariants(entries)
    assert any("currency must be a 3-letter uppercase code" in msg for msg in violations)
    assert any("amount_minor must be a positive integer" in msg for msg in violations)


def test_wallet_ledger_service_appends_entries_and_reports_balance():
    service = WalletLedgerService()

    service.append(LedgerEntry("e1", "wallet-005", "KES", 2500, "credit"))
    service.append(LedgerEntry("e2", "wallet-005", "KES", 400, "debit"))
    service.append(LedgerEntry("e3", "wallet-005", "USD", 100, "credit"))

    assert service.balance("wallet-005", "KES") == 2100
    assert service.balance("wallet-005", "USD") == 100
    assert len(service.entries) == 3


def test_wallet_ledger_service_rejects_invalid_append_without_mutation():
    service = WalletLedgerService(
        [LedgerEntry("e1", "wallet-006", "GHS", 1000, "credit")]
    )

    with pytest.raises(ValueError, match="duplicate entry_id"):
        service.append(LedgerEntry("e1", "wallet-006", "GHS", 100, "credit"))

    assert service.balance("wallet-006", "GHS") == 1000
    assert len(service.entries) == 1
