"""Script thực thi migrate schema (bảng brands & brand_id) và chạy toàn bộ file seed vào PostgreSQL."""

from __future__ import annotations

import sys
from pathlib import Path

# Đảm bảo import được module db
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from db.config import get_connection

SEED_DIR = Path(__file__).resolve().parent
SCHEMA_FILE = SEED_DIR.parent / "schema.sql"

SEED_FILES = [
    "01_categories.sql",
    "02_mice.sql",
    "03_keyboards.sql",
    "04_headphones.sql",
    "05_mousepads.sql",
    "06_setups.sql",
]

MIGRATION_SQL = """
-- 1. Đảm bảo bảng brands tồn tại
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Thêm cột brand_id vào bảng products (nếu chưa có)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

-- 3. Xóa cột brand dư thừa trong 5 bảng sản phẩm chi tiết
ALTER TABLE mice DROP COLUMN IF EXISTS brand CASCADE;
ALTER TABLE keyboards DROP COLUMN IF EXISTS brand CASCADE;
ALTER TABLE headphones DROP COLUMN IF EXISTS brand CASCADE;
ALTER TABLE mousepads DROP COLUMN IF EXISTS brand CASCADE;
ALTER TABLE setups DROP COLUMN IF EXISTS brand CASCADE;
"""


def run_seeds() -> None:
    """Thực thi migrate cấu trúc bảng brands và chạy lần lượt các file seed SQL."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        print("1. Đang kiểm tra & migrate cấu trúc Database (Tạo bảng brands, thêm brand_id, xóa cột brand ở bảng con)...")
        cur.execute(MIGRATION_SQL)
        if SCHEMA_FILE.exists():
            cur.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
        conn.commit()
        print("   -> Migrate cấu trúc bảng thành công!")

        print("\n2. Bắt đầu nạp seed dữ liệu vào database...")
        for filename in SEED_FILES:
            file_path = SEED_DIR / filename
            if not file_path.exists():
                print(f"  [bỏ qua] Không tìm thấy {filename}")
                continue

            print(f"  -> Đang thực thi {filename}...", end="", flush=True)
            sql = file_path.read_text(encoding="utf-8")
            cur.execute(sql)
            conn.commit()
            print(" XONG!")

        # Đặt ràng buộc NOT NULL cho brand_id sau khi đã seed đầy đủ 405 sản phẩm
        cur.execute("ALTER TABLE products ALTER COLUMN brand_id SET NOT NULL;")
        conn.commit()

        print("\n✅ Hoàn tất migrate và nạp seed dữ liệu thành công!")
        cur.close()
    except Exception as exc:
        conn.rollback()
        print(f"\n[Lỗi] Nạp seed thất bại: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_seeds()
