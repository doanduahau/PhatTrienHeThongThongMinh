"""Cấu hình và hàm tiện ích kết nối Cơ sở dữ liệu PostgreSQL (Supabase)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator
from urllib.parse import urlparse

import psycopg2
from psycopg2.extensions import connection as PgConnection
from psycopg2.extensions import cursor as PgCursor

# URL kết nối Supabase PostgreSQL mặc định
DEFAULT_DATABASE_URL = (
    "postgresql://postgres.blddqtyivejqeftabsix:Hoangdat1522@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
)

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# Phân tách các tham số kết nối từ URL
parsed_url = urlparse(DATABASE_URL)
DB_CONFIG: dict[str, Any] = {
    "host": parsed_url.hostname or "aws-0-ap-southeast-1.pooler.supabase.com",
    "port": parsed_url.port or 5432,
    "dbname": parsed_url.path.lstrip("/") or "postgres",
    "user": parsed_url.username or "postgres.blddqtyivejqeftabsix",
    "password": parsed_url.password or "Hoangdat1522",
    "sslmode": "require",
}


def get_connection() -> PgConnection:
    """Khởi tạo và trả về kết nối mới tới PostgreSQL."""
    return psycopg2.connect(DATABASE_URL)


@contextmanager
def get_cursor(commit: bool = True) -> Generator[PgCursor, None, None]:
    """Context manager tự động quản lý kết nối, cursor và commit/rollback.

    Ví dụ:
        with get_cursor() as cur:
            cur.execute("SELECT count(*) FROM products;")
            print(cur.fetchone()[0])
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def test_connection() -> dict[str, Any]:
    """Kiểm tra trạng thái kết nối tới cơ sở dữ liệu."""
    try:
        with get_cursor(commit=False) as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            cur.execute(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
            )
            table_count = cur.fetchone()[0]
            return {
                "status": "success",
                "message": "Kết nối thành công tới Supabase PostgreSQL!",
                "version": version,
                "public_tables_count": table_count,
                "host": DB_CONFIG["host"],
                "database": DB_CONFIG["dbname"],
            }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Không thể kết nối cơ sở dữ liệu: {exc}",
        }


if __name__ == "__main__":
    result = test_connection()
    print("=== KIỂM TRA KẾT NỐI DB ===")
    for k, v in result.items():
        print(f"  {k}: {v}")

