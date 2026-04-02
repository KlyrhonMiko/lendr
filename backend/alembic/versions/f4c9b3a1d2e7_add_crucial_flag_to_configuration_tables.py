"""add crucial flag to configuration tables

Revision ID: f4c9b3a1d2e7
Revises: d9e2b4c7a1f0
Create Date: 2026-04-03 00:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4c9b3a1d2e7"
down_revision: Union[str, Sequence[str], None] = "d9e2b4c7a1f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONFIG_TABLES: tuple[str, ...] = (
    "admin_configurations",
    "auth_configurations",
    "inventory_configurations",
    "borrower_configurations",
)


def upgrade() -> None:
    """Upgrade schema."""
    for table in CONFIG_TABLES:
        op.add_column(
            table,
            sa.Column("crucial", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    for table in CONFIG_TABLES:
        op.create_check_constraint(
            f"ck_{table}_crucial_not_deleted",
            table,
            "NOT (crucial AND is_deleted)",
        )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_crucial_configuration_rows()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                IF OLD.crucial IS TRUE AND NEW.crucial IS FALSE THEN
                    RAISE EXCEPTION 'Cannot downgrade crucial configuration row (table=%).', TG_TABLE_NAME;
                END IF;

                IF OLD.crucial IS TRUE AND NEW.is_deleted IS TRUE THEN
                    RAISE EXCEPTION
                        'Cannot delete crucial configuration row (table=%, key=%, category=%).',
                        TG_TABLE_NAME,
                        OLD.key,
                        OLD.category;
                END IF;

                RETURN NEW;
            END IF;

            IF TG_OP = 'DELETE' THEN
                IF OLD.crucial IS TRUE THEN
                    RAISE EXCEPTION
                        'Cannot hard-delete crucial configuration row (table=%, key=%, category=%).',
                        TG_TABLE_NAME,
                        OLD.key,
                        OLD.category;
                END IF;

                RETURN OLD;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    for table in CONFIG_TABLES:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_protect_crucial
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION protect_crucial_configuration_rows();
            """
        )


def downgrade() -> None:
    """Downgrade schema."""
    for table in CONFIG_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_protect_crucial ON {table};")

    op.execute("DROP FUNCTION IF EXISTS protect_crucial_configuration_rows();")

    for table in CONFIG_TABLES:
        op.drop_constraint(f"ck_{table}_crucial_not_deleted", table, type_="check")

    for table in CONFIG_TABLES:
        op.drop_column(table, "crucial")
