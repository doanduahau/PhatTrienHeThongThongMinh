"""Module quản lý cơ sở dữ liệu PostgreSQL (Supabase)."""

from .config import (
    DATABASE_URL,
    DB_CONFIG,
    get_connection,
    get_cursor,
    test_connection,
)
from .repository import (
    CATEGORY_MAP_VI_TO_ID,
    execute_smart_search_db,
    fetch_featured_products_from_db,
    fetch_master_products_df,
    fetch_order_transactions,
    fetch_user_interactions,
)

__all__ = [
    "CATEGORY_MAP_VI_TO_ID",
    "DATABASE_URL",
    "DB_CONFIG",
    "execute_smart_search_db",
    "fetch_featured_products_from_db",
    "fetch_master_products_df",
    "fetch_order_transactions",
    "fetch_user_interactions",
    "get_connection",
    "get_cursor",
    "test_connection",
]
