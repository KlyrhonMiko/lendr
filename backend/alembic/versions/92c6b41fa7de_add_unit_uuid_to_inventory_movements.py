"""add unit_uuid to inventory movements

Revision ID: 92c6b41fa7de
Revises: 8750dd4bcea9
Create Date: 2026-04-13 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "92c6b41fa7de"
down_revision: Union[str, Sequence[str], None] = "8750dd4bcea9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("inventory_movements", sa.Column("unit_uuid", sa.Uuid(), nullable=True))
    op.create_index(
        "ix_inventory_movements_unit_uuid",
        "inventory_movements",
        ["unit_uuid"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_inventory_movements_unit_uuid_inventory_units_id",
        "inventory_movements",
        "inventory_units",
        ["unit_uuid"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_inventory_movements_unit_uuid_inventory_units_id",
        "inventory_movements",
        type_="foreignkey",
    )
    op.drop_index("ix_inventory_movements_unit_uuid", table_name="inventory_movements")
    op.drop_column("inventory_movements", "unit_uuid")
