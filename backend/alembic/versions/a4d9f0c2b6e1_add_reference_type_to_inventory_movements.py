"""add reference_type to inventory movements

Revision ID: a4d9f0c2b6e1
Revises: b7f1d2a8c4e5
Create Date: 2026-04-02 23:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4d9f0c2b6e1"
down_revision: Union[str, Sequence[str], None] = "b7f1d2a8c4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "inventory_movements",
        sa.Column("reference_type", sa.String(length=50), nullable=True),
    )
    op.create_index(
        "ix_inventory_movements_reference_id",
        "inventory_movements",
        ["reference_id"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_movements_reference_type",
        "inventory_movements",
        ["reference_type"],
        unique=False,
    )

    # Backfill typed references for existing rows.
    op.execute(
        """
        UPDATE inventory_movements
        SET reference_type = 'borrow_request'
        WHERE movement_type IN ('borrow_release', 'borrow_return')
          AND reference_id IS NOT NULL
          AND reference_type IS NULL
        """
    )
    op.execute(
        """
        UPDATE inventory_movements
        SET reference_type = 'inventory_movement'
        WHERE movement_type = 'reversal'
          AND reference_id IS NOT NULL
          AND reference_type IS NULL
        """
    )
    op.execute(
        """
        UPDATE inventory_movements
        SET reference_type = 'external_reference'
        WHERE reference_id IS NOT NULL
          AND reference_type IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_inventory_movements_reference_type", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_reference_id", table_name="inventory_movements")
    op.drop_column("inventory_movements", "reference_type")
