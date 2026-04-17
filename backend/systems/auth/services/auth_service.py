import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlmodel import Session, select

from core.config import settings
from systems.admin.models.user import User
from systems.admin.services.audit_service import audit_service
from systems.admin.services.password_policy_service import PasswordPolicyService
from systems.admin.services.user_service import UserService
from systems.auth.models.auth_two_factor_challenge import AuthTwoFactorChallenge
from systems.auth.models.borrower_session import BorrowerSession
from systems.auth.services.configuration_service import AuthConfigService
from utils.id_generator import get_next_sequence
from utils.security import (
    build_totp_provisioning_uri,
    decrypt_sensitive_value,
    encrypt_sensitive_value,
    generate_totp_secret,
    get_password_hash,
    verify_and_update_password,
    verify_totp_code,
)
from systems.auth.models.user_session import UserSession
from systems.auth.models.user_two_factor_credential import UserTwoFactorCredential
from utils.time_utils import get_now_manila


SECURITY_SETTINGS_CATEGORY = "security_settings"
KEY_TWO_FACTOR_ENABLED = "two_factor_enabled"
KEY_TWO_FACTOR_METHOD = "two_factor_method"
KEY_TWO_FACTOR_ENFORCE_FOR_ROLES = "two_factor_enforce_for_roles"
KEY_TWO_FACTOR_ENFORCE_ON = "two_factor_enforce_on"
KEY_SESSION_INACTIVE_MINUTES = "session_inactive_minutes"
KEY_SESSION_WARNING_MINUTES = "session_warning_minutes"

TWO_FACTOR_METHOD_AUTHENTICATOR_APP = "authenticator_app"
TWO_FACTOR_CHALLENGE_TTL_MINUTES = 5
TWO_FACTOR_CHALLENGE_MAX_FAILURES = 5
DEFAULT_SESSION_WARNING_MINUTES = 5
SECONDARY_PASSWORD_TOKEN_BYTES = 24


