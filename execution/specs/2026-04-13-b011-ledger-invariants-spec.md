# B-011 Wallet Ledger Service - Initial Invariants Spec

Date: 2026-04-13
Bead: B-011
Route: @builder

## Objective
Provide a minimal scaffold for immutable debit/credit ledger validation before escrow orchestration (`B-012`) depends on it.

## Ledger Entry Contract (v0)
Each entry must include:
- `entry_id` (unique, immutable identifier)
- `account_id` (wallet/account key)
- `currency` (3-letter uppercase code)
- `amount_minor` (integer in minor units, must be > 0)
- `entry_type` (`debit` or `credit`)

## Invariants Enforced in Validator (v0)
1. Entry identity is immutable in practice via unique `entry_id` (duplicate IDs rejected).
2. `amount_minor` is a positive integer.
3. `entry_type` is restricted to `debit` or `credit`.
4. `currency` format is uppercase 3-letter code.
5. Running balance per `(account_id, currency)` cannot become negative.

## Notes
- This scaffold intentionally avoids transfer pairing and cross-account balancing logic; those are expected in a subsequent iteration.
- Current ordering assumption: entries are validated in supplied sequence.

## Unit Test Obligations Covered
- Valid credit/debit progression passes.
- Duplicate entry IDs rejected.
- Negative-balance debit rejected.
- Invalid entry type rejected.
- Invalid currency and amount rejected.
