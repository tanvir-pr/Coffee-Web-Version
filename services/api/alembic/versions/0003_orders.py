"""Orders, payments, and store tax."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_orders"
down_revision: str | None = "0002_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "stores",
        sa.Column("tax_rate", sa.Numeric(6, 4), nullable=False, server_default="0.0800"),
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("guest_id", sa.String(36), nullable=False),
        sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("code", sa.String(8), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("fulfilment", sa.String(16), nullable=False),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount", sa.Numeric(10, 2), nullable=False),
        sa.Column("tip", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax", sa.Numeric(10, 2), nullable=False),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("payment_method", sa.String(16), nullable=False),
        sa.Column("payment_status", sa.String(16), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("contact_name", sa.String(80), nullable=False),
        sa.Column("contact_phone", sa.String(32), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("code"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_orders_guest_id", "orders", ["guest_id"])
    op.create_table(
        "order_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("product_slug", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("size", sa.String(1), nullable=False),
        sa.Column("milk", sa.String(16), nullable=False),
        sa.Column("temp", sa.String(8), nullable=False),
        sa.Column("sugar", sa.Integer(), nullable=False),
        sa.Column("shots", sa.Integer(), nullable=False),
        sa.Column("syrups", sa.JSON(), nullable=False),
        sa.Column("foam", sa.Boolean(), nullable=False),
        sa.Column("art", sa.String(16), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
    )
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("provider_intent_id", sa.String(80), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("client_secret", sa.String(255), nullable=True),
        sa.UniqueConstraint("provider_intent_id"),
    )
    op.create_table(
        "webhook_events",
        sa.Column("event_id", sa.String(80), primary_key=True),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("webhook_events")
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_index("ix_orders_guest_id", table_name="orders")
    op.drop_table("orders")
    op.drop_column("stores", "tax_rate")
