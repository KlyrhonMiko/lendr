"""phase4 borrow child uuid fk compatibility

Revision ID: 4f2c7b1a9d0e
Revises: ce8ef0ddc78f
Create Date: 2026-03-15 20:12:11.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4f2c7b1a9d0e"
down_revision: Union[str, Sequence[str], None] = "ce8ef0ddc78f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("borrow_request_units", sa.Column("borrow_uuid", sa.Uuid(), nullable=True))
    op.add_column("borrow_request_units", sa.Column("unit_uuid", sa.Uuid(), nullable=True))

    op.add_column("borrow_request_events", sa.Column("borrow_uuid", sa.Uuid(), nullable=True))

    op.add_column("borrow_participants", sa.Column("borrow_uuid", sa.Uuid(), nullable=True))
    op.add_column("borrow_participants", sa.Column("user_uuid", sa.Uuid(), nullable=True))

    op.add_column("warehouse_approvals", sa.Column("borrow_uuid", sa.Uuid(), nullable=True))

    op.add_column("requested_items", sa.Column("borrow_uuid", sa.Uuid(), nullable=True))

    op.create_index(
        "ix_borrow_request_units_borrow_uuid",
        "borrow_request_units",
        ["borrow_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_borrow_request_units_unit_uuid",
        "borrow_request_units",
        ["unit_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_borrow_request_events_borrow_uuid",
        "borrow_request_events",
        ["borrow_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_borrow_participants_borrow_uuid",
        "borrow_participants",
        ["borrow_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_borrow_participants_user_uuid",
        "borrow_participants",
        ["user_uuid"],
        unique=False,
    )
    op.create_index(
        "ix_warehouse_approvals_borrow_uuid",
        "warehouse_approvals",
        ["borrow_uuid"],
        unique=True,
    )
    op.create_index(
        "ix_requested_items_borrow_uuid",
        "requested_items",
        ["borrow_uuid"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_borrow_request_units_borrow_uuid_borrow_requests_id",
        "borrow_request_units",
        "borrow_requests",
        ["borrow_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_request_units_unit_uuid_inventory_units_id",
        "borrow_request_units",
        "inventory_units",
        ["unit_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_request_events_borrow_uuid_borrow_requests_id",
        "borrow_request_events",
        "borrow_requests",
        ["borrow_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_participants_borrow_uuid_borrow_requests_id",
        "borrow_participants",
        "borrow_requests",
        ["borrow_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_borrow_participants_user_uuid_users_id",
        "borrow_participants",
        "users",
        ["user_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_warehouse_approvals_borrow_uuid_borrow_requests_id",
        "warehouse_approvals",
        "borrow_requests",
        ["borrow_uuid"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_requested_items_borrow_uuid_borrow_requests_id",
        "requested_items",
        "borrow_requests",
        ["borrow_uuid"],
        ["id"],
    )

    op.execute(
        """
        UPDATE borrow_request_units bru
        SET borrow_uuid = br.id
        FROM borrow_requests br
        WHERE br.borrow_id = bru.borrow_id
          AND bru.borrow_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE borrow_request_units bru
        SET unit_uuid = iu.id
        FROM inventory_units iu
        WHERE iu.unit_id = bru.unit_id
          AND bru.unit_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE borrow_request_events bre
        SET borrow_uuid = br.id
        FROM borrow_requests br
        WHERE br.borrow_id = bre.borrow_id
          AND bre.borrow_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE borrow_participants bp
        SET borrow_uuid = br.id
        FROM borrow_requests br
        WHERE br.borrow_id = bp.borrow_id
          AND bp.borrow_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE borrow_participants bp
        SET user_uuid = u.id
        FROM users u
        WHERE u.user_id = bp.user_id
          AND bp.user_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE warehouse_approvals wa
        SET borrow_uuid = br.id
        FROM borrow_requests br
        WHERE br.borrow_id = wa.borrow_id
          AND wa.borrow_uuid IS NULL
        """
    )
    op.execute(
        """
        UPDATE requested_items ri
        SET borrow_uuid = br.id
        FROM borrow_requests br
        WHERE br.borrow_id = ri.borrow_id
          AND ri.borrow_uuid IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_requested_items_borrow_uuid_borrow_requests_id",
        "requested_items",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_warehouse_approvals_borrow_uuid_borrow_requests_id",
        "warehouse_approvals",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_borrow_participants_user_uuid_users_id",
        "borrow_participants",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_borrow_participants_borrow_uuid_borrow_requests_id",
        "borrow_participants",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_borrow_request_events_borrow_uuid_borrow_requests_id",
        "borrow_request_events",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_borrow_request_units_unit_uuid_inventory_units_id",
        "borrow_request_units",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_borrow_request_units_borrow_uuid_borrow_requests_id",
        "borrow_request_units",
        type_="foreignkey",
    )

    op.drop_index("ix_requested_items_borrow_uuid", table_name="requested_items")
    op.drop_index("ix_warehouse_approvals_borrow_uuid", table_name="warehouse_approvals")
    op.drop_index("ix_borrow_participants_user_uuid", table_name="borrow_participants")
    op.drop_index("ix_borrow_participants_borrow_uuid", table_name="borrow_participants")
    op.drop_index("ix_borrow_request_events_borrow_uuid", table_name="borrow_request_events")
    op.drop_index("ix_borrow_request_units_unit_uuid", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_borrow_uuid", table_name="borrow_request_units")

    op.drop_column("requested_items", "borrow_uuid")
    op.drop_column("warehouse_approvals", "borrow_uuid")
    op.drop_column("borrow_participants", "user_uuid")
    op.drop_column("borrow_participants", "borrow_uuid")
    op.drop_column("borrow_request_events", "borrow_uuid")
    op.drop_column("borrow_request_units", "unit_uuid")
    op.drop_column("borrow_request_units", "borrow_uuid")
