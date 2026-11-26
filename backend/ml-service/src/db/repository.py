"""Lớp Repository tương tác trực tiếp với Database PostgreSQL (Supabase).

Cung cấp các truy vấn đọc dữ liệu phục vụ train và xếp hạng:
1. fetch_master_products_df(): Truy vấn toàn bộ 405 sản phẩm JOIN với 5 bảng chi tiết.
2. fetch_order_transactions(): Truy vấn lịch sử giao dịch từ order_items và cart_items cho FP-Growth.
3. fetch_user_interactions(): Truy vấn hành vi người dùng (mua, giỏ hàng) cho K-Means + Cosine.
4. fetch_featured_products_df(): Tổng hợp bốn đặc trưng cho cây quyết định sản phẩm nổi bật.

Smart Search chỉ parse tại ML; business service truy vấn sản phẩm bằng Prisma.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from .config import get_cursor

def fetch_master_products_df() -> pd.DataFrame:
    """Truy vấn bảng sản phẩm tổng hợp JOIN đầy đủ với categories, brands và các bảng chi tiết kỹ thuật."""
    sql = """
        SELECT 
            p.id as product_id,
            p.name,
            c.id as category_id,
            c.slug as category_slug,
            c.name as category_name,
            b.id as brand_id,
            b.name as brand,
            p.price,
            p.rating,
            p.stock_quantity,
            p.color,
            p.image_url,
            COALESCE(m.connectivity, k.connectivity, h.connectivity) as connectivity,
            m.hand_orientation,
            m.weight_g,
            COALESCE(m.polling_rate_hz, k.polling_rate_hz) as polling_rate_hz,
            m.switch_type as mouse_switch,
            m.sensor,
            k.layout,
            k.has_rapid_trigger,
            k.has_hotswap,
            k.support_macos,
            k.switch as keyboard_switch,
            h.headphone_type,
            h.has_mic,
            h.has_anc,
            mp.pad_type,
            mp.mouse_control,
            mp.speed,
            mp.surface,
            mp.base,
            mp.size,
            s.setup_category,
            s.max_load_kg
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        LEFT JOIN mice m ON m.product_id = p.id
        LEFT JOIN keyboards k ON k.product_id = p.id
        LEFT JOIN headphones h ON h.product_id = p.id
        LEFT JOIN mousepads mp ON mp.product_id = p.id
        LEFT JOIN setups s ON s.product_id = p.id
        WHERE p.is_active
        ORDER BY p.id;
    """
    with get_cursor(commit=False) as cur:
        cur.execute(sql)
        cols = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        df = pd.DataFrame(rows, columns=cols)
        # Chuyển kiểu dữ liệu số
        if not df.empty:
            df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0)
            df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(0.0)
            df["product_id"] = df["product_id"].astype(str)
        return df


def fetch_order_transactions() -> list[list[str]]:
    """Truy vấn lịch sử đơn hàng và giỏ hàng gom theo giỏ/đơn cho FP-Growth."""
    transactions: list[list[str]] = []
    with get_cursor(commit=False) as cur:
        # 1. Đơn hàng thực tế
        cur.execute("""
            SELECT order_id, product_id 
            FROM order_items 
            ORDER BY order_id;
        """)
        rows = cur.fetchall()
        order_groups: dict[Any, list[str]] = {}
        for oid, pid in rows:
            order_groups.setdefault(oid, []).append(str(pid))
        transactions.extend(list(order_groups.values()))

        # 2. Giỏ hàng hiện tại (bổ sung giao dịch mua kèm tiềm năng)
        cur.execute("""
            SELECT cart_id, product_id 
            FROM cart_items 
            ORDER BY cart_id;
        """)
        cart_rows = cur.fetchall()
        cart_groups: dict[Any, list[str]] = {}
        for cid, pid in cart_rows:
            cart_groups.setdefault(cid, []).append(str(pid))
        transactions.extend(list(cart_groups.values()))

    return transactions


def fetch_user_interactions() -> pd.DataFrame:
    """Đọc đơn hàng, giỏ hàng và đánh giá tích cực cho Cosine + K-Means."""
    records = []
    with get_cursor(commit=False) as cur:
        # Hành vi mua (buy: trọng số 5.0)
        cur.execute("""
            SELECT o.user_id, oi.product_id, 'buy' as interaction_type, 5.0 as weight
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id;
        """)
        for u, p, itype, w in cur.fetchall():
            records.append({"user_id": str(u), "product_id": str(p), "interaction_type": itype, "weight": float(w)})

        # Hành vi thêm giỏ hàng (cart: trọng số 3.0)
        cur.execute("""
            SELECT c.user_id, ci.product_id, 'cart' as interaction_type, 3.0 as weight
            FROM carts c
            JOIN cart_items ci ON c.id = ci.cart_id;
        """)
        for u, p, itype, w in cur.fetchall():
            records.append({"user_id": str(u), "product_id": str(p), "interaction_type": itype, "weight": float(w)})

        cur.execute("""
            SELECT user_id, product_id, 'rating', score - 2.5
            FROM ratings
            WHERE score >= 4;
        """)
        for u, p, itype, w in cur.fetchall():
            records.append({"user_id": str(u), "product_id": str(p), "interaction_type": itype, "weight": float(w)})

    df = pd.DataFrame(records)
    if df.empty:
        df = pd.DataFrame(columns=["user_id", "product_id", "interaction_type", "weight"])
    return df


def fetch_featured_products_df(category_id: int | None = None) -> pd.DataFrame:
    """Điểm thực từ ratings; sức mua chỉ tính số lượng trong đơn đã giao.

    Không dùng sao seed trong products cho sản phẩm chưa có lượt chấm sao.
    Không ghi DB; cùng một cách tổng hợp được dùng khi train và dự đoán.
    """
    sql = """
        SELECT
            p.id as product_id,
            p.name,
            c.id as category_id,
            c.name as category_name,
            b.name as brand,
            p.price,
            p.stock_quantity,
            COALESCE(rv.rating, 0) as rating,
            COALESCE(rv.rating_count, 0) as rating_count,
            COALESCE(rv.positive_ratio, 0) as positive_ratio,
            COALESCE(sd.sold_count, 0) as sold_count
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        LEFT JOIN (
            SELECT product_id, AVG(score)::float as rating,
                   COUNT(*) as rating_count,
                   COUNT(*) FILTER (WHERE score >= 4)::float / COUNT(*) as positive_ratio
            FROM ratings
            GROUP BY product_id
        ) rv ON rv.product_id = p.id
        LEFT JOIN (
            SELECT oi.product_id, SUM(oi.quantity) as sold_count
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status = 'delivered'
            GROUP BY oi.product_id
        ) sd ON sd.product_id = p.id
        WHERE p.is_active
          AND (%(category_id)s::int IS NULL OR p.category_id = %(category_id)s::int)
        ORDER BY p.id;
    """
    with get_cursor(commit=False) as cur:
        cur.execute(sql, {"category_id": category_id})
        cols = [desc[0] for desc in cur.description]
        df = pd.DataFrame(cur.fetchall(), columns=cols)

    if not df.empty:
        for col in ("price", "stock_quantity", "rating", "rating_count", "positive_ratio", "sold_count"):
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        df["product_id"] = df["product_id"].astype(str)
    return df
