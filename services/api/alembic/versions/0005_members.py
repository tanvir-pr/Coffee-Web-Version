"""Members, loyalty, store hours, and reservations."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_members"
down_revision: str | None = "0004_order_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stores", sa.Column("address", sa.String(200), nullable=True))
    op.add_column("stores", sa.Column("phone", sa.String(32), nullable=True))
    op.add_column("stores", sa.Column("lat", sa.Numeric(9, 6), nullable=True))
    op.add_column("stores", sa.Column("lng", sa.Numeric(9, 6), nullable=True))
    op.add_column(
        "stores",
        sa.Column("amenities", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "stores",
        sa.Column("slot_capacity", sa.Integer(), nullable=False, server_default="4"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column("orders", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_orders_user_id", "orders", "users", ["user_id"], ["id"])
    op.add_column("orders", sa.Column("slot_start", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "magic_links",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_magic_links_email", "magic_links", ["email"])
    op.create_table(
        "passkeys",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("credential_id", sa.String(512), nullable=False, unique=True),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column("sign_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "webauthn_challenges",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("challenge", sa.String(256), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "store_hours",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("opens", sa.String(5), nullable=False),
        sa.Column("closes", sa.String(5), nullable=False),
        sa.Column("closed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("store_id", "weekday"),
    )
    op.create_table(
        "store_exceptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("on_date", sa.Date(), nullable=False),
        sa.Column("opens", sa.String(5), nullable=True),
        sa.Column("closes", sa.String(5), nullable=True),
        sa.Column("closed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("label", sa.String(80), nullable=False),
        sa.UniqueConstraint("store_id", "on_date"),
    )
    op.create_table(
        "loyalty_ledger",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("order_item_id", sa.Uuid(), nullable=True, unique=True),
        sa.Column("stamps_delta", sa.Integer(), nullable=False),
        sa.Column("points_delta", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_loyalty_ledger_user_id", "loyalty_ledger", ["user_id"])
    op.create_table(
        "rewards",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_rewards_user_id", "rewards", ["user_id"])
    op.create_table(
        "reservations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("party", sa.Integer(), nullable=False),
        sa.Column("area", sa.String(16), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("contact_name", sa.String(80), nullable=False),
        sa.Column("contact_phone", sa.String(32), nullable=True),
        sa.Column("notes", sa.String(200), nullable=True),
        sa.Column("cancel_token", sa.String(64), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("reservations")
    op.drop_index("ix_rewards_user_id", table_name="rewards")
    op.drop_table("rewards")
    op.drop_index("ix_loyalty_ledger_user_id", table_name="loyalty_ledger")
    op.drop_table("loyalty_ledger")
    op.drop_table("store_exceptions")
    op.drop_table("store_hours")
    op.drop_table("webauthn_challenges")
    op.drop_table("passkeys")
    op.drop_index("ix_magic_links_email", table_name="magic_links")
    op.drop_table("magic_links")
    op.drop_column("orders", "slot_start")
    op.drop_constraint("fk_orders_user_id", "orders", type_="foreignkey")
    op.drop_column("orders", "user_id")
    op.drop_table("users")
    op.drop_column("stores", "slot_capacity")
    op.drop_column("stores", "amenities")
    op.drop_column("stores", "lng")
    op.drop_column("stores", "lat")
    op.drop_column("stores", "phone")
    op.drop_column("stores", "address")
