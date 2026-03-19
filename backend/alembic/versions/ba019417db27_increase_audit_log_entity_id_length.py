"""increase_audit_log_entity_id_length

Revision ID: ba019417db27
Revises: 9d08b17d0426
Create Date: 2026-03-19 22:44:26.400188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba019417db27'
down_revision: Union[str, Sequence[str], None] = '9d08b17d0426'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('audit_logs', 'entity_id',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.VARCHAR(length=100),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('audit_logs', 'entity_id',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
