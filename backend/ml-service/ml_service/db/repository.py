"""Lớp Repository tương tác trực tiếp với Database PostgreSQL (Supabase).

Cung cấp các hàm truy vấn chuẩn hóa cho cả 5 thuật toán:
1. fetch_master_products_df(): Truy vấn toàn bộ 405 sản phẩm JOIN với 5 bảng chi tiết.
2. fetch_order_transactions(): Truy vấn lịch sử giao dịch từ order_items và cart_items cho FP-Growth.
3. fetch_user_interactions(): Truy vấn hành vi người dùng (mua, giỏ hàng) cho K-Means + Cosine.
4. search_products_by_filter(): Truy vấn động theo điều kiện Regex/Intent từ Smart Search.
5. fetch_featured_products_df(): Truy vấn sản phẩm theo Rating và Lượt bán cho Rating Baseline.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from .config import get_cursor

# Ánh xạ khóa danh mục do Regex bóc tách sang slug thật trong bảng categories.
# Dùng slug thay vì ID cứng để không lệch khi dữ liệu được seed lại.
CATEGORY_MAP_VI_TO_SLUG = {
    "chuot": "chuot",
    "mouse": "chuot",
    "tai_nghe": "tai-nghe",
    "headphone": "tai-nghe",
    "soundcard": "soundcard",
    "ban_phim": "ban-phim",
    "keyboard": "ban-phim",
    "ghe": "ghe",
    "chair": "ghe",
    "ban": "ban",
    "desk": "ban",
    "arm": "arm-man-hinh",
    "phu_kien": "phu-kien-cong-thai-hoc",
    "lot_chuot": "lot-chuot",
    "mousepad": "lot-chuot",
}


def fetch_master_products_df() -> pd.DataFrame:
    """Truy vấn bảng sản phẩm tổng hợp JOIN đầy đủ với categories, brands và các bảng chi tiết kỹ thuật."""
    sql = """
        SELECT 
            p.id as product_id,
            p.name,
            c.id as category_id,
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
    """Truy vấn lịch sử tương tác người dùng từ đơn hàng và giỏ hàng cho Cosine + K-Means."""
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

    df = pd.DataFrame(records)
    if df.empty:
        df = pd.DataFrame(columns=["user_id", "product_id", "interaction_type", "weight"])
    return df


