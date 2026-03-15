"""phase8 drop redundant legacy id columns

Revision ID: e7f4a1b9c2d3
Revises: c4d8f1a2b3e4
Create Date: 2026-03-15 13:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f4a1b9c2d3"
down_revision: Union[str, Sequence[str], None] = "c4d8f1a2b3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def _drop_fk_constraints_for_column(table_name: str, column_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            DO $$
            DECLARE fk_record RECORD;
            BEGIN
                FOR fk_record IN
                    SELECT c.conname
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    JOIN unnest(c.conkey) WITH ORDINALITY AS col(attnum, ord) ON TRUE
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = col.attnum
                    WHERE c.contype = 'f'
                      AND n.nspname = 'public'
                      AND t.relname = '{table_name}'
                      AND a.attname = '{column_name}'
                LOOP
                    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', '{table_name}', fk_record.conname);
                END LOOP;
            END
            $$;
            """
        )
    )


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    if _column_exists(table_name, column_name):
        _drop_fk_constraints_for_column(table_name, column_name)
        op.drop_column(table_name, column_name)


def upgrade() -> None:
    """Upgrade schema."""
    _drop_column_if_exists("requested_items", "borrow_id")

    _drop_column_if_exists("inventory_units", "inventory_id")
    _drop_column_if_exists("inventory_movements", "inventory_id")

    _drop_column_if_exists("borrower_sessions", "borrower_id")

    _drop_column_if_exists("borrow_requests", "item_id")
    _drop_column_if_exists("borrow_requests", "borrower_id")

    _drop_column_if_exists("borrow_request_units", "borrow_id")
    _drop_column_if_exists("borrow_request_units", "unit_id")

    _drop_column_if_exists("borrow_request_events", "borrow_id")

    _drop_column_if_exists("borrow_participants", "borrow_id")
    _drop_column_if_exists("borrow_participants", "user_id")

    _drop_column_if_exists("backup_runs", "user_uuid")

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) AS col(attnum) ON TRUE
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = col.attnum
                WHERE c.contype = 'f'
                  AND n.nspname = 'public'
                  AND t.relname = 'backup_runs'
                  AND a.attname = 'triggered_by'
            ) THEN
                ALTER TABLE public.backup_runs
                ADD CONSTRAINT fk_backup_runs_triggered_by_users_id
                FOREIGN KEY (triggered_by) REFERENCES public.users(id);
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    if not _column_exists("requested_items", "borrow_id"):
        op.add_column("requested_items", sa.Column("borrow_id", sa.String(length=50), nullable=True))

    if not _column_exists("inventory_units", "inventory_id"):
        op.add_column("inventory_units", sa.Column("inventory_id", sa.String(length=50), nullable=True))

    if not _column_exists("inventory_movements", "inventory_id"):
        op.add_column("inventory_movements", sa.Column("inventory_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrower_sessions", "borrower_id"):
        op.add_column("borrower_sessions", sa.Column("borrower_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_requests", "item_id"):
        op.add_column("borrow_requests", sa.Column("item_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_requests", "borrower_id"):
        op.add_column("borrow_requests", sa.Column("borrower_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_request_units", "borrow_id"):
        op.add_column("borrow_request_units", sa.Column("borrow_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_request_units", "unit_id"):
        op.add_column("borrow_request_units", sa.Column("unit_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_request_events", "borrow_id"):
        op.add_column("borrow_request_events", sa.Column("borrow_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_participants", "borrow_id"):
        op.add_column("borrow_participants", sa.Column("borrow_id", sa.String(length=50), nullable=True))

    if not _column_exists("borrow_participants", "user_id"):
        op.add_column("borrow_participants", sa.Column("user_id", sa.String(length=50), nullable=True))

    if not _column_exists("backup_runs", "user_uuid"):
        op.add_column("backup_runs", sa.Column("user_uuid", sa.Uuid(), nullable=True))
