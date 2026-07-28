"""Password hash and Google auth provider on users."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_password_google"
down_revision: str | None = "0005_members"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(24), nullable=False, server_default="email"),
    )


def downgrade() -> None:
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "password_hash")
