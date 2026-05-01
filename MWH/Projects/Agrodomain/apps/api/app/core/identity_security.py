from __future__ import annotations

from datetime import UTC, datetime
from hashlib import pbkdf2_hmac, sha256
from hmac import compare_digest
from secrets import token_hex


def utcnow() -> datetime:
    return datetime.now(tz=UTC)


def ensure_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def issue_access_token() -> str:
    return token_hex(32)


def issue_verification_code() -> str:
    return f"{int(token_hex(3), 16) % 1_000_000:06d}"


def hash_access_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def hash_verification_code(code: str) -> str:
    return sha256(code.encode("utf-8")).hexdigest()


def build_password_hash(password: str, *, iterations: int) -> str:
    salt = token_hex(16)
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password_hash(password: str, password_hash: str) -> bool:
    algorithm, iterations_raw, salt, digest = password_hash.split("$", 3)
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations_raw),
    ).hex()
    return compare_digest(candidate, digest)


def verify_code(code: str, expected_hash: str) -> bool:
    return compare_digest(hash_verification_code(code), expected_hash)