class AuthService:
    _BORROWER_ROLES = {"borrower", "brwr"}

    def __init__(self):
        self.user_service = UserService()
        self.auth_config_service = AuthConfigService()
        self.password_policy_service = PasswordPolicyService()

    @staticmethod
    def _parse_bool(value: str | None, default: bool) -> bool:
        normalized = (value or "").strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
        return default

    @staticmethod
    def _parse_non_negative_int(value: str | None, default: int) -> int:
        try:
            parsed = int(str(value).strip())
        except (TypeError, ValueError):
            return default

        if parsed < 0:
            return default
        return parsed

    @staticmethod
    def _normalize_role(role: str | None) -> str:
        return (role or "").strip().lower()

    @staticmethod
    def _parse_json_role_list(value: str, default: list[str]) -> list[str]:
        try:
            parsed = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return default

        if not isinstance(parsed, list):
            return default

        normalized = [str(role).strip().lower() for role in parsed if str(role).strip()]
        return list(dict.fromkeys(normalized)) or default

    def _load_two_factor_policy(self, session: Session) -> dict[str, Any]:
        default_roles = ["admin", "manager", "staff"]
        enabled = self._parse_bool(
            self.auth_config_service.get_value(
                session,
                KEY_TWO_FACTOR_ENABLED,
                "true",
                category=SECURITY_SETTINGS_CATEGORY,
            ),
            True,
        )
        method = self.auth_config_service.get_value(
            session,
            KEY_TWO_FACTOR_METHOD,
            TWO_FACTOR_METHOD_AUTHENTICATOR_APP,
            category=SECURITY_SETTINGS_CATEGORY,
        )
        enforce_roles = self._parse_json_role_list(
            self.auth_config_service.get_value(
                session,
                KEY_TWO_FACTOR_ENFORCE_FOR_ROLES,
                json.dumps(default_roles),
                category=SECURITY_SETTINGS_CATEGORY,
            ),
            default_roles,
        )
        enforce_on = self.auth_config_service.get_value(
            session,
            KEY_TWO_FACTOR_ENFORCE_ON,
            "next_login",
            category=SECURITY_SETTINGS_CATEGORY,
        )

        return {
            "enabled": enabled,
            "method": method,
            "enforce_roles": enforce_roles,
            "enforce_on": enforce_on,
        }

    def _log_two_factor_event(
        self,
        session: Session,
        *,
        action: str,
        entity_id: str,
        actor_id: UUID | None,
        reason_code: str | None = None,
        after: dict[str, Any] | None = None,
    ) -> None:
        audit_service.log_action(
            db=session,
            entity_type="auth_2fa",
            entity_id=entity_id,
            action=action,
            reason_code=reason_code,
            actor_id=actor_id,
            after=after,
        )

    def is_two_factor_required_for_user(self, session: Session, user: User) -> bool:
        policy = self._load_two_factor_policy(session)
        if not policy["enabled"]:
            return False

        if str(policy["method"]).strip().lower() != TWO_FACTOR_METHOD_AUTHENTICATOR_APP:
            return False

        if str(policy["enforce_on"]).strip().lower() != "next_login":
            return False

        return self._normalize_role(user.role) in set(policy["enforce_roles"])

    def get_two_factor_credential(
        self,
        session: Session,
        user_uuid: UUID,
    ) -> UserTwoFactorCredential | None:
        return session.exec(
            select(UserTwoFactorCredential).where(
                UserTwoFactorCredential.user_uuid == user_uuid,
                UserTwoFactorCredential.is_deleted.is_(False),
            )
        ).first()

    def has_active_two_factor_enrollment(self, session: Session, user_uuid: UUID) -> bool:
        credential = self.get_two_factor_credential(session, user_uuid)
        if not credential:
            return False

        return bool(
            credential.is_enabled
            and credential.secret_encrypted
            and credential.method == TWO_FACTOR_METHOD_AUTHENTICATOR_APP
        )

    def get_two_factor_status(self, session: Session, user_uuid: UUID) -> tuple[bool, datetime | None]:
        credential = self.get_two_factor_credential(session, user_uuid)
        if not credential:
            return False, None
        return credential.is_enabled, credential.enrolled_at

    def begin_two_factor_enrollment(self, session: Session, user: User) -> dict[str, str]:
        credential = self.get_two_factor_credential(session, user.id)
        if credential and credential.is_enabled and credential.secret_encrypted:
            raise ValueError("Two-factor authentication is already enabled for this account")

        secret = generate_totp_secret()
        encrypted_secret = encrypt_sensitive_value(secret)
        now = get_now_manila()

        if credential:
            credential.method = TWO_FACTOR_METHOD_AUTHENTICATOR_APP
            credential.pending_secret_encrypted = encrypted_secret
            credential.updated_at = now
            session.add(credential)
        else:
            credential = UserTwoFactorCredential(
                user_uuid=user.id,
                method=TWO_FACTOR_METHOD_AUTHENTICATOR_APP,
                pending_secret_encrypted=encrypted_secret,
            )
            session.add(credential)

        session.flush()

        account_name = user.email or user.username or user.user_id
        self._log_two_factor_event(
            session,
            action="two_factor_enroll_initiated",
            entity_id=user.user_id,
            actor_id=user.id,
            after={"method": TWO_FACTOR_METHOD_AUTHENTICATOR_APP},
        )

        return {
            "method": TWO_FACTOR_METHOD_AUTHENTICATOR_APP,
            "secret": secret,
            "provisioning_uri": build_totp_provisioning_uri(secret, account_name=account_name),
        }

    def verify_two_factor_enrollment(self, session: Session, user: User, code: str) -> tuple[bool, datetime | None]:
        credential = self.get_two_factor_credential(session, user.id)
        if not credential or not credential.pending_secret_encrypted:
            raise ValueError("No pending two-factor enrollment found")

        pending_secret = decrypt_sensitive_value(credential.pending_secret_encrypted)
        if not verify_totp_code(pending_secret, code):
            self._log_two_factor_event(
                session,
                action="two_factor_enroll_verify_failed",
                entity_id=user.user_id,
                actor_id=user.id,
                reason_code="invalid_totp_code",
            )
            return False, credential.enrolled_at

        now = get_now_manila()
        credential.secret_encrypted = credential.pending_secret_encrypted
        credential.pending_secret_encrypted = None
        credential.is_enabled = True
        credential.enrolled_at = now
        credential.last_verified_at = now
        credential.updated_at = now
        session.add(credential)
        session.flush()

        self._log_two_factor_event(
            session,
            action="two_factor_enroll_verified",
            entity_id=user.user_id,
            actor_id=user.id,
            after={"method": credential.method},
        )
        return True, credential.enrolled_at

    def disable_two_factor_enrollment(self, session: Session, user: User, code: str) -> tuple[bool, datetime | None]:
        credential = self.get_two_factor_credential(session, user.id)
        if not credential or not credential.is_enabled or not credential.secret_encrypted:
            raise ValueError("Two-factor authentication is not enabled")

        secret = decrypt_sensitive_value(credential.secret_encrypted)
        if not verify_totp_code(secret, code):
            self._log_two_factor_event(
                session,
                action="two_factor_disable_failed",
                entity_id=user.user_id,
                actor_id=user.id,
                reason_code="invalid_totp_code",
            )
            return False, credential.enrolled_at

        now = get_now_manila()
        credential.secret_encrypted = None
        credential.pending_secret_encrypted = None
        credential.is_enabled = False
        credential.enrolled_at = None
        credential.last_verified_at = now
        credential.updated_at = now
        session.add(credential)
        session.flush()

        self._log_two_factor_event(
            session,
            action="two_factor_disabled",
            entity_id=user.user_id,
            actor_id=user.id,
        )
        return True, credential.enrolled_at

    def reset_two_factor_enrollment_for_user(
        self,
        session: Session,
        target_user: User,
        actor_id: UUID | None = None,
    ) -> bool:
        credential = self.get_two_factor_credential(session, target_user.id)
        credential_existed = credential is not None

        if credential:
            now = get_now_manila()
            credential.secret_encrypted = None
            credential.pending_secret_encrypted = None
            credential.is_enabled = False
            credential.enrolled_at = None
            credential.last_verified_at = now
            credential.updated_at = now
            session.add(credential)
            session.flush()

        self._log_two_factor_event(
            session,
            action="two_factor_admin_reset",
            entity_id=target_user.user_id,
            actor_id=actor_id,
            after={
                "target_user_id": target_user.user_id,
                "target_user_uuid": str(target_user.id),
                "target_username": target_user.username,
                "target_email": target_user.email,
                "method": TWO_FACTOR_METHOD_AUTHENTICATOR_APP,
                "enabled": False,
                "credential_existed": credential_existed,
                "reset_applied": credential_existed,
            },
        )

        return credential_existed

    def create_two_factor_login_challenge(
        self,
        session: Session,
        user: User,
        device_id: str | None,
        used_secondary_password: bool = False,
    ) -> AuthTwoFactorChallenge:
        expires_at = get_now_manila() + timedelta(minutes=TWO_FACTOR_CHALLENGE_TTL_MINUTES)
        challenge = AuthTwoFactorChallenge(
            challenge_id=secrets.token_urlsafe(32),
            user_uuid=user.id,
            device_id=device_id,
            expires_at=expires_at,
            used_secondary_password=used_secondary_password,
        )
        session.add(challenge)
        session.flush()

        self._log_two_factor_event(
            session,
            action="two_factor_challenge_issued",
            entity_id=challenge.challenge_id,
            actor_id=user.id,
            after={"user_id": user.user_id},
        )

        return challenge

    def rotate_secondary_credential_after_login(
        self,
        session: Session,
        user: User,
        *,
        reason_code: str,
    ) -> None:
        now = get_now_manila()
        user.recovery_credential_encrypted = encrypt_sensitive_value(
            secrets.token_urlsafe(SECONDARY_PASSWORD_TOKEN_BYTES)
        )
        user.recovery_credential_rotated_at = now
        user.updated_at = now
        session.add(user)
        session.flush()

        audit_service.log_action(
            db=session,
            entity_type="user",
            entity_id=user.user_id,
            action="secondary_credential_rotated_on_login",
            actor_id=user.id,
            reason_code=reason_code,
        )

    def _get_active_two_factor_secret(self, session: Session, user_uuid: UUID) -> str | None:
        credential = self.get_two_factor_credential(session, user_uuid)
        if not credential or not credential.is_enabled or not credential.secret_encrypted:
            return None
        return decrypt_sensitive_value(credential.secret_encrypted)

    def verify_two_factor_login_challenge(
        self,
        session: Session,
        challenge_token: str,
        code: str,
        expires_delta: timedelta,
    ) -> tuple[str, str, UUID] | None:
        challenge = session.exec(
            select(AuthTwoFactorChallenge).where(
                AuthTwoFactorChallenge.challenge_id == challenge_token,
                AuthTwoFactorChallenge.is_deleted.is_(False),
            )
        ).first()
        if not challenge:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge_token,
                actor_id=None,
                reason_code="challenge_not_found",
            )
            return None

        now = get_now_manila()
        challenge_expires_at = self._normalize_timestamp(challenge.expires_at, now)
        if challenge.is_consumed:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=challenge.user_uuid,
                reason_code="challenge_consumed",
            )
            return None

        if challenge_expires_at <= now:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=challenge.user_uuid,
                reason_code="challenge_expired",
            )
            return None

        if challenge.failure_count >= TWO_FACTOR_CHALLENGE_MAX_FAILURES:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=challenge.user_uuid,
                reason_code="challenge_failure_limit_exceeded",
            )
            return None

        user = session.exec(
            select(User).where(User.id == challenge.user_uuid, User.is_deleted.is_(False))
        ).first()
        if not user:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=None,
                reason_code="user_not_found",
            )
            return None

        active_secret = self._get_active_two_factor_secret(session, user.id)
        if not active_secret:
            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=user.id,
                reason_code="missing_enrollment",
            )
            return None

        if not verify_totp_code(active_secret, code):
            challenge.failure_count += 1
            if challenge.failure_count >= TWO_FACTOR_CHALLENGE_MAX_FAILURES:
                challenge.is_consumed = True
                challenge.consumed_at = now
            challenge.updated_at = now
            session.add(challenge)
            session.flush()

            self._log_two_factor_event(
                session,
                action="two_factor_challenge_failed",
                entity_id=challenge.challenge_id,
                actor_id=user.id,
                reason_code=(
                    "challenge_failure_limit_reached"
                    if challenge.failure_count >= TWO_FACTOR_CHALLENGE_MAX_FAILURES
                    else "invalid_totp_code"
                ),
            )
            return None

        challenge.is_consumed = True
        challenge.consumed_at = now
        challenge.updated_at = now
        session.add(challenge)

        credential = self.get_two_factor_credential(session, user.id)
        if credential:
            credential.last_verified_at = now
            credential.updated_at = now
            session.add(credential)

        if challenge.used_secondary_password:
            self.rotate_secondary_credential_after_login(
                session,
                user,
                reason_code="login_two_factor_completed",
            )

        db_session = self.create_user_session(
            session=session,
            user_uuid=user.id,
            expires_delta=expires_delta,
            device_id=challenge.device_id,
        )
        access_token = self.create_access_token(
            data={"sub": user.user_id, "session_id": db_session.session_id},
            expires_delta=expires_delta,
        )

        self._log_two_factor_event(
            session,
            action="two_factor_challenge_verified",
            entity_id=challenge.challenge_id,
            actor_id=user.id,
            after={"session_id": db_session.session_id},
        )

        return access_token, db_session.session_id, user.id

    def get_session_timeout_policy(self, session: Session) -> dict[str, int]:
        inactive_minutes = self._parse_non_negative_int(
            self.auth_config_service.get_value(
                session,
                KEY_SESSION_INACTIVE_MINUTES,
                str(settings.AUTH_SESSION_INACTIVITY_TIMEOUT_MINUTES),
                category=SECURITY_SETTINGS_CATEGORY,
            ),
            max(settings.AUTH_SESSION_INACTIVITY_TIMEOUT_MINUTES, 0),
        )

        default_warning_minutes = (
            min(DEFAULT_SESSION_WARNING_MINUTES, max(inactive_minutes - 1, 0))
            if inactive_minutes > 0
            else 0
        )
        warning_minutes = self._parse_non_negative_int(
            self.auth_config_service.get_value(
                session,
                KEY_SESSION_WARNING_MINUTES,
                str(default_warning_minutes),
                category=SECURITY_SETTINGS_CATEGORY,
            ),
            default_warning_minutes,
        )

        if inactive_minutes == 0:
            warning_minutes = 0
        elif warning_minutes >= inactive_minutes:
            warning_minutes = max(inactive_minutes - 1, 0)

        return {
            "inactive_minutes": inactive_minutes,
            "warning_minutes": warning_minutes,
        }

    def _session_inactivity_timeout(self, session: Session) -> timedelta | None:
        timeout_minutes = self.get_session_timeout_policy(session)["inactive_minutes"]
        if timeout_minutes == 0:
            return None
        return timedelta(minutes=timeout_minutes)

    def _activity_touch_interval_seconds(self) -> int:
        return max(settings.AUTH_ACTIVITY_TOUCH_INTERVAL_SECONDS, 0)

    def _is_session_inactive(self, session: Session, last_activity_at: datetime, now: datetime) -> bool:
        timeout = self._session_inactivity_timeout(session)
        if timeout is None:
            return False
        return last_activity_at <= (now - timeout)

    def _normalize_timestamp(self, value: datetime, reference: datetime) -> datetime:
        if value.tzinfo is None and reference.tzinfo is not None:
            as_reference_tz = value.replace(tzinfo=reference.tzinfo)
            skew_seconds = abs((reference - as_reference_tz).total_seconds())

            # PostgreSQL `timestamp without time zone` can round-trip aware values as
            # naive UTC. If the naive/local interpretation is wildly skewed, treat
            # the stored value as UTC and convert to the reference timezone.
            if skew_seconds > 6 * 60 * 60:
                return value.replace(tzinfo=UTC).astimezone(reference.tzinfo)

            return as_reference_tz
        return value

    def _should_touch_activity(self, last_activity_at: datetime, now: datetime) -> bool:
        touch_interval_seconds = self._activity_touch_interval_seconds()
        if touch_interval_seconds == 0:
            return True
        elapsed_seconds = (now - last_activity_at).total_seconds()
        return elapsed_seconds >= touch_interval_seconds

    def _validate_session_activity(
        self,
        session: Session,
        db_session: UserSession | BorrowerSession,
        touch_activity: bool,
    ) -> bool:
        now = get_now_manila()
        last_activity_at = db_session.last_activity_at or db_session.issued_at or db_session.created_at
        last_activity_at = self._normalize_timestamp(last_activity_at, now)

        if self._is_session_inactive(session, last_activity_at, now):
            db_session.is_revoked = True
            db_session.updated_at = now
            session.add(db_session)
            session.flush()
            return False

        if touch_activity and self._should_touch_activity(last_activity_at, now):
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

        return True

    def _enforce_user_session_limit(self, session: Session, user_uuid: UUID) -> None:
        max_sessions = max(settings.AUTH_MAX_ACTIVE_USER_SESSIONS, 1)
        now = get_now_manila()
        active_sessions = list(
            session.exec(
                select(UserSession)
                .where(
                    UserSession.user_uuid == user_uuid,
                    UserSession.is_revoked.is_(False),
                    UserSession.expires_at > now,
                )
                .order_by(UserSession.issued_at.asc())
            ).all()
        )

        sessions_to_revoke = len(active_sessions) - max_sessions + 1
        if sessions_to_revoke <= 0:
            return

        for existing_session in active_sessions[:sessions_to_revoke]:
            existing_session.is_revoked = True
            existing_session.updated_at = now
            session.add(existing_session)

    def _enforce_borrower_session_limit(self, session: Session, borrower_uuid: UUID) -> None:
        max_sessions = max(settings.AUTH_MAX_ACTIVE_BORROWER_SESSIONS, 1)
        now = get_now_manila()
        active_sessions = list(
            session.exec(
                select(BorrowerSession)
                .where(
                    BorrowerSession.borrower_uuid == borrower_uuid,
                    BorrowerSession.is_revoked.is_(False),
                    BorrowerSession.expires_at > now,
                )
                .order_by(BorrowerSession.issued_at.asc())
            ).all()
        )

        sessions_to_revoke = len(active_sessions) - max_sessions + 1
        if sessions_to_revoke <= 0:
            return

        for existing_session in active_sessions[:sessions_to_revoke]:
            existing_session.is_revoked = True
            existing_session.updated_at = now
            session.add(existing_session)

    def _get_active_user_by_identity(self, session: Session, username_or_email: str) -> User | None:
        statement = (
            select(User)
            .where((User.username == username_or_email) | (User.email == username_or_email))
            .where(User.is_deleted.is_(False))
        )
        return session.exec(statement).first()

    def _verify_primary_password(self, user: User, password: str) -> tuple[bool, str | None]:
        verified, upgraded_hash = verify_and_update_password(password, user.hashed_password)
        return verified, upgraded_hash

    def _verify_secondary_password(self, user: User, password: str) -> bool:
        encrypted_value = user.recovery_credential_encrypted
        provided = password.strip()
        if not encrypted_value or not provided:
            return False

        try:
            current_value = decrypt_sensitive_value(encrypted_value)
        except ValueError:
            return False

        return secrets.compare_digest(current_value, provided)

    def authenticate_user(self, session: Session, username_or_email: str, password: str) -> User | None:
        user = self._get_active_user_by_identity(session, username_or_email)
        if not user:
            return None

        verified, upgraded_hash = self._verify_primary_password(user, password)
        if not verified:
            return None

        if upgraded_hash:
            user.hashed_password = upgraded_hash
            user.updated_at = get_now_manila()
            session.add(user)

        return user

    def authenticate_user_for_login(
        self,
        session: Session,
        username_or_email: str,
        password: str,
    ) -> tuple[User, str] | None:
        user = self._get_active_user_by_identity(session, username_or_email)
        if not user:
            return None

        primary_verified, upgraded_hash = self._verify_primary_password(user, password)
        if primary_verified:
            if upgraded_hash:
                user.hashed_password = upgraded_hash
                user.updated_at = get_now_manila()
                session.add(user)
            return user, "primary"

        if self.is_borrower_role(user.role):
            return None

        if not self._verify_secondary_password(user, password):
            return None

        return user, "secondary"

    def is_bootstrap_admin(self, user: User | None) -> bool:
        return bool(user and user.user_id == "ADMIN-001")

    def is_borrower_role(self, role: str | None) -> bool:
        return self._normalize_role(role) in self._BORROWER_ROLES

    def should_force_first_login_password_rotation(self, user: User | None) -> bool:
        if not user:
            return False

        # Phase 3 marks one-time credential flows with must_change_password=True
        # and password_rotated_at unset until first successful rotation.
        if self.is_borrower_role(user.role):
            return False

        if not user.must_change_password:
            return False

        return user.password_rotated_at is None

    def should_force_bootstrap_password_rotation(self, user: User | None) -> bool:
        return bool(self.is_bootstrap_admin(user) and self.should_force_first_login_password_rotation(user))

    def authenticate_bootstrap_admin(
        self,
        session: Session,
        username_or_email: str,
        password: str,
    ) -> User | None:
        user = self.authenticate_user(session, username_or_email, password)
        if not self.is_bootstrap_admin(user):
            return None
        return user

    def rotate_bootstrap_admin_password(
        self,
        session: Session,
        user: User,
        new_password: str,
    ) -> User:
        if not self.is_bootstrap_admin(user):
            raise ValueError("Only ADMIN-001 can use bootstrap password rotation")

        self.password_policy_service.validate_for_role(session, new_password, user.role)

        user.hashed_password = get_password_hash(new_password)
        user.must_change_password = False
        user.password_rotated_at = get_now_manila()
        user.updated_at = get_now_manila()

        session.add(user)
        session.flush()
        session.refresh(user)
        return user

    def authenticate_first_login_rotation_user(
        self,
        session: Session,
        username_or_email: str,
        password: str,
    ) -> User | None:
        auth_result = self.authenticate_first_login_rotation_user_with_mode(
            session,
            username_or_email,
            password,
        )
        if not auth_result:
            return None
        return auth_result[0]

    def authenticate_first_login_rotation_user_with_mode(
        self,
        session: Session,
        username_or_email: str,
        password: str,
    ) -> tuple[User, str] | None:
        auth_result = self.authenticate_user_for_login(session, username_or_email, password)
        if not auth_result:
            return None

        user, credential_mode = auth_result
        # Primary credential rotation remains limited to forced first-login flow.
        # Secondary credential can initiate rotation as a recovery path.
        if credential_mode == "primary" and not self.should_force_first_login_password_rotation(user):
            return None

        return user, credential_mode

    def rotate_first_login_password(
        self,
        session: Session,
        user: User,
        new_password: str,
        *,
        used_secondary_password: bool = False,
    ) -> User:
        if not used_secondary_password and not self.should_force_first_login_password_rotation(user):
            raise ValueError("User is not eligible for first-login password rotation")

        self.password_policy_service.validate_for_role(session, new_password, user.role)

        now = get_now_manila()
        user.hashed_password = get_password_hash(new_password)
        user.must_change_password = False
        user.password_rotated_at = now

        if used_secondary_password:
            user.recovery_credential_encrypted = encrypt_sensitive_value(
                secrets.token_urlsafe(SECONDARY_PASSWORD_TOKEN_BYTES)
            )
            user.recovery_credential_rotated_at = now

        user.updated_at = now

        session.add(user)
        session.flush()
        session.refresh(user)
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        from utils.security import create_access_token as create_jwt
        
        return create_jwt(data, expires_delta=expires_delta)

    def create_borrower_session(
        self,
        session: Session,
        user_id: str,
        expires_delta: timedelta,
        user_uuid: UUID | None = None,
        device_id: str | None = None,
    ) -> BorrowerSession:
        now = get_now_manila()
        expires_at = now + expires_delta
        if user_uuid:
            self._enforce_borrower_session_limit(session, user_uuid)

        db_session = BorrowerSession(
            session_id=get_next_sequence(session, BorrowerSession, "session_id", "BSE"),
            borrower_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
            last_activity_at=now,
        )
        session.add(db_session)
        session.flush()
        session.refresh(db_session)

        return db_session

    def is_borrower_session_valid(
        self,
        session: Session,
        session_id: str,
        touch_activity: bool = False,
    ) -> bool:
        statement = select(BorrowerSession).where(
            BorrowerSession.session_id == session_id,
            BorrowerSession.is_revoked.is_(False),
            BorrowerSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()
        if not db_session:
            return False

        return self._validate_session_activity(session, db_session, touch_activity=touch_activity)

    def revoke_borrower_session(self, session: Session, session_id: str):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()

        if db_session:
            db_session.is_revoked = True
            db_session.updated_at = get_now_manila()
            session.add(db_session)
            session.flush()

    def extend_borrower_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            now = get_now_manila()
            db_session.expires_at = now + expires_delta
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

    def create_user_session(
        self,
        session: Session,
        user_uuid: UUID,
        expires_delta: timedelta,
        device_id: str | None = None,
    ) -> UserSession:
        now = get_now_manila()
        expires_at = now + expires_delta
        self._enforce_user_session_limit(session, user_uuid)

        db_session = UserSession(
            session_id=get_next_sequence(session, UserSession, "session_id", "USE"),
            user_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
            last_activity_at=now,
        )
        session.add(db_session)
        session.flush()
        session.refresh(db_session)

        return db_session

    def is_user_session_valid(
        self,
        session: Session,
        session_id: str,
        touch_activity: bool = False,
    ) -> bool:
        statement = select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()
        if not db_session:
            return False

        return self._validate_session_activity(session, db_session, touch_activity=touch_activity)

    def revoke_user_session(self, session: Session, session_id: str):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.is_revoked = True
            db_session.updated_at = get_now_manila()
            session.add(db_session)
            session.flush()

    def revoke_session_by_id(self, session: Session, session_id: str) -> bool:
        """Revoke a session by session_id regardless of role/table origin."""
        now = get_now_manila()

        if session_id.startswith("USE"):
            db_session = session.exec(
                select(UserSession).where(UserSession.session_id == session_id)
            ).first()
            if db_session:
                db_session.is_revoked = True
                db_session.updated_at = now
                session.add(db_session)
                session.flush()
                return True

        if session_id.startswith("BSE"):
            db_session = session.exec(
                select(BorrowerSession).where(BorrowerSession.session_id == session_id)
            ).first()
            if db_session:
                db_session.is_revoked = True
                db_session.updated_at = now
                session.add(db_session)
                session.flush()
                return True

        # Defensive fallback for any legacy/non-standard prefix.
        db_user_session = session.exec(
            select(UserSession).where(UserSession.session_id == session_id)
        ).first()
        if db_user_session:
            db_user_session.is_revoked = True
            db_user_session.updated_at = now
            session.add(db_user_session)
            session.flush()
            return True

        db_borrower_session = session.exec(
            select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        ).first()
        if db_borrower_session:
            db_borrower_session.is_revoked = True
            db_borrower_session.updated_at = now
            session.add(db_borrower_session)
            session.flush()
            return True

        return False

    def extend_user_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            now = get_now_manila()
            db_session.expires_at = now + expires_delta
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

    def revoke_all_other_sessions(
        self,
        session: Session,
        exclude_session_id: str | None = None,
        actor_id: UUID | None = None,
    ):
        """Revoke all active user and borrower sessions, except for the specified exclude_session_id."""
        now = get_now_manila()
        
        # Revoke User Sessions
        stmt_user = select(UserSession).where(
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now
        )
        if exclude_session_id:
            stmt_user = stmt_user.where(UserSession.session_id != exclude_session_id)
            
        user_sessions = session.exec(stmt_user).all()
        for us in user_sessions:
            us.is_revoked = True
            session.add(us)
            
        # Revoke Borrower Sessions
        stmt_borrower = select(BorrowerSession).where(
            BorrowerSession.is_revoked.is_(False),
            BorrowerSession.expires_at > now
        )
        if exclude_session_id:
            stmt_borrower = stmt_borrower.where(BorrowerSession.session_id != exclude_session_id)
            
        borrower_sessions = session.exec(stmt_borrower).all()
        for bs in borrower_sessions:
            bs.is_revoked = True
            session.add(bs)

        audit_service.log_action(
            db=session,
            entity_type="session",
            entity_id=exclude_session_id or "all",
            action="revoke_all_other_sessions",
            actor_id=actor_id,
            after={
                "revoked_user_sessions": len(user_sessions),
                "revoked_borrower_sessions": len(borrower_sessions),
                "excluded_session_id": exclude_session_id,
            },
        )

        session.flush()

    def revoke_sessions_for_user(self, session: Session, user_uuid: UUID):
        """Revoke all non-expired sessions owned by a specific user."""
        now = get_now_manila()

        user_sessions = session.exec(
            select(UserSession).where(
                UserSession.user_uuid == user_uuid,
                UserSession.is_revoked.is_(False),
                UserSession.expires_at > now,
            )
        ).all()
        for db_session in user_sessions:
            db_session.is_revoked = True
            session.add(db_session)

        borrower_sessions = session.exec(
            select(BorrowerSession).where(
                BorrowerSession.borrower_uuid == user_uuid,
                BorrowerSession.is_revoked.is_(False),
                BorrowerSession.expires_at > now,
            )
        ).all()
        for db_session in borrower_sessions:
            db_session.is_revoked = True
            session.add(db_session)

        session.flush()

auth_service = AuthService()