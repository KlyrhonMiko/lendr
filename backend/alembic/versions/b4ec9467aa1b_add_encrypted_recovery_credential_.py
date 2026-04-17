"""add encrypted recovery credential fields to users

Revision ID: b4ec9467aa1b
Revises: b8d7c6e5f4d3
Create Date: 2026-04-16 22:34:34.666536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4ec9467aa1b'
down_revision: Union[str, Sequence[str], None] = 'b8d7c6e5f4d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("recovery_credential_encrypted", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("recovery_credential_rotated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "recovery_credential_rotated_at")
    op.drop_column("users", "recovery_credential_encrypted")
