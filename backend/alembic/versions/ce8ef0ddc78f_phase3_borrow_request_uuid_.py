"""phase3 borrow request uuid compatibility fields

Revision ID: ce8ef0ddc78f
Revises: 78fa0a5c40f5
Create Date: 2026-03-15 19:38:32.768239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ce8ef0ddc78f'
down_revision: Union[str, Sequence[str], None] = '78fa0a5c40f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("borrow_requests", sa.Column("borrower_uuid", sa.Uuid(), nullable=True))
    op.add_column("borrow_requests", sa.Column("item_uuid", sa.Uuid(), nullable=True))
    op.add_column("borrow_requests", sa.Column("returned_by", sa.Uuid(), nullable=True))
    op.add_column("borrow_requests", sa.Column("received_by", sa.Uuid(), nullable=True))

    op.create_index("ix_borrow_requests_borrower_uuid", "borrow_requests", ["borrower_uuid"], unique=False)
    op.create_index("ix_borrow_requests_item_uuid", "borrow_requests", ["item_uuid"], unique=False)
    op.create_index("ix_borrow_requests_returned_by", "borrow_requests", ["returned_by"], unique=False)
    op.create_index("ix_borrow_requests_received_by", "borrow_requests", ["received_by"], unique=False)

    op.create_foreign_key(
        "fk_borrow_requests_borrower_uuid_users_id",
        "borrow_requests",
        "users",
        ["borrower_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_requests_item_uuid_inventory_id",
        "borrow_requests",
        "inventory",
        ["item_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_requests_returned_by_users_id",
        "borrow_requests",
        "users",
        ["returned_by"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_requests_received_by_users_id",
        "borrow_requests",
        "users",
        ["received_by"],
        ["id"],
    )

    op.execute(
        """
        UPDATE borrow_requests br
        SET borrower_uuid = u.id
        FROM users u
        WHERE u.user_id = br.borrower_id
          AND br.borrower_uuid IS NULL
        """
    )

    op.execute(
        """
        UPDATE borrow_requests br
        SET item_uuid = i.id
        FROM inventory i
        WHERE i.item_id = br.item_id
          AND br.item_uuid IS NULL
        """
    )

    op.create_index(
        "ix_active_borrow_request_uuid",
        "borrow_requests",
        ["borrower_uuid", "item_uuid"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_active_borrow_request_uuid", table_name="borrow_requests")

    op.drop_constraint("fk_borrow_requests_received_by_users_id", "borrow_requests", type_="foreignkey")
    op.drop_constraint("fk_borrow_requests_returned_by_users_id", "borrow_requests", type_="foreignkey")
    op.drop_constraint("fk_borrow_requests_item_uuid_inventory_id", "borrow_requests", type_="foreignkey")
    op.drop_constraint("fk_borrow_requests_borrower_uuid_users_id", "borrow_requests", type_="foreignkey")

    op.drop_index("ix_borrow_requests_received_by", table_name="borrow_requests")
    op.drop_index("ix_borrow_requests_returned_by", table_name="borrow_requests")
    op.drop_index("ix_borrow_requests_item_uuid", table_name="borrow_requests")
    op.drop_index("ix_borrow_requests_borrower_uuid", table_name="borrow_requests")

    op.drop_column("borrow_requests", "received_by")
    op.drop_column("borrow_requests", "returned_by")
    op.drop_column("borrow_requests", "item_uuid")
    op.drop_column("borrow_requests", "borrower_uuid")
