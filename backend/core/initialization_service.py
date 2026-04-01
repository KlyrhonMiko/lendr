import json
from datetime import datetime, timezone
from uuid import uuid4
from typing import Type

from sqlmodel import Session, select
from systems.admin.models.user import User
from systems.admin.models.settings import AdminConfig
from systems.auth.models.settings import AuthConfig
from systems.inventory.models.settings import InventoryConfig, BorrowerConfig
from core.config import settings
from utils.security import get_password_hash
from data.system_init_data import SYSTEM_CONFIGS, RBAC_ROLES
from utils.logging import get_logger
from utils.migrations import run_migrations

logger = get_logger("core.init")

AUTH_CONFIG_CATEGORIES = {"users_role", "users_shift_type"}
ConfigModel = Type[AdminConfig] | Type[InventoryConfig] | Type[BorrowerConfig] | Type[AuthConfig]


def resolve_bootstrap_admin_credentials() -> tuple[str, str]:
    """Resolve bootstrap admin credentials from environment-backed settings."""
    bootstrap_username = (settings.INITIAL_ADMIN_USERNAME or "").strip() or "admin"
    bootstrap_password = settings.INITIAL_ADMIN_PASSWORD

    if bootstrap_password:
        return bootstrap_username, bootstrap_password

    if settings.DEBUG and settings.ALLOW_INSECURE_DEV_DEFAULT_ADMIN:
        # Development-only deterministic fallback derived from SECRET_KEY.
        derived_password = f"dev-{settings.SECRET_KEY[:12]}"
        logger.warning(
            "Using insecure development fallback for bootstrap admin password. "
            "Set INITIAL_ADMIN_PASSWORD to avoid derived development credentials."
        )
        return bootstrap_username, derived_password

    raise RuntimeError(
        "INITIAL_ADMIN_PASSWORD is required to bootstrap ADMIN-001. "
        "Set INITIAL_ADMIN_PASSWORD or enable ALLOW_INSECURE_DEV_DEFAULT_ADMIN=true "
        "with DEBUG=true for local development only."
    )

class InitializationService:
    def _resolve_config_model(self, config_data: dict) -> tuple[ConfigModel, str]:
        category = config_data.get("category", "")
        system = config_data.get("system", "admin")

        # Mirror API endpoints used in seed_configuration.py routing.
        if category in AUTH_CONFIG_CATEGORIES:
            return AuthConfig, "admin"
        if system == "borrower":
            return BorrowerConfig, "borrower"
        if system == "inventory":
            return InventoryConfig, "inventory"
        return AdminConfig, "admin"

    def ensure_admin_user(self, session: Session):
        """Pre-create bootstrap admin user if it doesn't exist."""
        existing = session.exec(
            select(User).where(User.user_id == "ADMIN-001", User.is_deleted.is_(False))
        ).first()

        if not existing:
            bootstrap_username, bootstrap_password = resolve_bootstrap_admin_credentials()

            admin_user = User(
                id=uuid4(),
                user_id="ADMIN-001",
                username=bootstrap_username,
                email="admin@lendr.system",
                hashed_password=get_password_hash(bootstrap_password),
                first_name="System",
                last_name="Administrator",
                last_active=datetime.now(timezone.utc),
                middle_name="Init",
                contact_number="",
                employee_id="SYS-ADMIN-001",
                role="admin",
                shift_type="day",
                must_change_password=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(admin_user)
            logger.info("Created bootstrap administrator (%s)", bootstrap_username)
        else:
            logger.debug("Administrator account already exists.")

    def rebalance_misplaced_configurations(self, session: Session):
        """Move wrongly stored rows out of admin_configurations into their proper tables."""
        moved = 0
        removed = 0

        misplaced_rows = session.exec(
            select(AdminConfig).where(
                (AdminConfig.system == "borrower")
                | (AdminConfig.category.in_(list(AUTH_CONFIG_CATEGORIES)))
            )
        ).all()

        for row in misplaced_rows:
            if row.category in AUTH_CONFIG_CATEGORIES:
                target_model: ConfigModel = AuthConfig
                target_system = "admin"
            elif row.system == "borrower":
                target_model = BorrowerConfig
                target_system = "borrower"
            else:
                continue

            existing = session.exec(
                select(target_model).where(
                    target_model.key == row.key,
                    target_model.category == row.category,
                )
            ).first()

            if not existing:
                session.add(
                    target_model(
                        system=target_system,
                        key=row.key,
                        value=row.value,
                        category=row.category,
                        description=row.description,
                    )
                )
                moved += 1

            session.delete(row)
            removed += 1

        if moved or removed:
            logger.info(
                "Rebalanced misplaced configs: moved=%s removed_from_admin=%s",
                moved,
                removed,
            )
        else:
            logger.debug("No misplaced admin configurations found.")

    def seed_configurations(self, session: Session):
        """Idempotently seed general system configurations."""
        count = 0
        for config_data in SYSTEM_CONFIGS:
            model, normalized_system = self._resolve_config_model(config_data)
            
            existing = session.exec(
                select(model).where(
                    model.key == config_data["key"],
                    model.category == config_data["category"]
                )
            ).first()
    
            if not existing:
                config = model(
                    system=normalized_system,
                    key=config_data["key"],
                    value=config_data["value"],
                    category=config_data["category"],
                    description=config_data.get("description"),
                )
                session.add(config)
                count += 1
        
        if count > 0:
            logger.info(f"Synchronized {count} new system configurations.")
        else:
            logger.debug("System configurations are up to date.")

    def seed_rbac_roles(self, session: Session):
        """Idempotently seed RBAC role-specific permissions."""
        count = 0
        for role_data in RBAC_ROLES:
            role_key = role_data["role"].lower()
            payload = {
                "systems": role_data["systems"],
                "permissions": role_data["permissions"],
                "display_name": role_data["display_name"]
            }
            
            existing = session.exec(
                select(AdminConfig).where(
                    AdminConfig.key == role_key,
                    AdminConfig.category == "rbac_roles"
                )
            ).first()

            if not existing:
                config = AdminConfig(
                    key=role_key,
                    value=json.dumps(payload),
                    category="rbac_roles",
                    description=f"Dynamic override for role: {role_data['role']}"
                )
                session.add(config)
                count += 1
        
        if count > 0:
            logger.info(f"Synchronized {count} new role permission sets.")
        else:
            logger.debug("Role permissions are up to date.")

    def run(self, session: Session):
        """Run all initialization steps in sequence."""
        # 1. Automate Database Migrations
        run_migrations()

        # 2. Seed Data
        logger.info("Starting System Initialization Registry check...")
        self.ensure_admin_user(session)
        self.rebalance_misplaced_configurations(session)
        self.seed_configurations(session)
        self.seed_rbac_roles(session)
        session.commit()
        logger.info("System Initialization Sequence Completed Successfully.")
