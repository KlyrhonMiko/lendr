"""Simplify inventory identification fields.

Revision ID: 8a2b7f14c9d1
Revises: 3f60c5bc7806
Create Date: 2026-04-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8a2b7f14c9d1"
down_revision = "3f60c5bc7806"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("inventory", "item_type", existing_type=sa.String(length=50), nullable=True)

    op.drop_column("inventory", "condition")


def downgrade() -> None:
    op.add_column(
        "inventory",
        sa.Column("condition", sa.String(length=100), nullable=False, server_default="good"),
    )

    op.alter_column("inventory", "item_type", existing_type=sa.String(length=50), nullable=False)
