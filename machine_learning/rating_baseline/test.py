"""Kiểm thử trực quan xếp hạng sản phẩm nổi bật (Rating Baseline).

Tính năng:
    - Cho phép lọc theo Danh mục (Chuột, Bàn phím, Tai nghe, Ghế...) và Thương hiệu (Logitech, Razer...).
    - [1] Hiển thị tham số thống kê của tập dữ liệu (Rating trung bình C, Ngưỡng đánh giá tối thiểu m, Max Sold).
    - [2] Giải thích công thức Bayesian Weighted Rating + Sold Boost.
    - [3] Trả bảng xếp hạng Top sản phẩm nổi bật kèm:
          + Phân tách chi tiết: Điểm Bayesian gốc (từ Rating & Reviews) + Điểm cộng Lượt bán (Sold Boost) = Tổng Featured Score.

Cách chạy:
    # 1. Chế độ nhập tương tác trực quan:
    python rating_baseline/test.py

    # 2. Truyền tham số trực tiếp:
    python rating_baseline/test.py --top 5
    python rating_baseline/test.py --category "Chuột" --brand "Logitech"
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from cosine.model import SimilarProductsRecommender
from rating_baseline.ranking import FeaturedProductsRanker


def format_vnd(amount: float) -> str:
    """Format tiền VNĐ dễ đọc."""
    return f"{int(amount):,} đ".replace(",", ".")


def render_featured_bar(score: float, max_score: float = 5.5, width: int = 18) -> str:
    """Thanh trực quan cho điểm Featured Score (thang ~ 0 -> 5.5)."""
    ratio = max(0.0, min(1.0, score / max_score))
    filled = int(round(ratio * width))
    bar = "█" * filled + "░" * (width - filled)
    return f"\033[92m[{bar}] {score:.4f}\033[0m"


def test_featured_visual(
    top_n: int = 10,
    category: str | None = None,
    brand: str | None = None,
) -> None:
    """Kiểm thử trực quan khối sản phẩm nổi bật (Rating Baseline)."""
    model_path = ROOT_DIR / "cosine" / "similar_model.joblib"
    if not model_path.exists():
        print("❌ Cần file dữ liệu sản phẩm. Hãy chạy 'python train.py' trước.")
        return

    rec = SimilarProductsRecommender.load(model_path)
    df = rec.products_df.copy()
    if "review_count" not in df.columns:
        df["review_count"] = (df.get("stock_quantity", pd.Series([20] * len(df))).fillna(20) * 8).astype(int)
    if "sold_count" not in df.columns:
        df["sold_count"] = (df.get("stock_quantity", pd.Series([20] * len(df))).fillna(20) * 12).astype(int)
    ranker = FeaturedProductsRanker()

    print("\n" + "═" * 82)
    print(" 🏆 KIỂM THỬ TRỰC QUAN RATING BASELINE (XẾP HẠNG SẢN PHẨM NỔI BẬT)")
    print("═" * 82)

    # Lọc dữ liệu để tính toán tham số thống kê C và m giống hệt bên trong ranker
    filtered_df = df.copy()
    if category:
        cat_col = "category_name" if "category_name" in filtered_df.columns else "category"
        filtered_df = filtered_df[filtered_df[cat_col].astype(str).str.lower() == category.lower()]
    if brand:
        filtered_df = filtered_df[filtered_df["brand"].astype(str).str.lower() == brand.lower()]

    if filtered_df.empty:
        print(f"   ⚠️ Không tìm thấy sản phẩm nào khớp bộ lọc (Danh mục='{category}', Hãng='{brand}').")
        print("═" * 82 + "\n")
        return

    C_mean = float(filtered_df["rating"].mean())
    m_quantile = max(3.0, float(filtered_df["review_count"].quantile(ranker.min_reviews_quantile)))
    max_sold = int(filtered_df["sold_count"].max()) if "sold_count" in filtered_df.columns else 0

    # PHẦN 1: BỘ LỌC & THỐNG KÊ TẬP DỮ LIỆU
    print("\n📊 [1] BỘ LỌC & THAM SỐ THỐNG KÊ TẬP DỮ LIỆU (DATASET PARAMETERS):")
    print(f"   • Phạm vi lọc hiện tại : Danh mục = \033[1m{category or 'Tất cả'}\033[0m | Thương hiệu = \033[1m{brand or 'Tất cả'}\033[0m ({len(filtered_df)} sản phẩm)")
    print(f"   • Điểm sao TB toàn tập : C = {C_mean:.2f} ⭐")
    print(f"   • Ngưỡng review chuẩn  : m = {m_quantile:.0f} đánh giá (Trung vị 50% số lượng đánh giá)")
    print(f"   • Lượt bán cao nhất    : Max Sold = {max_sold:,} sản phẩm")

    # PHẦN 2: CÔNG THỨC XẾP HẠNG
    print("\n⚙️  [2] CÔNG THỨC TÍNH ĐIỂM NỔI BẬT (BAYESIAN WEIGHTED + SOLD BOOST):")
    print("   • Điểm Bayesian (W)    : W = [v/(v+m)] × R + [m/(v+m)] × C  (Chống ảo điểm khi ít người đánh giá)")
    print("   • Điểm cộng Bán chạy   : Sold_Boost = [ln(1 + sold) / ln(1 + max_sold)] × 0.50")
    print("   • Tổng điểm xếp hạng   : Featured_Score = W + Sold_Boost")

    # PHẦN 3: BẢNG XẾP HẠNG CHI TIẾT
    results = ranker.get_featured_products(df, category=category, brand=brand, top_n=top_n)
    print(f"\n🏅 [3] BẢNG XẾP HẠNG TOP {len(results)} SẢN PHẨM NỔI BẬT NHẤT:")
    print("─" * 82)

    for item in results:
        R = item["rating"]
        v = item["review_count"]
        sold = item["sold_count"]
        total_score = item["featured_score"]

        bayesian_w = (v / (v + m_quantile)) * R + (m_quantile / (v + m_quantile)) * C_mean
        sold_boost = (np.log1p(sold) / np.log1p(max_sold) * 0.5) if max_sold > 0 else 0.0

        print(f"   #{item['rank']}. [ID {item['product_id']}] \033[1m{item['name']}\033[0m")
        print(f"       • Điểm tổng hợp : {render_featured_bar(total_score)}  [Bayesian W: {bayesian_w:.4f} + Sold Boost: +{sold_boost:.4f}]")
        print(
            f"       • Chỉ số uy tín : ⭐ \033[93m{R:.1f}/5.0\033[0m ({v:,} đánh giá) "
            f"| 🛒 Đã bán: \033[96m{sold:,}\033[0m | Giá: \033[93m{format_vnd(item['price'])}\033[0m"
        )
        print(f"       • Phân loại     : Danh mục: {item['category']} | Thương hiệu: {item['brand']}")
        print()

    print("═" * 82 + "\n")


def run_interactive_featured() -> None:
    """Giao diện dòng lệnh trực quan cho phép lọc bảng xếp hạng theo Danh mục & Hãng."""
    print("\n" + "🚀 " * 15)
    print(" TRÌNH KIỂM THỬ TRỰC QUAN RATING BASELINE (SẢN PHẨM NỔI BẬT)")
    print(" Chọn chế độ lọc để xem: Thống kê tập mẫu -> Phân rã điểm Bayesian -> Top BXH")
    print(" Gõ 'exit' hoặc 'quit' để thoát.")
    print("🚀 " * 15)

    presets = [
        (None, None, "Toàn bộ hệ thống (Top chung mọi ngành hàng)"),
        ("Chuột", None, "Top Chuột nổi bật nhất"),
        ("Bàn phím", None, "Top Bàn phím cơ nổi bật nhất"),
        ("Tai nghe", None, "Top Tai nghe nổi bật nhất"),
        ("Chuột", "Logitech", "Top Chuột thương hiệu Logitech"),
    ]
    print("\n💡 Gợi ý bộ lọc mẫu để test nhanh:")
    for idx, (cat, br, desc) in enumerate(presets, 1):
        print(f"   {idx}. {desc}")

    while True:
        try:
            print("\n" + "-" * 68)
            inp = input("👉 Chọn 1-5 theo mẫu (hoặc nhập tên Danh mục như 'Ghế', 'Bàn phím', Enter=mẫu [1]): ").strip()
            if inp.lower() in ("exit", "quit", "0"):
                print("Tạm biệt! 👋")
                break

            if inp in ("1", "2", "3", "4", "5") and len(inp) == 1:
                cat_val, br_val, _ = presets[int(inp) - 1]
            elif not inp:
                cat_val, br_val, _ = presets[0]
            else:
                cat_val = inp
                br_inp = input("👉 Nhập thêm Thương hiệu để lọc (hoặc Enter để lấy tất cả hãng): ").strip()
                br_val = br_inp if br_inp else None

            test_featured_visual(top_n=10, category=cat_val, brand=br_val)
        except (KeyboardInterrupt, EOFError):
            print("\nTạm biệt! 👋")
            break


def test_featured(top_n: int = 10) -> None:
    """Wrapper tương thích ngược với test suite."""
    test_featured_visual(top_n=top_n)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm thử trực quan xếp hạng sản phẩm nổi bật (Rating Baseline)")
    parser.add_argument("--top", type=int, default=10, help="Số lượng sản phẩm nổi bật muốn hiển thị (mặc định: 10)")
    parser.add_argument("--category", type=str, default=None, help="Lọc theo danh mục (ví dụ: 'Chuột', 'Bàn phím', 'Tai nghe')")
    parser.add_argument("--brand", type=str, default=None, help="Lọc theo thương hiệu (ví dụ: 'Logitech', 'Razer')")
    parser.add_argument("--auto", action="store_true", help="Chạy 1 lần tự động không bật chế độ tương tác")
    args = parser.parse_args()

    if args.category or args.brand or args.auto:
        test_featured_visual(top_n=args.top, category=args.category, brand=args.brand)
    else:
        run_interactive_featured()


if __name__ == "__main__":
    main()
