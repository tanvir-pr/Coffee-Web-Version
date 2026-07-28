"""Add role column to users and seed local owner/customer."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_user_role"
down_revision: str | None = "0006_password_google"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(16), nullable=False, server_default="customer"),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
