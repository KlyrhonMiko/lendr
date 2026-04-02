"""drop requested_items and warehouse_approvals

Revision ID: d9e2b4c7a1f0
Revises: c1a7f2d3e9b4
Create Date: 2026-04-02 23:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d9e2b4c7a1f0"
down_revision: Union[str, Sequence[str], None] = "c1a7f2d3e9b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("warehouse_approvals")
    op.drop_table("requested_items")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        "requested_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("retention_tags", sa.JSON(), nullable=True),
        sa.Column("borrow_uuid", sa.Uuid(), nullable=True),
        sa.Column("request_ref", sa.String(length=50), nullable=False),
        sa.Column("requested_by", sa.String(length=50), nullable=False),
        sa.Column("requested_by_uuid", sa.Uuid(), nullable=True),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["borrow_uuid"], ["borrow_requests.id"]),
        sa.ForeignKeyConstraint(["requested_by_uuid"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_requested_items_is_archived"),
        "requested_items",
        ["is_archived"],
        unique=False,
    )
    op.create_index(
        op.f("ix_requested_items_borrow_uuid"),
        "requested_items",
        ["borrow_uuid"],
        unique=False,
    )
    op.create_index(
        op.f("ix_requested_items_request_ref"),
        "requested_items",
        ["request_ref"],
        unique=True,
    )
    op.create_index(
        op.f("ix_requested_items_requested_by"),
        "requested_items",
        ["requested_by"],
        unique=False,
    )
    op.create_index(
        op.f("ix_requested_items_requested_by_uuid"),
        "requested_items",
        ["requested_by_uuid"],
        unique=False,
    )

    op.create_table(
        "warehouse_approvals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("retention_tags", sa.JSON(), nullable=True),
        sa.Column("approval_id", sa.String(length=50), nullable=False),
        sa.Column("request_id", sa.String(length=50), nullable=False),
        sa.Column("borrow_uuid", sa.Uuid(), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=False),
        sa.Column("remarks", sa.String(length=500), nullable=True),
        sa.Column("printable_payload_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["borrow_uuid"], ["borrow_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_warehouse_approvals_is_archived"),
        "warehouse_approvals",
        ["is_archived"],
        unique=False,
    )
    op.create_index(
        op.f("ix_warehouse_approvals_approval_id"),
        "warehouse_approvals",
        ["approval_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_warehouse_approvals_borrow_uuid"),
        "warehouse_approvals",
        ["borrow_uuid"],
        unique=True,
    )
    op.create_index(
        op.f("ix_warehouse_approvals_request_id"),
        "warehouse_approvals",
        ["request_id"],
        unique=True,
    )
