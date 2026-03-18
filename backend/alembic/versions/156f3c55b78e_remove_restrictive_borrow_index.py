"""remove_restrictive_borrow_index

Revision ID: 156f3c55b78e
Revises: 1c43501fcf5b
Create Date: 2026-03-18 20:58:42.534939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '156f3c55b78e'
down_revision: Union[str, Sequence[str], None] = '1c43501fcf5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(
        "ix_active_borrow_request_uuid",
        table_name="borrow_requests",
        postgresql_where=sa.text(
            "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
        ),
    )
    op.create_index(
        "ix_borrow_requests_borrower_active",
        "borrow_requests",
        ["borrower_uuid"],
        unique=False,
        postgresql_where=sa.text(
            "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_borrow_requests_borrower_active",
        table_name="borrow_requests",
        postgresql_where=sa.text(
            "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
        ),
    )
    op.create_index(
        "ix_active_borrow_request_uuid",
        "borrow_requests",
        ["borrower_uuid"],
        unique=True,
        postgresql_where=sa.text(
            "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
        ),
    )
