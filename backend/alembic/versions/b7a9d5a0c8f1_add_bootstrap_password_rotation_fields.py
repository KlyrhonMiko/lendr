"""add bootstrap password rotation fields

Revision ID: b7a9d5a0c8f1
Revises: aa024ab06cfb
Create Date: 2026-04-01 14:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7a9d5a0c8f1"
down_revision: Union[str, Sequence[str], None] = "aa024ab06cfb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("users", sa.Column("password_rotated_at", sa.DateTime(), nullable=True))

    # Force one-time rotation for bootstrap admin.
    op.execute(
        sa.text(
            """
            UPDATE users
            SET must_change_password = true,
                password_rotated_at = NULL
            WHERE user_id = 'ADMIN-001' AND is_deleted IS FALSE
            """
        )
    )

    op.alter_column("users", "must_change_password", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "password_rotated_at")
    op.drop_column("users", "must_change_password")
