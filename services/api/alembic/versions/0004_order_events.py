"""Append-only order stage events."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_order_events"
down_revision: str | None = "0003_orders"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "order_events",
        sa.Column("id", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("reason", sa.String(200), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_order_events_order_id", "order_events", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_order_events_order_id", table_name="order_events")
    op.drop_table("order_events")
