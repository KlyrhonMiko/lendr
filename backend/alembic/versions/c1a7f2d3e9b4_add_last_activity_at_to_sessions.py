"""add last_activity_at to session tables

Revision ID: c1a7f2d3e9b4
Revises: b7a9d5a0c8f1
Create Date: 2026-04-01 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a7f2d3e9b4"
down_revision: Union[str, Sequence[str], None] = "b7a9d5a0c8f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "user_sessions",
        sa.Column("last_activity_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "borrower_sessions",
        sa.Column("last_activity_at", sa.DateTime(), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE user_sessions
            SET last_activity_at = COALESCE(last_activity_at, issued_at, updated_at, created_at)
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE borrower_sessions
            SET last_activity_at = COALESCE(last_activity_at, issued_at, updated_at, created_at)
            """
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("borrower_sessions", "last_activity_at")
    op.drop_column("user_sessions", "last_activity_at")
