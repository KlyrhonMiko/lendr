"""add receipt_snapshot to borrow_request

Revision ID: b8d7c6e5f4d3
Revises: 5d2f9bb8a2c1
Create Date: 2026-04-14 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b8d7c6e5f4d3'
down_revision: Union[str, Sequence[str], None] = '5d2f9bb8a2c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('borrow_requests', sa.Column('receipt_snapshot', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('borrow_requests', 'receipt_snapshot')
