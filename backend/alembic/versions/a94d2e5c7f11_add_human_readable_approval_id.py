"""add human readable approval id

Revision ID: a94d2e5c7f11
Revises: 8c3a7b4d5e91
Create Date: 2026-03-15 16:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a94d2e5c7f11"
down_revision: Union[str, Sequence[str], None] = "8c3a7b4d5e91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("warehouse_approvals", sa.Column("approval_id", sa.String(length=50), nullable=True))

    op.execute(
        """
        UPDATE warehouse_approvals
        SET approval_id = 'WAP-' || replace(id::text, '-', '')
        WHERE approval_id IS NULL
        """
    )

    op.alter_column("warehouse_approvals", "approval_id", nullable=False)
    op.create_index("ix_warehouse_approvals_approval_id", "warehouse_approvals", ["approval_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_warehouse_approvals_approval_id", table_name="warehouse_approvals")
    op.drop_column("warehouse_approvals", "approval_id")
