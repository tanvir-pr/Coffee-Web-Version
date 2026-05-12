"""Catalog tables for stores, categories, and menu items."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_catalog"
down_revision: str | None = "0001_empty"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("prep_minutes", sa.Integer(), nullable=False),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("sort_morning", sa.Integer(), nullable=False),
        sa.Column("sort_afternoon", sa.Integer(), nullable=False),
        sa.Column("sort_night", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("description", sa.String(240), nullable=False),
        sa.Column("prices", sa.JSON(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("allergens", sa.JSON(), nullable=False),
        sa.Column("kcal", sa.Integer(), nullable=True),
        sa.Column("caffeine_mg", sa.Integer(), nullable=True),
        sa.Column("sort", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "product_store",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("available", sa.Boolean(), nullable=False),
        sa.Column("price_override", sa.Numeric(10, 2), nullable=True),
        sa.UniqueConstraint("product_id", "store_id"),
    )


def downgrade() -> None:
    op.drop_table("product_store")
    op.drop_table("products")
    op.drop_table("categories")
    op.drop_table("stores")
