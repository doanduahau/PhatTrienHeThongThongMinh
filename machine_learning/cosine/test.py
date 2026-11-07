"""Kiểm thử trực quan gợi ý sản phẩm tương tự (Cosine Similarity).

Tính năng:
    - Nhập Product ID hoặc từ khóa tên sản phẩm (hoặc qua argument --id).
    - [1] Hiển thị hồ sơ sản phẩm gốc (Danh mục, Hãng, Giá, Specs, Tags).
    - [2] Phân tích đặc trưng вектор TF-IDF + Price Scaling.
    - [3] Trả danh sách Top sản phẩm tương đồng kèm:
          + Thanh điểm tương đồng trực quan (Similarity Bar %).
          + Giải thích lý do tương đồng (Cùng hãng, cùng danh mục, trùng tags kỹ thuật, chênh lệch giá).

Cách chạy:
    # 1. Chế độ nhập tương tác trực quan:
    python cosine/test.py

    # 2. Truyền tham số Product ID trực tiếp:
    python cosine/test.py --id 1
    python cosine/test.py --id 15 --top 5
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from cosine.model import SimilarProductsRecommender


def format_vnd(amount: float) -> str:
    """Format tiền VNĐ dễ đọc."""
    return f"{int(amount):,} đ".replace(",", ".")


def render_bar(score: float, width: int = 20) -> str:
    """Vẽ thanh tiến trình trực quan cho điểm số [0.0 -> 1.0]."""
    clamped = max(0.0, min(1.0, score))
    filled = int(round(clamped * width))
    bar = "█" * filled + "░" * (width - filled)
    color = "\033[92m" if clamped >= 0.5 else ("\033[93m" if clamped >= 0.3 else "\033[90m")
    return f"{color}[{bar}] {clamped * 100:5.1f}%\033[0m"


def parse_tags(tags_raw: Any) -> list[str]:
    """Tách chuỗi tags thành danh sách sạch."""
    if not tags_raw or str(tags_raw).lower() == "nan":
        return []
    return [t.strip() for t in str(tags_raw).split(",") if t.strip()]


def parse_specs(specs_raw: Any) -> dict[str, Any]:
    """Đọc chuỗi JSON specs nếu có."""
    if not specs_raw or str(specs_raw).lower() == "nan":
        return {}
    try:
        return json.loads(str(specs_raw))
    except Exception:
        return {"Thông số": str(specs_raw)}


def explain_similarity(target_row: Any, candidate_row: Any) -> list[str]:
    """So sánh và chỉ ra các điểm chung giữa sản phẩm gốc và sản phẩm gợi ý."""
    reasons: list[str] = []

    target_cat = str(target_row.get("category_name", target_row.get("category", ""))).strip()
    cand_cat = str(candidate_row.get("category_name", candidate_row.get("category", ""))).strip()
    if target_cat and target_cat.lower() == cand_cat.lower():
        reasons.append(f"Cùng danh mục ({target_cat})")

    target_brand = str(target_row.get("brand", "")).strip()
    cand_brand = str(candidate_row.get("brand", "")).strip()
    if target_brand and target_brand.lower() == cand_brand.lower():
        reasons.append(f"Cùng thương hiệu ({target_brand})")

    # So sánh specs JSON (ví dụ: Kết nối, Polling Rate, Switch...)
    t_specs = parse_specs(target_row.get("specs"))
    c_specs = parse_specs(candidate_row.get("specs"))
    shared_specs = []
    for k, v in t_specs.items():
        if k in c_specs and str(c_specs[k]).lower() == str(v).lower():
            shared_specs.append(f"{k}: {v}")
    if shared_specs:
        reasons.append("Cùng thông số (" + ", ".join(shared_specs[:2]) + ")")

    # So sánh tags
    t_tags = set(parse_tags(target_row.get("tags")))
    c_tags = set(parse_tags(candidate_row.get("tags")))
    common_tags = sorted(t_tags.intersection(c_tags))
    if common_tags:
        reasons.append("Trùng đặc tính (" + ", ".join(common_tags[:4]) + ")")

    # So sánh mức giá
    t_price = float(target_row.get("price", 0) or 0)
    c_price = float(candidate_row.get("price", 0) or 0)
    if t_price > 0 and c_price > 0:
        diff = c_price - t_price
        if abs(diff) <= 500_000:
            reasons.append("Cùng phân khúc giá (chênh lệch không đáng kể)")
        elif diff > 0:
            reasons.append(f"Phân khúc cao hơn (+{format_vnd(diff)})")
        else:
            reasons.append(f"Tiết kiệm hơn (-{format_vnd(abs(diff))})")

    return reasons


def test_cosine_visual(
    product_query: str | int = 1,
    top_n: int = 10,
    same_category_only: bool = False,
) -> None:
    """Kiểm thử trực quan gợi ý sản phẩm tương tự (Cosine Similarity)."""
    model_path = ROOT_DIR / "cosine" / "similar_model.joblib"
    if not model_path.exists():
        print(f"❌ Chưa có model tại {model_path}. Hãy chạy 'python train.py --model cosine' trước.")
        return

    rec = SimilarProductsRecommender.load(model_path)
    df = rec.products_df

    # Tìm sản phẩm theo ID hoặc theo từ khóa tên
    query_str = str(product_query).strip()
    if query_str in rec.id_to_index:
        pid_str = query_str
    else:
        matches = df[df["name"].astype(str).str.contains(query_str, case=False, na=False)]
        if matches.empty:
            print(f"❌ Không tìm thấy sản phẩm có ID hoặc tên chứa '{query_str}'. (ID hợp lệ: 1 -> {len(df)})")
            return
        pid_str = str(matches.iloc[0]["product_id"])
        if len(matches) > 1:
            print(f"💡 Tìm thấy {len(matches)} sản phẩm khớp từ khóa '{query_str}', tự động chọn: [ID {pid_str}] {matches.iloc[0]['name']}")

    idx = rec.id_to_index[pid_str]
    target = df.iloc[idx]
    target_tags = parse_tags(target.get("tags"))
    target_specs = parse_specs(target.get("specs"))

    print("\n" + "═" * 78)
    print(" 🔎 KIỂM THỬ TRỰC QUAN COSINE SIMILARITY (GỢI Ý SẢN PHẨM TƯƠNG TỰ)")
    print("═" * 78)

    # PHẦN 1: SẢN PHẨM MỤC TIÊU ĐANG XEM
    print("\n🎯 [1] HỒ SƠ SẢN PHẨM ĐANG XEM (TARGET ITEM):")
    print(f"   • Sản phẩm            : \033[1;96m[ID {target['product_id']}] {target['name']}\033[0m")
    print(f"   • Danh mục & Hãng     : {target.get('category_name', target.get('category'))} | Thương hiệu: \033[1m{target.get('brand')}\033[0m")
    print(f"   • Giá bán & Đánh giá  : \033[93m{format_vnd(target.get('price', 0))}\033[0m | ⭐ {target.get('rating', 5.0)} ({target.get('review_count', 0)} đánh giá)")
    if target_specs:
        specs_str = " | ".join(f"{k}: {v}" for k, v in target_specs.items())
        print(f"   • Thông số kỹ thuật   : {specs_str}")
    if target_tags:
        print(f"   • Tags đặc trưng      : {target_tags}")

    # PHẦN 2: CƠ CHẾ TRÍCH XUẤT VECTOR & SO KHỚP
    print("\n⚙️  [2] CƠ CHẾ XỬ LÝ CỦA THUẬT TOÁN (FEATURE EXTRACTION & COSINE):")
    print(f"   • Không gian mẫu      : {len(df)} sản phẩm trong ma trận tương đồng ({rec.similarity_matrix.shape[0]}x{rec.similarity_matrix.shape[1]})")
    print("   • Trọng số kết hợp    : TF-IDF N-gram (Tên + Hãng + Danh mục + Specs + Tags) + 0.25 × MinMax(Giá)")
    print(f"   • Chế độ lọc danh mục : {'Chỉ lấy cùng danh mục' if same_category_only else 'Mở rộng toàn bộ danh mục'}")

    # PHẦN 3: DANH SÁCH SẢN PHẨM TƯƠNG TỰ & GIẢI THÍCH LÝ DO
    results = rec.recommend(pid_str, top_n=top_n, same_category_only=same_category_only)
    print(f"\n📦 [3] TOP {len(results)} SẢN PHẨM TƯƠNG ĐỒNG NHẤT & LÝ DO GỢI Ý:")
    print("─" * 78)

    for rank, item in enumerate(results, start=1):
        cand_idx = rec.id_to_index[str(item["product_id"])]
        cand_row = df.iloc[cand_idx]
        sim_score = item["similarity_score"]
        reasons = explain_similarity(target, cand_row)
        cand_tags = parse_tags(cand_row.get("tags"))

        print(f"   {rank}. [ID {item['product_id']}] \033[1m{item['name']}\033[0m")
        print(f"      • Độ tương đồng : {render_bar(sim_score)} (Cosine = {sim_score:.4f})")
        print(f"      • Thông tin     : Hãng: {item['brand']} | Danh mục: {item['category']} | Giá: \033[93m{format_vnd(item['price'])}\033[0m | ⭐ {item['rating']}")
        if reasons:
            print(f"      • Điểm chung    : \033[92m✓\033[0m " + " | ".join(reasons))
        if cand_tags:
            print(f"      • Tags SP       : {', '.join(cand_tags[:5])}")
        print()

    print("═" * 78 + "\n")


def run_interactive_cosine() -> None:
    """Giao diện dòng lệnh trực quan cho phép chọn hoặc nhập sản phẩm liên tục."""
    print("\n" + "🚀 " * 15)
    print(" TRÌNH KIỂM THỬ TRỰC QUAN COSINE SIMILARITY (SẢN PHẨM TƯƠNG TỰ)")
    print(" Nhập ID hoặc Tên sản phẩm để xem: Hồ sơ SP -> Độ tương đồng -> Lý do giống nhau")
    print(" Gõ 'exit' hoặc 'quit' để thoát.")
    print("🚀 " * 15)

    samples = [
        ("1", "Logitech G Pro X Superlight 2 (Chuột FPS siêu nhẹ)"),
        ("6", "Logitech MX Master 3S (Chuột công thái học văn phòng)"),
        ("35", "Keychron Q1 Pro Wireless (Bàn phím cơ Custom nhôm)"),
        ("70", "HyperX Cloud III Wireless (Tai nghe Gaming không dây)"),
    ]
    print("\n💡 Gợi ý sản phẩm mẫu để test nhanh:")
    for idx, (pid, desc) in enumerate(samples, 1):
        print(f"   {idx}. ID={pid:<3} -> {desc}")

    while True:
        try:
            print("\n" + "-" * 65)
            inp = input("👉 Nhập Product ID hoặc Tên SP (ví dụ 'razer', 'keychron', chọn 1-4, Enter=ID 1): ").strip()
            if inp.lower() in ("exit", "quit", "0"):
                print("Tạm biệt! 👋")
                break

            if inp in ("1", "2", "3", "4") and len(inp) == 1:
                query_val = samples[int(inp) - 1][0]
            elif not inp:
                query_val = "1"
            else:
                query_val = inp

            test_cosine_visual(product_query=query_val, top_n=10)
        except (KeyboardInterrupt, EOFError):
            print("\nTạm biệt! 👋")
            break


def test_cosine(product_id: str | int = 1, top_n: int = 10) -> None:
    """Wrapper tương thích ngược với test suite."""
    test_cosine_visual(product_query=product_id, top_n=top_n)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm thử trực quan gợi ý sản phẩm tương tự (Cosine Similarity)")
    parser.add_argument("--id", type=str, default=None, help="Product ID hoặc từ khóa tên sản phẩm cần tìm tương tự")
    parser.add_argument("--top", type=int, default=10, help="Số lượng sản phẩm gợi ý (mặc định: 10)")
    parser.add_argument("--same-cat", action="store_true", help="Chỉ gợi ý sản phẩm cùng danh mục")
    args = parser.parse_args()

    if args.id is not None:
        test_cosine_visual(product_query=args.id, top_n=args.top, same_category_only=args.same_cat)
    else:
        run_interactive_cosine()


if __name__ == "__main__":
    main()
