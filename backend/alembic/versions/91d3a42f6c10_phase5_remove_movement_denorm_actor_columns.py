"""phase5 remove movement denormalized actor columns

Revision ID: 91d3a42f6c10
Revises: 4f2c7b1a9d0e
Create Date: 2026-03-15 22:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "91d3a42f6c10"
down_revision: Union[str, Sequence[str], None] = "4f2c7b1a9d0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("inventory_movements", "actor_user_id")
    op.drop_column("inventory_movements", "actor_employee_id")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "inventory_movements",
        sa.Column("actor_employee_id", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "inventory_movements",
        sa.Column("actor_user_id", sa.String(length=50), nullable=True),
    )
