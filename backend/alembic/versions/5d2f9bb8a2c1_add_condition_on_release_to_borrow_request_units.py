"""add condition_on_release to borrow_request_units

Revision ID: 5d2f9bb8a2c1
Revises: 92c6b41fa7de
Create Date: 2026-04-13 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5d2f9bb8a2c1"
down_revision: Union[str, Sequence[str], None] = "92c6b41fa7de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "borrow_request_units",
        sa.Column("condition_on_release", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("borrow_request_units", "condition_on_release")
