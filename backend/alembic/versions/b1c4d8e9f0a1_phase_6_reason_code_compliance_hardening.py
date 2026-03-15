"""phase 6 reason code compliance hardening

Revision ID: b1c4d8e9f0a1
Revises: 3f1c9ab4d2e0
Create Date: 2026-03-15 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1c4d8e9f0a1"
down_revision: Union[str, Sequence[str], None] = "3f1c9ab4d2e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("inventory_movements", sa.Column("reason_code", sa.String(length=50), nullable=True))
    op.add_column("audit_logs", sa.Column("reason_code", sa.String(length=50), nullable=True))
    op.create_index("ix_inventory_movements_reason_code", "inventory_movements", ["reason_code"], unique=False)
    op.create_index("ix_audit_logs_reason_code", "audit_logs", ["reason_code"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_audit_logs_reason_code", table_name="audit_logs")
    op.drop_index("ix_inventory_movements_reason_code", table_name="inventory_movements")
    op.drop_column("audit_logs", "reason_code")
    op.drop_column("inventory_movements", "reason_code")
