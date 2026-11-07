"""Cấu hình và hàm tiện ích kết nối PostgreSQL.

Credential KHÔNG được hardcode trong mã nguồn. ML service nên dùng một tài
khoản chỉ có quyền SELECT (ví dụ ``ml_reader``) và đọc URL từ ``.env``::

    DATABASE_URL=postgresql://ml_reader:mat_khau@host:5432/postgres?sslmode=require
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator
from urllib.parse import urlparse

import psycopg2
from psycopg2.extensions import connection as PgConnection
from psycopg2.extensions import cursor as PgCursor

# Import để ml_service.config nạp file .env trước khi đọc DATABASE_URL.
from ml_service.config import ROOT_DIR  # noqa: F401

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Thông tin hiển thị (không chứa mật khẩu), dùng cho log/health.
_parsed_url = urlparse(DATABASE_URL) if DATABASE_URL else None
DB_CONFIG: dict[str, Any] = {
    "host": _parsed_url.hostname if _parsed_url else None,
    "port": _parsed_url.port if _parsed_url else None,
    "dbname": _parsed_url.path.lstrip("/") if _parsed_url else None,
    "user": _parsed_url.username if _parsed_url else None,
}


def _require_database_url() -> str:
    if not DATABASE_URL:
        raise RuntimeError(
            "Chưa cấu hình DATABASE_URL. Hãy tạo backend/ml-service/.env "
            "(xem .env.example) với tài khoản PostgreSQL chỉ có quyền đọc."
        )
    return DATABASE_URL


def get_connection() -> PgConnection:
    """Khởi tạo và trả về kết nối mới tới PostgreSQL."""
    return psycopg2.connect(_require_database_url())


@contextmanager
def get_cursor(commit: bool = False) -> Generator[PgCursor, None, None]:
    """Context manager quản lý connection/cursor.

    Mặc định ``commit=False`` vì ML service chỉ đọc dữ liệu. Chỉ bật commit
    khi thực sự ghi (ví dụ script seed).
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
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
                "message": "Kết nối thành công tới PostgreSQL!",
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
