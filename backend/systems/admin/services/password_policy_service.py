import string
from dataclasses import dataclass
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlmodel import Session

if TYPE_CHECKING:
    from systems.auth.services.configuration_service import AuthConfigService


SECURITY_SETTINGS_CATEGORY = "security_settings"

KEY_PASSWORD_MIN_LENGTH = "password_min_length"
KEY_PASSWORD_REQUIRE_UPPERCASE = "password_require_uppercase"
KEY_PASSWORD_REQUIRE_LOWERCASE = "password_require_lowercase"
KEY_PASSWORD_REQUIRE_NUMBER = "password_require_number"
KEY_PASSWORD_REQUIRE_SPECIAL = "password_require_special"

PASSWORD_POLICY_EXEMPT_ROLES = frozenset({"borrower", "borrow", "dispatch"})


@dataclass(frozen=True)
class PasswordPolicy:
    min_length: int = 6
    require_uppercase: bool = False
    require_lowercase: bool = False
    require_number: bool = False
    require_special: bool = False


class PasswordPolicyService:
    def __init__(self):
        from systems.auth.services.configuration_service import AuthConfigService

        self.auth_config_service = AuthConfigService()

    @staticmethod
    def _parse_bool(value: str | None, default: bool) -> bool:
        normalized = (value or "").strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
        return default

    @staticmethod
    def _parse_int(value: str | None, default: int) -> int:
        try:
            parsed = int(str(value).strip())
        except (TypeError, ValueError):
            return default

        if parsed <= 0:
            return default
        return parsed

    @staticmethod
    def _normalize_role(role: str | None) -> str:
        return (role or "").strip().lower()

    @staticmethod
    def _validate_borrower_pin(password: str) -> None:
        if len(password) != 6 or not password.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Borrower PIN must be exactly 6 numeric digits.",
            )

    def get_policy(self, session: Session) -> PasswordPolicy:
        min_length = self._parse_int(
            self.auth_config_service.get_value(
                session,
                KEY_PASSWORD_MIN_LENGTH,
                "6",
                category=SECURITY_SETTINGS_CATEGORY,
            ),
            6,
        )

        return PasswordPolicy(
            min_length=min_length,
            require_uppercase=self._parse_bool(
                self.auth_config_service.get_value(
                    session,
                    KEY_PASSWORD_REQUIRE_UPPERCASE,
                    "false",
                    category=SECURITY_SETTINGS_CATEGORY,
                ),
                False,
            ),
            require_lowercase=self._parse_bool(
                self.auth_config_service.get_value(
                    session,
                    KEY_PASSWORD_REQUIRE_LOWERCASE,
                    "false",
                    category=SECURITY_SETTINGS_CATEGORY,
                ),
                False,
            ),
            require_number=self._parse_bool(
                self.auth_config_service.get_value(
                    session,
                    KEY_PASSWORD_REQUIRE_NUMBER,
                    "false",
                    category=SECURITY_SETTINGS_CATEGORY,
                ),
                False,
            ),
            require_special=self._parse_bool(
                self.auth_config_service.get_value(
                    session,
                    KEY_PASSWORD_REQUIRE_SPECIAL,
                    "false",
                    category=SECURITY_SETTINGS_CATEGORY,
                ),
                False,
            ),
        )

    def validate_for_role(self, session: Session, password: str, role: str | None) -> None:
        normalized_role = self._normalize_role(role)
        if normalized_role in {"borrower", "brwr"}:
            self._validate_borrower_pin(password)
            return

        if normalized_role in PASSWORD_POLICY_EXEMPT_ROLES:
            return

        policy = self.get_policy(session)
        validation_errors: list[str] = []

        if len(password) < policy.min_length:
            validation_errors.append(f"at least {policy.min_length} characters")

        if policy.require_uppercase and not any(char.isupper() for char in password):
            validation_errors.append("an uppercase letter")

        if policy.require_lowercase and not any(char.islower() for char in password):
            validation_errors.append("a lowercase letter")

        if policy.require_number and not any(char.isdigit() for char in password):
            validation_errors.append("a number")

        if policy.require_special and not any(char in string.punctuation for char in password):
            validation_errors.append("a special character")

        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Password does not meet policy requirements. Required: "
                    + ", ".join(validation_errors)
                ),
            )
