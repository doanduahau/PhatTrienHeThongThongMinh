"""Kiểm thử trực quan khối Tìm kiếm thông minh (SVM Intent + Regex Rules + Cá nhân hóa + Sản phẩm).

Tính năng:
    - Nhập câu string tìm kiếm tự do (hoặc qua argument --query).
    - Trả nhãn (Intent SVM: tim_kiem_san_pham / ngoai_pham_vi, độ tự tin %).
    - Trả query & điều kiện trích xuất (Ràng buộc cứng regex: giá, danh mục, kết nối... và soft tags: 42 thuộc tính).
    - Trả thông tin cá nhân hóa (Personalized K-Means / User profile) nếu cung cấp User ID.
    - Trả danh sách sản phẩm thực tế phù hợp từ Database Supabase (hoặc fallback bộ dữ liệu sản phẩm).

Cách chạy:
    # 1. Chế độ nhập tương tác trực quan:
    python svm_regex/test.py

    # 2. Truyền tham số câu query và user id trực tiếp:
    python svm_regex/test.py --query "tìm chuột không dây siêu nhẹ claw grip dưới 2 triệu"
    python svm_regex/test.py --query "chuột gaming dưới 1 triệu" --user 1
    python svm_regex/test.py --query "thời tiết hà nội hôm nay"
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from svm_regex.search_engine import SmartSearchEngine
from cosine_kmeans.model import PersonalizedRecommender
from cosine.model import SimilarProductsRecommender


def format_vnd(amount: float) -> str:
    """Format tiền VNĐ dễ đọc."""
    return f"{int(amount):,} đ".replace(",", ".")


def get_personalized_info(user_id: str | int | None) -> dict[str, Any] | None:
    """Lấy thông tin phân cụm và gợi ý sở thích cá nhân của User (nếu có)."""
    if not user_id:
        return None

    uid_str = str(user_id).strip()
    model_path = ROOT_DIR / "cosine_kmeans" / "personalized_model.joblib"
    if not model_path.exists():
        return {"user_id": uid_str, "status": "Chưa có model KMeans"}

    rec = PersonalizedRecommender.load(model_path)
    cluster = rec.user_clusters.get(uid_str)
    
    cluster_desc = {
        0: "Gamer (Ưu tiên chuột siêu nhẹ, sensor cao, switch quang học/rapid trigger)",
        1: "Văn phòng / Setup tối giản (Ưu tiên công thái học, phím êm silent, pin trâu)",
        2: "Audiophile / Creator (Ưu tiên tai nghe chất âm tốt, cách âm ANC, mic đàm thoại)",
    }

    info: dict[str, Any] = {
        "user_id": uid_str,
        "cluster_id": cluster,
        "persona": cluster_desc.get(cluster, f"Cụm sở thích #{cluster}") if cluster is not None else "Cold-start (Người dùng mới / Chưa có lịch sử)",
        "has_history": cluster is not None,
    }

    if cluster is not None:
        top_recs = rec.recommend(uid_str, top_n=3)
        info["sample_favorites"] = [
            f"[ID {r['product_id']}] {r['name']} ({format_vnd(r['price'])})"
            for r in top_recs
        ]
    return info


def test_smart_search_visual(
    query: str,
    user_id: str | int | None = None,
    top_products: int = 10,
) -> None:
    """Kiểm thử trực quan toàn diện theo câu nhập:
    1. Trả nhãn (Intent SVM)
    2. Trả query & điều kiện trích xuất (Regex constraints & soft tags)
    3. Trả cá nhân hóa (nếu có User ID)
    4. Trả các sản phẩm phù hợp thực tế.
    """
    engine = SmartSearchEngine()

    print("\n" + "═" * 75)
    print(" 🔎 KIỂM THỬ TRỰC QUAN TÌM KIẾM THÔNG MINH (SVM + REGEX + DB)")
    print("═" * 75)
    print(f"📥 Chuỗi nhập vào (Input String): \"{query}\"")
    if user_id:
        print(f"👤 Người dùng ngữ cảnh (User ID): {user_id}")
    print("─" * 75)

    # 1. Xử lý qua bộ NLP SmartSearchEngine
    analysis = engine.process_query(query)
    intent = analysis["intent"]
    confidence = analysis["confidence"]
    should_query = analysis["should_query_db"]
    hard_rules = analysis["hard_constraints"]
    soft_tags = analysis["soft_tags"]

    # 2. HIỂN THỊ PHẦN 1: TRẢ NHÃN (INTENT)
    print("\n🏷️  [1] TRẢ NHÃN Ý ĐỊNH (INTENT CLASSIFICATION):")
    if intent == "tim_kiem_san_pham":
        print(f"   • Nhãn (Label)        : \033[92m{intent}\033[0m (Tìm kiếm sản phẩm - In-domain)")
    else:
        print(f"   • Nhãn (Label)        : \033[91m{intent}\033[0m (Ngoài phạm vi hệ thống - Out-of-domain)")
    print(f"   • Độ tự tin (Score)   : {confidence * 100:.2f}%")
    print(f"   • Kích hoạt tìm SP    : {'CÓ (Cho phép truy vấn dữ liệu sản phẩm)' if should_query else 'KHÔNG (Bỏ qua, không gọi DB)'}")

    # 3. HIỂN THỊ PHẦN 2: TRẢ QUERY & ĐIỀU KIỆN TRÍCH XUẤT (PARSED QUERY & SQL QUERY)
    print("\n⚙️  [2] TRẢ QUERY & RÀNG BUỘC BÓC TÁCH (PARSED QUERY & SQL):")
    active_constraints = {k: v for k, v in hard_rules.items() if v not in (None, False, [])}
    
    print(f"   • Chuỗi chuẩn hóa     : \"{analysis['query']}\"")
    if active_constraints:
        print("   • Ràng buộc cứng (Hard rules):")
        for k, v in active_constraints.items():
            if k == "max_price":
                print(f"     - Giá tối đa (max_price)  : {format_vnd(v)}")
            elif k == "min_price":
                print(f"     - Giá tối thiểu (min_price): {format_vnd(v)}")
            elif k == "max_weight_g":
                print(f"     - Khối lượng tối đa       : {v}g")
            elif k == "brand":
                print(f"     - Thương hiệu (brand)     : {v}")
            elif k == "brands":
                print(f"     - Danh sách hãng (brands) : {v}")
            else:
                print(f"     - {k}: {v}")
    else:
        print("   • Ràng buộc cứng (Hard rules): (Không có)")

    if soft_tags:
        print(f"   • Thuộc tính mềm (Soft tags) : {soft_tags}")
    else:
        print("   • Thuộc tính mềm (Soft tags) : (Không phát hiện)")

    # In câu SQL Query thực tế được sinh ra để kiểm tra
    if should_query:
        from db.repository import build_smart_search_sql
        _, _, readable_sql = build_smart_search_sql(hard_rules, soft_tags, raw_query=query, limit=top_products)
        print("   • Câu lệnh SQL Query sinh ra để truy vấn DB:")
        print("     ┌" + "─" * 68)
        for line in readable_sql.splitlines():
            print(f"     │ \033[96m{line}\033[0m")
        print("     └" + "─" * 68)
    else:
        print("   • Câu lệnh SQL Query  : (Không sinh SQL vì câu nằm ngoài phạm vi tìm kiếm)")

    # 4. HIỂN THỊ PHẦN 3: TRẢ CÁ NHÂN HÓA (NẾU CÓ)
    print("\n👤 [3] TRẢ THÔNG TIN CÁ NHÂN HÓA (PERSONALIZED CONTEXT):")
    user_info = get_personalized_info(user_id)
    if user_info:
        print(f"   • User ID             : {user_info['user_id']}")
        print(f"   • Phân khúc sở thích  : {user_info['persona']}")
        if user_info.get("sample_favorites"):
            print("   • Sản phẩm gắn với gu :")
            for fav in user_info["sample_favorites"]:
                print(f"     + {fav}")
    else:
        print("   • Chưa truyền User ID (Đang tìm kiếm dưới góc nhìn khách vãng lai - Guest).")
        print("     (Mẹo: Nhập User ID ví dụ 1, 85, 145 để cá nhân hóa kết quả)")

    # 5. HIỂN THỊ PHẦN 4: TRẢ CÁC SẢN PHẨM PHÙ HỢP
    print(f"\n📦 [4] TRẢ CÁC SẢN PHẨM PHÙ HỢP (TOP {top_products} KẾT QUẢ TÌM KIẾM):")
    if not should_query:
        print("   ⛔ Câu truy vấn ngoài phạm vi sản phẩm máy tính nên không trả về sản phẩm nào.")
        print("═" * 75 + "\n")
        return

    # Thực hiện truy vấn vào database (hoặc fallback sang cosine.csv nếu offline)
    products: list[dict[str, Any]] = []
    source_used = "PostgreSQL Supabase"
    try:
        search_res = engine.search_in_db(query, limit=top_products)
        products = search_res.get("products", [])
    except Exception as e:
        source_used = "Offline Dataset (data/cosine.csv fallback)"
        # Fallback đọc từ data/cosine.csv
        try:
            csv_path = ROOT_DIR / "data" / "cosine.csv"
            import pandas as pd
            df = pd.read_csv(csv_path)
            # Lọc sơ bộ theo danh mục nếu có
            cat = hard_rules.get("category")
            if cat:
                cat_map = {"chuot": "Chuột", "ban_phim": "Bàn phím", "tai_nghe": "Tai nghe", "lot_chuot": "Lót chuột"}
                mapped = cat_map.get(cat, "")
                if mapped:
                    df = df[df["category"].str.contains(mapped, case=False, na=False)]
            brands = hard_rules.get("brands", [])
            if brands:
                pattern_b = "|".join(brands)
                df = df[df["brand"].str.contains(pattern_b, case=False, na=False) | df["name"].str.contains(pattern_b, case=False, na=False)]
            max_p = hard_rules.get("max_price")
            if max_p:
                df = df[df["price"] <= max_p]
            min_p = hard_rules.get("min_price")
            if min_p:
                df = df[df["price"] >= min_p]
            for _, r in df.head(top_products).iterrows():
                products.append({
                    "id": r["product_id"],
                    "name": r["name"],
                    "brand": r.get("brand", ""),
                    "category_name": r.get("category", ""),
                    "price": float(r.get("price", 0)),
                    "rating": float(r.get("rating", 5.0)),
                    "connectivity": r.get("specs", ""),
                })
        except Exception:
            products = []

    print(f"   (Nguồn dữ liệu: {source_used} | Tìm thấy: {len(products)} sản phẩm)")
    if not products:
        print("   🔍 Không tìm thấy sản phẩm nào khớp hoàn toàn với toàn bộ ràng buộc trên.")
        print("      (Gợi ý: Thử nới lỏng mức giá hoặc bớt từ khóa quá hẹp)")
    else:
        for idx, p in enumerate(products, start=1):
            pid = p.get("id") or p.get("product_id")
            name = p.get("name", "N/A")
            brand = p.get("brand", "N/A")
            cat_name = p.get("category_name", p.get("category", "N/A"))
            price_str = format_vnd(p.get("price", 0))
            rating = p.get("rating", 0)
            conn = p.get("connectivity", "")
            conn_info = f" | Kết nối: {conn}" if conn else ""

            print(f"   {idx}. [ID {pid}] \033[1m{name}\033[0m")
            print(f"      • Hãng: {brand} | Danh mục: {cat_name} | Giá: \033[93m{price_str}\033[0m | Đánh giá: {rating}⭐{conn_info}")

    print("═" * 75 + "\n")


def run_interactive_search() -> None:
    """Giao diện dòng lệnh trực quan cho phép nhập câu string liên tục."""
    print("\n" + "🚀 " * 15)
    print(" TRÌNH KIỂM THỬ TRỰC QUAN SVM_REGEX (SMART SEARCH ENGINE)")
    print(" Nhập chuỗi string tìm kiếm tự do để xem: Nhãn -> Ràng buộc -> Cá nhân -> Sản phẩm")
    print(" Gõ 'exit' hoặc 'quit' để thoát.")
    print("🚀 " * 15)

    default_queries = [
        "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu",
        "bàn phím cơ red switch hotswap dưới 1tr5",
        "tai nghe gaming có mic chống ồn",
        "thời tiết hôm nay thế nào",
    ]
    print("\n💡 Gợi ý câu mẫu để test nhanh:")
    for i, q in enumerate(default_queries, 1):
        print(f"   {i}. \"{q}\"")

    while True:
        try:
            print("\n" + "-" * 60)
            query = input("👉 Nhập chuỗi tìm kiếm (hoặc số 1-4, Enter để dùng mẫu [1]): ").strip()
            if query.lower() in ("exit", "quit", "0"):
                print("Tạm biệt! 👋")
                break

            if query == "1":
                query = default_queries[0]
            elif query == "2":
                query = default_queries[1]
            elif query == "3":
                query = default_queries[2]
            elif query == "4":
                query = default_queries[3]
            elif not query:
                query = default_queries[0]

            user_input = input("👉 Nhập User ID (tùy chọn, ví dụ: 1 [Gamer], 85 [Office], Enter để bỏ qua): ").strip()
            user_id = user_input if user_input else None

            test_smart_search_visual(query=query, user_id=user_id)
        except (KeyboardInterrupt, EOFError):
            print("\nTạm biệt! 👋")
            break


def test_smart_search(
    query: str = "tìm chuột không dây siêu nhẹ claw grip dưới 2 triệu",
    user_id: str | int | None = None,
    top_products: int = 10,
) -> None:
    """Wrapper tương thích ngược với test suite."""
    test_smart_search_visual(query=query, user_id=user_id, top_products=top_products)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm thử trực quan tìm kiếm thông minh (SVM + Regex)")
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Chuỗi string tìm kiếm",
    )
    parser.add_argument(
        "--user",
        type=str,
        default=None,
        help="User ID để kiểm tra thông tin cá nhân hóa (ví dụ: 1, 85, 145)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="Số lượng sản phẩm muốn hiển thị (mặc định: 10)",
    )
    args = parser.parse_args()

    if args.query:
        test_smart_search_visual(query=args.query, user_id=args.user, top_products=args.top)
    else:
        # Mặc định bật chế độ nhập tương tác trực quan
        run_interactive_search()


if __name__ == "__main__":
    main()
