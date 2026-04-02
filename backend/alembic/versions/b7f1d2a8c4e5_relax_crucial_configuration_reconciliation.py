"""relax crucial configuration reconciliation

Revision ID: b7f1d2a8c4e5
Revises: f4c9b3a1d2e7
Create Date: 2026-04-03 01:10:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b7f1d2a8c4e5"
down_revision: Union[str, Sequence[str], None] = "f4c9b3a1d2e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_crucial_configuration_rows()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
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


def downgrade() -> None:
    """Downgrade schema."""
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