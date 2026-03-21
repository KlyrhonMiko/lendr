import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select
from systems.admin.models.user import User
from systems.admin.models.settings import AdminConfig
from utils.security import get_password_hash
from data.system_init_data import SYSTEM_CONFIGS, RBAC_ROLES
from utils.logging import get_logger

logger = get_logger("core.init")

class InitializationService:
    def ensure_admin_user(self, session: Session):
        """Pre-create admin123 user directly in database if it doesn't exist."""
        existing = session.exec(
            select(User).where(User.username == "admin123", User.is_deleted.is_(False))
        ).first()

        if not existing:
            admin_user = User(
                id=uuid4(),
                user_id="ADMIN-001",
                username="admin123",
                email="admin@lendr.system",
                hashed_password=get_password_hash("admin123"),
                first_name="System",
                last_name="Administrator",
                last_active=datetime.now(timezone.utc),
                middle_name="Init",
                contact_number="",
                employee_id="SYS-ADMIN-001",
                role="admin",
                shift_type="day",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(admin_user)
            logger.info("Created default administrator (admin123)")
        else:
            logger.debug("Administrator account already exists.")

    def seed_configurations(self, session: Session):
        """Idempotently seed general system configurations."""
        count = 0
        for config_data in SYSTEM_CONFIGS:
            existing = session.exec(
                select(AdminConfig).where(
                    AdminConfig.key == config_data["key"],
                    AdminConfig.category == config_data["category"]
                )
            ).first()

            if not existing:
                config = AdminConfig(**config_data)
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
        logger.info("Starting System Initialization Registry check...")
        self.ensure_admin_user(session)
        self.seed_configurations(session)
        self.seed_rbac_roles(session)
        session.commit()
        logger.info("System Initialization Sequence Completed Successfully.")
