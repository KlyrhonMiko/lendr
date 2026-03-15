"""add borrow request units chain of custody table

Revision ID: c2f31d9a4e12
Revises: a94d2e5c7f11
Create Date: 2026-03-15 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2f31d9a4e12"
down_revision: Union[str, Sequence[str], None] = "a94d2e5c7f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "borrow_request_units",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("borrow_unit_id", sa.String(length=50), nullable=False),
        sa.Column("borrow_id", sa.String(length=50), nullable=False),
        sa.Column("unit_id", sa.String(length=50), nullable=False),
        sa.Column("requested_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(), nullable=True),
        sa.Column("released_at", sa.DateTime(), nullable=True),
        sa.Column("returned_at", sa.DateTime(), nullable=True),
        sa.Column("requested_by", sa.UUID(), nullable=True),
        sa.Column("requested_by_user_id", sa.String(length=50), nullable=True),
        sa.Column("requested_by_employee_id", sa.String(length=50), nullable=True),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("approved_by_user_id", sa.String(length=50), nullable=True),
        sa.Column("approved_by_employee_id", sa.String(length=50), nullable=True),
        sa.Column("assigned_by", sa.UUID(), nullable=True),
        sa.Column("assigned_by_user_id", sa.String(length=50), nullable=True),
        sa.Column("assigned_by_employee_id", sa.String(length=50), nullable=True),
        sa.Column("released_by", sa.UUID(), nullable=True),
        sa.Column("released_by_user_id", sa.String(length=50), nullable=True),
        sa.Column("released_by_employee_id", sa.String(length=50), nullable=True),
        sa.Column("returned_by", sa.UUID(), nullable=True),
        sa.Column("returned_by_user_id", sa.String(length=50), nullable=True),
        sa.Column("returned_by_employee_id", sa.String(length=50), nullable=True),
        sa.Column("condition_on_return", sa.String(length=100), nullable=True),
        sa.Column("return_notes", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["borrow_id"], ["borrow_requests.borrow_id"]),
        sa.ForeignKeyConstraint(["released_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["returned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["inventory_units.unit_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("borrow_id", "unit_id", name="uq_borrow_request_units_borrow_id_unit_id"),
    )

    op.create_index("ix_borrow_request_units_borrow_unit_id", "borrow_request_units", ["borrow_unit_id"], unique=True)
    op.create_index("ix_borrow_request_units_borrow_id", "borrow_request_units", ["borrow_id"], unique=False)
    op.create_index("ix_borrow_request_units_unit_id", "borrow_request_units", ["unit_id"], unique=False)

    op.create_index("ix_borrow_request_units_requested_by_user_id", "borrow_request_units", ["requested_by_user_id"], unique=False)
    op.create_index("ix_borrow_request_units_requested_by_employee_id", "borrow_request_units", ["requested_by_employee_id"], unique=False)
    op.create_index("ix_borrow_request_units_approved_by_user_id", "borrow_request_units", ["approved_by_user_id"], unique=False)
    op.create_index("ix_borrow_request_units_approved_by_employee_id", "borrow_request_units", ["approved_by_employee_id"], unique=False)
    op.create_index("ix_borrow_request_units_assigned_by_user_id", "borrow_request_units", ["assigned_by_user_id"], unique=False)
    op.create_index("ix_borrow_request_units_assigned_by_employee_id", "borrow_request_units", ["assigned_by_employee_id"], unique=False)
    op.create_index("ix_borrow_request_units_released_by_user_id", "borrow_request_units", ["released_by_user_id"], unique=False)
    op.create_index("ix_borrow_request_units_released_by_employee_id", "borrow_request_units", ["released_by_employee_id"], unique=False)
    op.create_index("ix_borrow_request_units_returned_by_user_id", "borrow_request_units", ["returned_by_user_id"], unique=False)
    op.create_index("ix_borrow_request_units_returned_by_employee_id", "borrow_request_units", ["returned_by_employee_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_borrow_request_units_returned_by_employee_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_returned_by_user_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_released_by_employee_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_released_by_user_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_assigned_by_employee_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_assigned_by_user_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_approved_by_employee_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_approved_by_user_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_requested_by_employee_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_requested_by_user_id", table_name="borrow_request_units")

    op.drop_index("ix_borrow_request_units_unit_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_borrow_id", table_name="borrow_request_units")
    op.drop_index("ix_borrow_request_units_borrow_unit_id", table_name="borrow_request_units")
    op.drop_table("borrow_request_units")
