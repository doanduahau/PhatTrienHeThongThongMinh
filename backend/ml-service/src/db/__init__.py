"""Module quản lý cơ sở dữ liệu PostgreSQL (Supabase)."""

from .config import (
    DATABASE_URL,
    DB_CONFIG,
    get_connection,
    get_cursor,
    test_connection,
)
from .repository import (
    fetch_featured_products_df,
    fetch_master_products_df,
    fetch_order_transactions,
    fetch_user_interactions,
)

__all__ = [
    "DATABASE_URL",
    "DB_CONFIG",
    "fetch_featured_products_df",
    "fetch_master_products_df",
    "fetch_order_transactions",
    "fetch_user_interactions",
    "get_connection",
    "get_cursor",
    "test_connection",
]
