"""add authenticator two-factor tables

Revision ID: c3d7f8a9e2b1
Revises: a4d9f0c2b6e1
Create Date: 2026-04-03 13:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d7f8a9e2b1"
down_revision: Union[str, Sequence[str], None] = "a4d9f0c2b6e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_two_factor_credentials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("retention_tags", sa.JSON(), nullable=True),
        sa.Column("user_uuid", sa.Uuid(), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=True),
        sa.Column("pending_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_uuid"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_user_two_factor_credentials_is_archived",
        "user_two_factor_credentials",
        ["is_archived"],
        unique=False,
    )
    op.create_index(
        "ix_user_two_factor_credentials_is_enabled",
        "user_two_factor_credentials",
        ["is_enabled"],
        unique=False,
    )
    op.create_index(
        "ix_user_two_factor_credentials_user_uuid",
        "user_two_factor_credentials",
        ["user_uuid"],
        unique=True,
    )

    op.create_table(
        "auth_two_factor_challenges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("retention_tags", sa.JSON(), nullable=True),
        sa.Column("challenge_id", sa.String(length=128), nullable=False),
        sa.Column("user_uuid", sa.Uuid(), nullable=False),
        sa.Column("device_id", sa.String(length=100), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("is_consumed", sa.Boolean(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("failure_count", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_uuid"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_auth_two_factor_challenges_challenge_id",
        "auth_two_factor_challenges",
        ["challenge_id"],
        unique=True,
    )
    op.create_index(
        "ix_auth_two_factor_challenges_is_archived",
        "auth_two_factor_challenges",
        ["is_archived"],
        unique=False,
    )
    op.create_index(
        "ix_auth_two_factor_challenges_is_consumed",
        "auth_two_factor_challenges",
        ["is_consumed"],
        unique=False,
    )
    op.create_index(
        "ix_auth_two_factor_challenges_user_uuid",
        "auth_two_factor_challenges",
        ["user_uuid"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_auth_two_factor_challenges_user_uuid", table_name="auth_two_factor_challenges")
    op.drop_index("ix_auth_two_factor_challenges_is_consumed", table_name="auth_two_factor_challenges")
    op.drop_index("ix_auth_two_factor_challenges_is_archived", table_name="auth_two_factor_challenges")
    op.drop_index("ix_auth_two_factor_challenges_challenge_id", table_name="auth_two_factor_challenges")
    op.drop_table("auth_two_factor_challenges")

    op.drop_index("ix_user_two_factor_credentials_user_uuid", table_name="user_two_factor_credentials")
    op.drop_index("ix_user_two_factor_credentials_is_enabled", table_name="user_two_factor_credentials")
    op.drop_index("ix_user_two_factor_credentials_is_archived", table_name="user_two_factor_credentials")
    op.drop_table("user_two_factor_credentials")
