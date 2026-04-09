"""remove db-level crucial delete guards

Revision ID: c8f1d9a2e4b7
Revises: fb640816bdff
Create Date: 2026-04-09 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c8f1d9a2e4b7"
down_revision: Union[str, Sequence[str], None] = "fb640816bdff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONFIG_TABLES: tuple[str, ...] = (
    "admin_configurations",
    "auth_configurations",
    "inventory_configurations",
    "borrower_configurations",
)


def upgrade() -> None:
    """Allow direct SQL delete/update for crucial rows; app-layer guards remain."""
    for table in CONFIG_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_protect_crucial ON {table};")
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_crucial_not_deleted;")

    # Function is shared by all config table triggers.
    op.execute("DROP FUNCTION IF EXISTS protect_crucial_configuration_rows();")


def downgrade() -> None:
    """Restore DB-level protection for crucial rows."""
    for table in CONFIG_TABLES:
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_crucial_not_deleted CHECK (NOT (crucial AND is_deleted));"
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
