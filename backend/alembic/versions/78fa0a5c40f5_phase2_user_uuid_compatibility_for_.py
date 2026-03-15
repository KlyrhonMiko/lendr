"""phase2 user uuid compatibility for requested items and borrower sessions

Revision ID: 78fa0a5c40f5
Revises: 2871db357b55
Create Date: 2026-03-15 19:34:45.798137

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78fa0a5c40f5'
down_revision: Union[str, Sequence[str], None] = '2871db357b55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "requested_items",
        sa.Column("requested_by_uuid", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "borrower_sessions",
        sa.Column("borrower_uuid", sa.Uuid(), nullable=True),
    )

    op.create_index(
        "ix_requested_items_requested_by_uuid",
        "requested_items",
        ["requested_by_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_borrower_sessions_borrower_uuid",
        "borrower_sessions",
        ["borrower_uuid"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_requested_items_requested_by_uuid_users_id",
        "requested_items",
        "users",
        ["requested_by_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrower_sessions_borrower_uuid_users_id",
        "borrower_sessions",
        "users",
        ["borrower_uuid"],
        ["id"],
    )

    op.execute(
        """
        UPDATE requested_items ri
        SET requested_by_uuid = u.id
        FROM users u
        WHERE u.user_id = ri.requested_by
          AND ri.requested_by_uuid IS NULL
        """
    )

    op.execute(
        """
        UPDATE borrower_sessions bs
        SET borrower_uuid = u.id
        FROM users u
        WHERE u.user_id = bs.borrower_id
          AND bs.borrower_uuid IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_borrower_sessions_borrower_uuid_users_id",
        "borrower_sessions",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_requested_items_requested_by_uuid_users_id",
        "requested_items",
        type_="foreignkey",
    )

    op.drop_index("ix_borrower_sessions_borrower_uuid", table_name="borrower_sessions")
    op.drop_index("ix_requested_items_requested_by_uuid", table_name="requested_items")

    op.drop_column("borrower_sessions", "borrower_uuid")
    op.drop_column("requested_items", "requested_by_uuid")
