"""phase1 inventory uuid fk compatibility and index update

Revision ID: 2871db357b55
Revises: b1c4d8e9f0a1
Create Date: 2026-03-15 19:29:20.147123

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2871db357b55'
down_revision: Union[str, Sequence[str], None] = 'b1c4d8e9f0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "inventory_movements",
        sa.Column("inventory_uuid", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "inventory_units",
        sa.Column("inventory_uuid", sa.Uuid(), nullable=True),
    )

    op.create_index(
        "ix_inventory_movements_inventory_uuid",
        "inventory_movements",
        ["inventory_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_units_inventory_uuid",
        "inventory_units",
        ["inventory_uuid"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_inventory_movements_inventory_uuid_inventory_id",
        "inventory_movements",
        "inventory",
        ["inventory_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_inventory_units_inventory_uuid_inventory_id",
        "inventory_units",
        "inventory",
        ["inventory_uuid"],
        ["id"],
    )

    op.execute(
        """
        UPDATE inventory_movements im
        SET inventory_uuid = i.id
        FROM inventory i
        WHERE i.item_id = im.inventory_id
          AND im.inventory_uuid IS NULL
        """
    )

    op.execute(
        """
        UPDATE inventory_units iu
        SET inventory_uuid = i.id
        FROM inventory i
        WHERE i.item_id = iu.inventory_id
          AND iu.inventory_uuid IS NULL
        """
    )

    op.drop_index("ix_inventory_item_name_active", table_name="inventory")
    op.create_index(
        "ix_inventory_item_name_active",
        "inventory",
        ["name", "classification", "item_type"],
        unique=True,
        postgresql_where=sa.text("is_deleted IS FALSE"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_inventory_item_name_active", table_name="inventory")
    op.create_index(
        "ix_inventory_item_name_active",
        "inventory",
        ["name", "category"],
        unique=True,
        postgresql_where=sa.text("is_deleted IS FALSE"),
    )

    op.drop_constraint(
        "fk_inventory_units_inventory_uuid_inventory_id",
        "inventory_units",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_inventory_movements_inventory_uuid_inventory_id",
        "inventory_movements",
        type_="foreignkey",
    )

    op.drop_index("ix_inventory_units_inventory_uuid", table_name="inventory_units")
    op.drop_index("ix_inventory_movements_inventory_uuid", table_name="inventory_movements")

    op.drop_column("inventory_units", "inventory_uuid")
    op.drop_column("inventory_movements", "inventory_uuid")
