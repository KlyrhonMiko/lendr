"""add export date indexes

Revision ID: 8750dd4bcea9
Revises: c8f1d9a2e4b7
Create Date: 2026-04-13 15:44:15.248803

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8750dd4bcea9'
down_revision: Union[str, Sequence[str], None] = 'c8f1d9a2e4b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index("ix_inventory_created_at", "inventory", ["created_at"], unique=False)
    op.create_index(
        "ix_borrow_requests_request_date",
        "borrow_requests",
        ["request_date"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_movements_occurred_at",
        "inventory_movements",
        ["occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_inventory_movements_occurred_at", table_name="inventory_movements")
    op.drop_index("ix_borrow_requests_request_date", table_name="borrow_requests")
    op.drop_index("ix_inventory_created_at", table_name="inventory")
