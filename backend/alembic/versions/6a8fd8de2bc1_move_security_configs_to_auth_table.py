"""move security-related configs to auth_configurations

Revision ID: 6a8fd8de2bc1
Revises: b4ec9467aa1b
Create Date: 2026-04-17 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6a8fd8de2bc1"
down_revision: Union[str, Sequence[str], None] = "b4ec9467aa1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONFIG_CATEGORIES = (
    "security_settings",
    "rbac_roles",
    "users_role",
    "users_shift_type",
    "users_shift_definition",
)


def _copy_missing_rows(
    bind: sa.Connection,
    *,
    source_table_name: str,
    target_table_name: str,
) -> None:
    metadata = sa.MetaData()
    source = sa.Table(source_table_name, metadata, autoload_with=bind)
    target = sa.Table(target_table_name, metadata, autoload_with=bind)

    source_rows = bind.execute(
        sa.select(source).where(source.c.category.in_(CONFIG_CATEGORIES))
    ).mappings().all()

    for row in source_rows:
        exists = bind.execute(
            sa.select(target.c.id)
            .where(
                sa.func.lower(target.c.key) == str(row["key"]).lower(),
                target.c.category == row["category"],
            )
            .limit(1)
        ).first()
        if exists:
            continue

        payload = dict(row)
        payload["id"] = uuid4()
        bind.execute(sa.insert(target).values(**payload))


def _delete_categories(bind: sa.Connection, *, table_name: str) -> None:
    metadata = sa.MetaData()
    table = sa.Table(table_name, metadata, autoload_with=bind)
    bind.execute(sa.delete(table).where(table.c.category.in_(CONFIG_CATEGORIES)))


def upgrade() -> None:
    bind = op.get_bind()
    _copy_missing_rows(
        bind,
        source_table_name="admin_configurations",
        target_table_name="auth_configurations",
    )
    _delete_categories(bind, table_name="admin_configurations")


def downgrade() -> None:
    bind = op.get_bind()
    _copy_missing_rows(
        bind,
        source_table_name="auth_configurations",
        target_table_name="admin_configurations",
    )
    _delete_categories(bind, table_name="auth_configurations")