def build_smart_search_sql(
    hard_constraints: dict[str, Any],
    soft_tags: list[str],
    raw_query: str = "",
    limit: int = 20,
) -> tuple[str, list[Any], str]:
    """Xây dựng câu truy vấn SQL động, danh sách tham số và bản SQL hiển thị trực quan."""
    where_clauses = ["1=1"]
    params: list[Any] = []

    # 1. Danh mục sản phẩm
    categories = hard_constraints.get("categories", [])
    if categories:
        cat_slugs = [
            CATEGORY_MAP_VI_TO_SLUG[c]
            for c in categories
            if c in CATEGORY_MAP_VI_TO_SLUG
        ]
        if cat_slugs:
            where_clauses.append(f"c.slug IN ({','.join(['%s']*len(cat_slugs))})")
            params.extend(cat_slugs)

    # 2. Thương hiệu (Brand)
    brands = hard_constraints.get("brands", [])
    if brands:
        brand_conds = []
        for b in brands:
            brand_conds.append("(b.name ILIKE %s OR p.name ILIKE %s)")
            params.extend([f"%{b}%", f"%{b}%"])
        where_clauses.append("(" + " OR ".join(brand_conds) + ")")

    # 2b. Từ khóa model cụ thể (Keyword)
    keyword = hard_constraints.get("keyword")
    if keyword:
        where_clauses.append("p.name ILIKE %s")
        params.append(f"%{keyword}%")

    # 3. Giá tiền
    min_price = hard_constraints.get("min_price")
    if min_price is not None and min_price > 0:
        where_clauses.append("p.price >= %s")
        params.append(min_price)

    max_price = hard_constraints.get("max_price")
    if max_price is not None and max_price > 0:
        where_clauses.append("p.price <= %s")
        params.append(max_price)

    # 4. Kết nối (wireless, wired, tri-mode)
    connectivities = hard_constraints.get("connectivity", [])
    if "wireless" in connectivities:
        where_clauses.append("(m.connectivity IN ('wireless', 'tri_mode') OR k.connectivity IN ('wireless', 'tri_mode') OR h.connectivity IN ('wireless_2.4g', 'bluetooth'))")
    elif "wired" in connectivities:
        where_clauses.append("(m.connectivity = 'wired' OR k.connectivity = 'wired' OR h.connectivity = 'wired_3.5mm')")

    # 5. Ràng buộc chuột
    max_weight = hard_constraints.get("max_weight_g")
    if max_weight:
        where_clauses.append("m.weight_g <= %s")
        params.append(max_weight)

    polling = hard_constraints.get("polling_rate_hz")
    if polling:
        where_clauses.append("(m.polling_rate_hz >= %s OR k.polling_rate_hz >= %s)")
        params.extend([polling, polling])

    # 6. Ràng buộc bàn phím
    if hard_constraints.get("hotswap"):
        where_clauses.append("k.has_hotswap = true")
    if hard_constraints.get("mac_support"):
        where_clauses.append("k.support_macos = true")

    # 7. Ràng buộc tai nghe
    if hard_constraints.get("has_mic"):
        where_clauses.append("h.has_mic = true")
    if hard_constraints.get("noise_cancelling"):
        where_clauses.append("h.has_anc = true")

    # 8. Áp dụng soft tags ánh xạ sang thuộc tính DB nếu có
    if "cong_thai_hoc" in soft_tags:
        where_clauses.append("m.hand_orientation = 'ergonomic'")
    elif "doi_xung" in soft_tags:
        where_clauses.append("m.hand_orientation = 'symmetrical'")

    if "sieu_nhe_under_60g" in soft_tags:
        where_clauses.append("m.weight_g < 60")

    if "rapid_trigger" in soft_tags:
        where_clauses.append("k.has_rapid_trigger = true")

    if "switch_linear" in soft_tags:
        where_clauses.append("(k.switch ILIKE '%%Red%%' OR k.switch ILIKE '%%Linear%%' OR k.switch ILIKE '%%Yellow%%' OR k.switch ILIKE '%%Silver%%' OR k.switch ILIKE '%%Magnetic%%')")
    elif "switch_tactile" in soft_tags:
        where_clauses.append("(k.switch ILIKE '%%Brown%%' OR k.switch ILIKE '%%Tactile%%' OR k.switch ILIKE '%%Banana%%' OR k.switch ILIKE '%%Purple%%')")
    elif "switch_clicky" in soft_tags:
        where_clauses.append("(k.switch ILIKE '%%Blue%%' OR k.switch ILIKE '%%Clicky%%' OR k.switch ILIKE '%%Green%%')")

    if "layout_compact" in soft_tags:
        where_clauses.append("k.layout IN ('60%%', '65%%', '75%%', 'TKL')")
    elif "fullsize_nhap_lieu_excel" in soft_tags:
        where_clauses.append("k.layout = 'Fullsize'")

    if "hot_swap" in soft_tags and not hard_constraints.get("hotswap"):
        where_clauses.append("k.has_hotswap = true")

    if "layout_mac_chuan" in soft_tags and not hard_constraints.get("mac_support"):
        where_clauses.append("k.support_macos = true")

    if "iem" in soft_tags:
        where_clauses.append("h.headphone_type = 'in_ear'")
    elif "tai_nghe_on_ear_nhe" in soft_tags:
        where_clauses.append("h.headphone_type = 'on_ear'")

    if "cach_am_tot" in soft_tags and not hard_constraints.get("noise_cancelling"):
        where_clauses.append("h.has_anc = true")

    if "mic_loc_on_dam_thoai_hop" in soft_tags and not hard_constraints.get("has_mic"):
        where_clauses.append("h.has_mic = true")

    if "tri_mode" in soft_tags and "wireless" not in connectivities:
        where_clauses.append("(m.connectivity = 'tri_mode' OR k.connectivity = 'tri_mode')")

    # 9. Nếu không có bất kỳ bộ lọc/thuộc tính nào khớp, tìm kiếm tự do theo từ khóa trong tên/hãng
    if len(where_clauses) == 1:
        clean_q = raw_query.strip()
        if clean_q:
            where_clauses.append("(p.name ILIKE %s OR b.name ILIKE %s)")
            params.extend([f"%{clean_q}%", f"%{clean_q}%"])
        else:
            where_clauses.append("1=0")

    where_sql = " AND ".join(where_clauses)
    sql = f"""SELECT 
    p.id, p.name, c.name AS category_name, b.id AS brand_id, b.name AS brand,
    p.price, p.rating, p.image_url, p.stock_quantity,
    COALESCE(m.connectivity, k.connectivity, h.connectivity) AS connectivity
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN brands b ON p.brand_id = b.id
LEFT JOIN mice m ON m.product_id = p.id
LEFT JOIN keyboards k ON k.product_id = p.id
LEFT JOIN headphones h ON h.product_id = p.id
LEFT JOIN mousepads mp ON mp.product_id = p.id
LEFT JOIN setups s ON s.product_id = p.id
WHERE {where_sql}
ORDER BY p.rating DESC, p.price ASC
LIMIT %s;"""
    params.append(limit)

    # Tạo câu SQL hiển thị trực quan đã điền sẵn giá trị tham số để dễ kiểm tra
    readable_sql = sql
    for p in params:
        val_str = f"'{p}'" if isinstance(p, str) else str(p)
        readable_sql = readable_sql.replace("%s", val_str, 1)
    readable_sql = readable_sql.replace("%%", "%")

    return sql, params, readable_sql


