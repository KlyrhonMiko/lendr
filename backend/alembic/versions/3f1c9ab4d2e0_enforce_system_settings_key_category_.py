"""enforce system settings key+category uniqueness

Revision ID: 3f1c9ab4d2e0
Revises: c2f31d9a4e12
Create Date: 2026-03-15 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3f1c9ab4d2e0"
down_revision: Union[str, Sequence[str], None] = "c2f31d9a4e12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(op.f("ix_system_settings_key"), table_name="system_settings")
    op.create_index(op.f("ix_system_settings_key"), "system_settings", ["key"], unique=False)
    op.create_index("ix_system_settings_category", "system_settings", ["category"], unique=False)
    op.create_unique_constraint(
        "uq_system_settings_key_category",
        "system_settings",
        ["key", "category"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_system_settings_key_category", "system_settings", type_="unique")
    op.drop_index("ix_system_settings_category", table_name="system_settings")
    op.drop_index(op.f("ix_system_settings_key"), table_name="system_settings")
    op.create_index(op.f("ix_system_settings_key"), "system_settings", ["key"], unique=True)
