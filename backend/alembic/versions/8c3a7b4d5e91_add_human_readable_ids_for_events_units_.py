"""add human readable ids for events units movements and sessions

Revision ID: 8c3a7b4d5e91
Revises: 64f4bb1f3b7a
Create Date: 2026-03-15 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c3a7b4d5e91"
down_revision: Union[str, Sequence[str], None] = "64f4bb1f3b7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("borrow_request_events", sa.Column("event_id", sa.String(length=50), nullable=True))
    op.add_column("inventory_movements", sa.Column("movement_id", sa.String(length=50), nullable=True))
    op.add_column("inventory_units", sa.Column("unit_id", sa.String(length=50), nullable=True))
    op.add_column("borrower_sessions", sa.Column("session_id", sa.String(length=50), nullable=True))

    op.execute(
        """
        UPDATE borrow_request_events
        SET event_id = 'BRE-' || replace(id::text, '-', '')
        WHERE event_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE inventory_movements
        SET movement_id = 'MOV-' || replace(id::text, '-', '')
        WHERE movement_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE inventory_units
        SET unit_id = 'UNT-' || replace(id::text, '-', '')
        WHERE unit_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE borrower_sessions
        SET session_id = 'BSE-' || replace(id::text, '-', '')
        WHERE session_id IS NULL
        """
    )

    op.alter_column("borrow_request_events", "event_id", nullable=False)
    op.alter_column("inventory_movements", "movement_id", nullable=False)
    op.alter_column("inventory_units", "unit_id", nullable=False)
    op.alter_column("borrower_sessions", "session_id", nullable=False)

    op.create_index("ix_borrow_request_events_event_id", "borrow_request_events", ["event_id"], unique=True)
    op.create_index("ix_inventory_movements_movement_id", "inventory_movements", ["movement_id"], unique=True)
    op.create_index("ix_inventory_units_unit_id", "inventory_units", ["unit_id"], unique=True)
    op.create_index("ix_borrower_sessions_session_id", "borrower_sessions", ["session_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_borrower_sessions_session_id", table_name="borrower_sessions")
    op.drop_index("ix_inventory_units_unit_id", table_name="inventory_units")
    op.drop_index("ix_inventory_movements_movement_id", table_name="inventory_movements")
    op.drop_index("ix_borrow_request_events_event_id", table_name="borrow_request_events")

    op.drop_column("borrower_sessions", "session_id")
    op.drop_column("inventory_units", "unit_id")
    op.drop_column("inventory_movements", "movement_id")
    op.drop_column("borrow_request_events", "event_id")