def execute_smart_search_db(
    hard_constraints: dict[str, Any],
    soft_tags: list[str],
    raw_query: str = "",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Truy vấn động bảng sản phẩm và các bảng con dựa trên ràng buộc bóc tách từ thanh tìm kiếm."""
    sql, params, _ = build_smart_search_sql(hard_constraints, soft_tags, raw_query=raw_query, limit=limit)

    results = []
    with get_cursor(commit=False) as cur:
        cur.execute(sql, tuple(params))
        cols = [d[0] for d in cur.description]
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            # Format số thực
            d["price"] = float(d["price"]) if d["price"] is not None else 0.0
            d["rating"] = float(d["rating"]) if d["rating"] is not None else 0.0
            results.append(d)

    return results


def fetch_featured_products_from_db(
    category_id: int | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Truy vấn sản phẩm xếp hạng theo rating và lượt bán trực tiếp từ PostgreSQL."""
    where_sql = "WHERE p.category_id = %s" if category_id else ""
    params = [category_id, limit] if category_id else [limit]

    sql = f"""
        SELECT 
            p.id as product_id,
            p.name,
            c.name as category,
            b.id as brand_id,
            b.name as brand,
            p.price,
            p.rating,
            p.image_url,
            COALESCE(SUM(oi.quantity), 0) as sold_count
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        {where_sql}
        GROUP BY p.id, c.name, b.id, b.name
        ORDER BY p.rating DESC, sold_count DESC
        LIMIT %s;
    """
    results = []
    with get_cursor(commit=False) as cur:
        cur.execute(sql, tuple(params))
        cols = [d[0] for d in cur.description]
        for rank, row in enumerate(cur.fetchall(), start=1):
            d = dict(zip(cols, row))
            d["rank"] = rank
            d["price"] = float(d["price"]) if d["price"] is not None else 0.0
            d["rating"] = float(d["rating"]) if d["rating"] is not None else 0.0
            d["sold_count"] = int(d["sold_count"])
            results.append(d)

    return results
