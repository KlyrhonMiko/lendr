from __future__ import annotations

from datetime import timedelta

import pytest
from jose import JWTError
from passlib.context import CryptContext
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from core.config import settings
from systems.admin.models.settings import AdminConfig
from systems.admin.models.user import User
from systems.auth.services.auth_service import AuthService
from systems.auth.services.rbac_service import RBACService, validate_role_policy_payload
from utils.security import (
    create_access_token,
    decode_access_token,
    needs_password_rehash,
    verify_and_update_password,
)

LEGACY_ARGON2_CONTEXT = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=1,
    argon2__memory_cost=8192,
    argon2__parallelism=1,
    argon2__hash_len=16,
    argon2__salt_size=16,
)


def _legacy_hash(password: str) -> str:
    return LEGACY_ARGON2_CONTEXT.hash(password)


@pytest.fixture
def security_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return engine


def test_verify_and_update_password_rehashes_legacy_argon2_hash() -> None:
    password = "VerySecurePassword123!"
    legacy_hash = _legacy_hash(password)

    verified, upgraded_hash = verify_and_update_password(password, legacy_hash)

    assert verified is True
    assert upgraded_hash is not None
    assert upgraded_hash != legacy_hash
    assert needs_password_rehash(upgraded_hash) is False


def test_access_token_claims_include_iat_and_nbf() -> None:
    token = create_access_token(
        data={"sub": "USER-TEST", "session_id": "USE-001"},
        expires_delta=timedelta(minutes=5),
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "USER-TEST"
    assert payload["session_id"] == "USE-001"
    assert "exp" in payload
    assert "iat" in payload
    assert "nbf" in payload


def test_access_token_optional_issuer_audience_enforced() -> None:
    original_issuer = settings.JWT_ISSUER
    original_audience = settings.JWT_AUDIENCE

    settings.JWT_ISSUER = "lendr-tests"
    settings.JWT_AUDIENCE = "lendr-clients"

    try:
        token = create_access_token(
            data={"sub": "USER-ISS", "session_id": "USE-ISS"},
            expires_delta=timedelta(minutes=5),
        )

        payload = decode_access_token(token)
        assert payload["iss"] == "lendr-tests"
        assert payload["aud"] == "lendr-clients"

        settings.JWT_AUDIENCE = "unexpected-audience"
        with pytest.raises(JWTError):
            decode_access_token(token)
    finally:
        settings.JWT_ISSUER = original_issuer
        settings.JWT_AUDIENCE = original_audience


def test_authenticate_user_rehashes_legacy_password_on_success(security_engine) -> None:
    username = "legacy-user"
    password = "LegacyPassword123!"

    with Session(security_engine) as session:
        user = User(
            user_id="USER-LEGACY",
            username=username,
            email="legacy@example.com",
            first_name="Legacy",
            last_name="User",
            hashed_password=_legacy_hash(password),
            role="inventory_manager",
        )
        session.add(user)
        session.commit()

        old_hash = user.hashed_password

        service = AuthService()
        authenticated = service.authenticate_user(session, username, password)

        assert authenticated is not None
        assert authenticated.hashed_password != old_hash
        assert needs_password_rehash(authenticated.hashed_password) is False

        session.commit()

    with Session(security_engine) as verify_session:
        persisted = verify_session.exec(
            select(User).where(User.user_id == "USER-LEGACY")
        ).first()
        assert persisted is not None
        assert persisted.hashed_password != old_hash


def test_validate_role_policy_payload_rejects_wildcard_for_non_admin() -> None:
    with pytest.raises(ValueError, match="wildcard permission is only allowed for admin role"):
        validate_role_policy_payload(
            "inventory_manager",
            {
                "systems": ["inventory"],
                "permissions": ["*"],
            },
        )


def test_validate_role_policy_payload_rejects_invalid_permission_format() -> None:
    with pytest.raises(ValueError, match="Expected format system:resource:action"):
        validate_role_policy_payload(
            "inventory_manager",
            {
                "systems": ["inventory"],
                "permissions": ["inventory-items-view"],
            },
        )


def test_validate_role_policy_payload_allows_admin_wildcards() -> None:
    policy = validate_role_policy_payload(
        "admin",
        {
            "systems": ["*"],
            "permissions": ["*"],
            "display_name": "Admin",
        },
    )

    assert policy["systems"] == ["*"]
    assert policy["permissions"] == ["*"]


def test_rbac_service_ignores_invalid_custom_policy(security_engine) -> None:
    with Session(security_engine) as session:
        session.add(
            AdminConfig(
                key="dispatch",
                category="rbac_roles",
                value='{"systems": ["inventory"], "permissions": ["inventory-items-view"]}',
                description="Dispatch",
            )
        )
        session.commit()

        service = RBACService()
        policy = service.get_role_policy(session, "dispatch")

        assert policy["permissions"] == ["auth:me"]
        assert policy["systems"] == []
