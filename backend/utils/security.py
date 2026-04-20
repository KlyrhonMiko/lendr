import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
import struct
from typing import Any
from urllib.parse import quote, urlencode

from cryptography.fernet import Fernet, InvalidToken
from jose import jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=settings.ARGON2_TIME_COST,
    argon2__memory_cost=settings.ARGON2_MEMORY_COST,
    argon2__parallelism=settings.ARGON2_PARALLELISM,
    argon2__hash_len=settings.ARGON2_HASH_LEN,
    argon2__salt_size=settings.ARGON2_SALT_SIZE,
)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_and_update_password(
    plain_password: str,
    hashed_password: str,
) -> tuple[bool, str | None]:
    return pwd_context.verify_and_update(plain_password, hashed_password)


def needs_password_rehash(hashed_password: str) -> bool:
    return pwd_context.needs_update(hashed_password)

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode = data.copy()
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "nbf": now,
        }
    )
    if settings.JWT_ISSUER:
        to_encode["iss"] = settings.JWT_ISSUER
    if settings.JWT_AUDIENCE:
        to_encode["aud"] = settings.JWT_AUDIENCE

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    decode_kwargs: dict[str, Any] = {
        "algorithms": [settings.ALGORITHM],
    }
    if settings.JWT_ISSUER:
        decode_kwargs["issuer"] = settings.JWT_ISSUER
    if settings.JWT_AUDIENCE:
        decode_kwargs["audience"] = settings.JWT_AUDIENCE

    return jwt.decode(token, settings.SECRET_KEY, **decode_kwargs)


def _build_fernet() -> Fernet:
    key_material = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key_material))


def encrypt_sensitive_value(plain_value: str) -> str:
    return _build_fernet().encrypt(plain_value.encode("utf-8")).decode("utf-8")


def decrypt_sensitive_value(encrypted_value: str) -> str:
    try:
        return _build_fernet().decrypt(encrypted_value.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError) as exc:
        raise ValueError("Unable to decrypt sensitive value") from exc


def generate_totp_secret(length: int = 20) -> str:
    random_bytes = secrets.token_bytes(max(length, 16))
    return base64.b32encode(random_bytes).decode("utf-8").rstrip("=")


def _normalize_totp_secret(secret: str) -> str:
    normalized = secret.strip().replace(" ", "").upper()
    padding = (-len(normalized)) % 8
    return normalized + ("=" * padding)


def generate_totp_code(secret: str, for_time: datetime | None = None, period: int = 30) -> str:
    normalized_secret = _normalize_totp_secret(secret)
    timestamp = for_time.timestamp() if for_time else datetime.now(timezone.utc).timestamp()
    counter = int(timestamp // period)

    key = base64.b32decode(normalized_secret, casefold=True)
    counter_bytes = counter.to_bytes(8, byteorder="big")
    digest = hmac.new(key, counter_bytes, hashlib.sha1).digest()

    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    otp = binary % 1_000_000
    return f"{otp:06d}"


def verify_totp_code(
    secret: str,
    code: str,
    *,
    window: int = 1,
    now: datetime | None = None,
) -> bool:
    normalized_code = "".join(char for char in code if char.isdigit())
    if len(normalized_code) != 6:
        return False

    current_time = now or datetime.now(timezone.utc)
    for step in range(-window, window + 1):
        candidate_time = current_time + timedelta(seconds=step * 30)
        candidate_code = generate_totp_code(secret, for_time=candidate_time)
        if hmac.compare_digest(candidate_code, normalized_code):
            return True

    return False


def build_totp_provisioning_uri(secret: str, account_name: str, issuer: str = "PowerGold") -> str:
    label = quote(f"{issuer}:{account_name}")
    query = urlencode(
        {
            "secret": secret,
            "issuer": issuer,
            "algorithm": "SHA1",
            "digits": "6",
            "period": "30",
        }
    )
    return f"otpauth://totp/{label}?{query}"
