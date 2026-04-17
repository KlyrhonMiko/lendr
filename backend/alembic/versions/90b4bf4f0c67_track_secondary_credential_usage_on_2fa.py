"""track secondary credential usage on auth 2fa challenges

Revision ID: 90b4bf4f0c67
Revises: 6a8fd8de2bc1
Create Date: 2026-04-17 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "90b4bf4f0c67"
down_revision: Union[str, Sequence[str], None] = "6a8fd8de2bc1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "auth_two_factor_challenges",
        sa.Column(
            "used_secondary_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("auth_two_factor_challenges", "used_secondary_password", server_default=None)


def downgrade() -> None:
    op.drop_column("auth_two_factor_challenges", "used_secondary_password")
