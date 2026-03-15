"""add expiration date to inventory units

Revision ID: 64f4bb1f3b7a
Revises: 09b482db6e82
Create Date: 2026-03-15 13:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "64f4bb1f3b7a"
down_revision: Union[str, Sequence[str], None] = "09b482db6e82"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("inventory_units", sa.Column("expiration_date", sa.DateTime(), nullable=True))
    op.create_index("ix_inventory_units_expiration_date", "inventory_units", ["expiration_date"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_inventory_units_expiration_date", table_name="inventory_units")
    op.drop_column("inventory_units", "expiration_date")
