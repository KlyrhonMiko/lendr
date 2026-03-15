"""phase7 final non-pk fk cutover

Revision ID: c4d8f1a2b3e4
Revises: 91d3a42f6c10
Create Date: 2026-03-15 23:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d8f1a2b3e4"
down_revision: Union[str, Sequence[str], None] = "91d3a42f6c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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


def upgrade() -> None:
    """Upgrade schema."""
    # Remove non-PK foreign keys while keeping business identifier columns.
    _drop_fk_constraints_for_column("inventory_units", "inventory_id")
    _drop_fk_constraints_for_column("inventory_movements", "inventory_id")
    _drop_fk_constraints_for_column("borrow_requests", "borrower_id")
    _drop_fk_constraints_for_column("borrow_requests", "item_id")
    _drop_fk_constraints_for_column("borrow_request_units", "borrow_id")
    _drop_fk_constraints_for_column("borrow_request_units", "unit_id")
    _drop_fk_constraints_for_column("borrow_request_events", "borrow_id")
    _drop_fk_constraints_for_column("borrow_participants", "borrow_id")
    _drop_fk_constraints_for_column("borrow_participants", "user_id")
    _drop_fk_constraints_for_column("borrower_sessions", "borrower_id")
    _drop_fk_constraints_for_column("warehouse_approvals", "borrow_id")
    _drop_fk_constraints_for_column("requested_items", "requested_by")
    _drop_fk_constraints_for_column("requested_items", "borrow_id")

    # Drop denormalized actor string columns from borrow request units.
    op.drop_column("borrow_request_units", "requested_by_user_id")
    op.drop_column("borrow_request_units", "requested_by_employee_id")
    op.drop_column("borrow_request_units", "approved_by_user_id")
    op.drop_column("borrow_request_units", "approved_by_employee_id")
    op.drop_column("borrow_request_units", "assigned_by_user_id")
    op.drop_column("borrow_request_units", "assigned_by_employee_id")
    op.drop_column("borrow_request_units", "released_by_user_id")
    op.drop_column("borrow_request_units", "released_by_employee_id")
    op.drop_column("borrow_request_units", "returned_by_user_id")
    op.drop_column("borrow_request_units", "returned_by_employee_id")

    # Drop denormalized actor employee field from request events.
    op.drop_column("borrow_request_events", "actor_employee_id")

    # Add canonical backup actor FK.
    op.add_column("backup_runs", sa.Column("user_uuid", sa.Uuid(), nullable=True))
    op.create_index("ix_backup_runs_user_uuid", "backup_runs", ["user_uuid"], unique=False)
    op.create_foreign_key(
        "fk_backup_runs_user_uuid_users_id",
        "backup_runs",
        "users",
        ["user_uuid"],
        ["id"],
    )
    op.execute(
        """
        UPDATE backup_runs
        SET user_uuid = triggered_by
        WHERE user_uuid IS NULL
          AND triggered_by IS NOT NULL
        """
    )

    # Ensure audit_logs.actor_id is constrained to users.id.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_audit_logs_actor_id_users_id'
            ) THEN
                ALTER TABLE public.audit_logs
                ADD CONSTRAINT fk_audit_logs_actor_id_users_id
                FOREIGN KEY (actor_id) REFERENCES public.users(id);
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_audit_logs_actor_id_users_id'
            ) THEN
                ALTER TABLE public.audit_logs
                DROP CONSTRAINT fk_audit_logs_actor_id_users_id;
            END IF;
        END
        $$;
        """
    )

    op.drop_constraint("fk_backup_runs_user_uuid_users_id", "backup_runs", type_="foreignkey")
    op.drop_index("ix_backup_runs_user_uuid", table_name="backup_runs")
    op.drop_column("backup_runs", "user_uuid")

    op.add_column("borrow_request_events", sa.Column("actor_employee_id", sa.String(length=50), nullable=True))

    op.add_column("borrow_request_units", sa.Column("returned_by_employee_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("returned_by_user_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("released_by_employee_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("released_by_user_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("assigned_by_employee_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("assigned_by_user_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("approved_by_employee_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("approved_by_user_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("requested_by_employee_id", sa.String(length=50), nullable=True))
    op.add_column("borrow_request_units", sa.Column("requested_by_user_id", sa.String(length=50), nullable=True))
