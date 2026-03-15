"""phase7a add borrow_request_items for multi-item support

Revision ID: f3a7e2c9d5b1
Revises: e7f4a1b9c2d3
Create Date: 2026-03-15 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3a7e2c9d5b1"
down_revision: Union[str, Sequence[str], None] = "e7f4a1b9c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create borrow_request_items table for multi-item support."""
    # Create borrow_request_items table
    op.create_table(
        'borrow_request_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('borrow_uuid', sa.Uuid(), nullable=False),
        sa.Column('item_uuid', sa.Uuid(), nullable=False),
        sa.Column('qty_requested', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['borrow_uuid'], ['borrow_requests.id'], ),
        sa.ForeignKeyConstraint(['item_uuid'], ['inventory.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient queries
    op.create_index(
        op.f('ix_borrow_request_items_borrow_uuid'),
        'borrow_request_items',
        ['borrow_uuid'],
        unique=False
    )
    op.create_index(
        op.f('ix_borrow_request_items_item_uuid'),
        'borrow_request_items',
        ['item_uuid'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema - remove borrow_request_items table."""
    op.drop_index(
        op.f('ix_borrow_request_items_item_uuid'),
        table_name='borrow_request_items'
    )
    op.drop_index(
        op.f('ix_borrow_request_items_borrow_uuid'),
        table_name='borrow_request_items'
    )
    op.drop_table('borrow_request_items')
