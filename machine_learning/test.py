"""Script tổng hợp kiểm thử trực quan toàn bộ hệ thống AI & Recommender System.

Import và tái sử dụng các hàm test trực quan từ từng thư mục thuật toán:
- cosine/test.py           (Sản phẩm tương tự - Cosine Similarity)
- fp_growth/test.py        (Gợi ý mua kèm - FP-Growth)
- cosine_kmeans/test.py    (Gợi ý cá nhân hóa - Cosine + K-Means)
- svm_regex/test.py        (Tìm kiếm thông minh - SVM + Regex)
- rating_baseline/test.py  (Sản phẩm nổi bật - Rating Baseline)

Sử dụng:
    # 1. Chạy tự động toàn bộ 5 khối nghiệp vụ (kèm thêm mô phỏng hành trình khách hàng):
    python test.py

    # 2. Chế độ tương tác dòng lệnh (Interactive Menu Mode):
    python test.py --interactive

    # 3. Chạy mô phỏng hành trình mua sắm trọn vẹn 1 khách hàng qua cả 5 thuật toán:
    python test.py --journey

    # 4. Chạy từng thuật toán riêng biệt thông qua test.py:
    python test.py --cosine 1
    python test.py --fpgrowth 15 290
    python test.py --kmeans 12
    python test.py --search "chuột gaming không dây siêu nhẹ dưới 2 triệu"
    python test.py --featured
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

# Import từ các file test riêng biệt của từng thuật toán
from cosine.test import run_interactive_cosine, test_cosine
from fp_growth.test import run_interactive_fpgrowth, test_fpgrowth
from cosine_kmeans.test import run_interactive_kmeans, test_kmeans
from svm_regex.test import run_interactive_search, test_smart_search
from rating_baseline.test import run_interactive_featured, test_featured, test_featured_visual


def run_customer_journey_simulation(
    user_id: str = "12",
    search_query: str = "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu",
    viewed_product_id: str = "15",
) -> None:
    """Mô phỏng trực quan trọn vẹn hành trình 1 người dùng đi qua cả 5 khối AI trên E-Commerce."""
    print("\n" + "🌟 " * 25)
    print(" 🛍️  MÔ PHỎNG HÀNH TRÌNH MUA SẮM THÔNG MINH QUA 5 THUẬT TOÁN (END-TO-END DEMO)")
    print("🌟 " * 25)

    print(f"\n▶ BƯỚC 1/5 [TRANG CHỦ]: Hiển thị bảng xếp hạng Sản phẩm nổi bật (Rating Baseline)")
    test_featured(top_n=3)

    print(f"\n▶ BƯỚC 2/5 [GỢI Ý DÀNH RIÊNG CHO BẠN]: User #{user_id} đăng nhập vào hệ thống (Cosine + K-Means)")
    test_kmeans(user_id=user_id, top_n=3)

    print(f"\n▶ BƯỚC 3/5 [THANH TÌM KIẾM THÔNG MINH]: User #{user_id} gõ tìm \"{search_query}\" (SVM + Regex)")
    test_smart_search(query=search_query, user_id=user_id, top_products=3)

    print(f"\n▶ BƯỚC 4/5 [XEM CHI TIẾT SẢN PHẨM]: User bấm xem SP ID={viewed_product_id} -> Gợi ý SP tương tự (Cosine Similarity)")
    test_cosine(product_id=viewed_product_id, top_n=3)

    print(f"\n▶ BƯỚC 5/5 [GIỎ HÀNG & MUA KÈM]: User thêm SP ID={viewed_product_id} vào giỏ -> Gợi ý mua kèm (FP-Growth)")
    test_fpgrowth(product_ids=[viewed_product_id], top_n=3)

    print("\n" + "✅ " * 20)
    print(" HOÀN TẤT MÔ PHỎNG HÀNH TRÌNH KHÁCH HÀNG TRÊN CẢ 5 KHỐI AI!")
    print("✅ " * 20 + "\n")


def run_interactive_mode() -> None:
    """Giao diện tương tác dòng lệnh để thử nghiệm linh hoạt từng tính năng."""
    print("\n" + "🎮 " * 18)
    print(" TRUNG TÂM KIỂM THỬ TRỰC QUAN 5 KHỐI AI (INTERACTIVE TEST CENTER)")
    print("🎮 " * 18)

    while True:
        print("\nChọn chức năng muốn kiểm thử trực quan:")
        print("  1. 🔎 Gợi ý sản phẩm tương tự (Cosine Similarity)   -> So sánh thông số, tags & điểm Cosine")
        print("  2. 🛒 Gợi ý mua kèm (FP-Growth)                     -> Xem giỏ hàng, luật kết hợp & giá Combo")
        print("  3. 👤 Gợi ý cá nhân hóa (Cosine + K-Means)          -> Xem lịch sử User, cụm Persona & Cluster Boost")
        print("  4. 🧠 Tìm kiếm thông minh (SVM + Regex)             -> Bóc tách Intent, Ràng buộc cứng & Soft Tags")
        print("  5. 🏆 Sản phẩm nổi bật (Rating Baseline)            -> Phân rã điểm Bayesian & Lọc theo Danh mục/Hãng")
        print("  6. 🌟 Mô phỏng Hành trình Khách hàng (Chạy liên hoàn cả 5 bước từ Trang chủ -> Giỏ hàng)")
        print("  0. Thoát")

        choice = input("\n👉 Nhập lựa chọn của bạn (0-6): ").strip()
        if choice == "0" or choice.lower() in ("exit", "quit"):
            print("Tạm biệt! 👋")
            break
        elif choice == "1":
            run_interactive_cosine()
        elif choice == "2":
            run_interactive_fpgrowth()
        elif choice == "3":
            run_interactive_kmeans()
        elif choice == "4":
            run_interactive_search()
        elif choice == "5":
            run_interactive_featured()
        elif choice == "6":
            uid = input("👉 Nhập User ID (Enter = 12): ").strip() or "12"
            q = input("👉 Nhập câu tìm kiếm (Enter = 'chuột gaming không dây siêu nhẹ dưới 2 triệu'): ").strip() or "chuột gaming không dây siêu nhẹ dưới 2 triệu"
            pid = input("👉 Nhập Product ID xem chi tiết & thêm vào giỏ (Enter = 15): ").strip() or "15"
            run_customer_journey_simulation(user_id=uid, search_query=q, viewed_product_id=pid)
        else:
            print("⚠️ Lựa chọn không hợp lệ, vui lòng chọn từ 0 đến 6.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Script tổng hợp kiểm thử trực quan toàn bộ hệ thống AI & Recommender System")
    parser.add_argument("--interactive", "-i", action="store_true", help="Bật chế độ menu tương tác trực quan")
    parser.add_argument("--journey", "-j", action="store_true", help="Chạy mô phỏng hành trình khách hàng qua cả 5 khối AI")
    parser.add_argument("--cosine", type=str, metavar="PRODUCT_ID_OR_NAME", help="Test Cosine Similarity với Product ID hoặc tên SP")
    parser.add_argument("--fpgrowth", nargs="+", metavar="PRODUCT_ID", help="Test FP-Growth với danh sách Product ID trong giỏ")
    parser.add_argument("--kmeans", type=str, metavar="USER_ID", help="Test Cosine + K-Means với User ID cụ thể")
    parser.add_argument("--search", type=str, metavar="QUERY", help="Test Tìm kiếm thông minh với câu truy vấn text")
    parser.add_argument("--featured", action="store_true", help="Test Sản phẩm nổi bật")

    args = parser.parse_args()

    has_specific = any([args.cosine, args.fpgrowth, args.kmeans, args.search, args.featured, args.journey])

    if args.interactive:
        run_interactive_mode()
        return

    if has_specific:
        if args.journey:
            run_customer_journey_simulation()
        if args.cosine:
            test_cosine(args.cosine)
        if args.fpgrowth:
            test_fpgrowth(args.fpgrowth)
        if args.kmeans:
            test_kmeans(args.kmeans)
        if args.search:
            test_smart_search(args.search)
        if args.featured:
            test_featured_visual(top_n=5)
        return

    # Mặc định: Chạy toàn bộ bài test trực quan
    print("\n" + "🚀 " * 18)
    print(" CHẠY BỘ KIỂM THỬ TỰ ĐỘNG TRỰC QUAN CHO TOÀN BỘ 5 KHỐI HỆ THỐNG")
    print("🚀 " * 18)

    test_cosine(product_id=1, top_n=10)
    test_fpgrowth(product_ids=["15"], top_n=10)
    test_kmeans(user_id=12, top_n=10)
    test_smart_search("tìm chuột không dây siêu nhẹ claw grip dưới 2 triệu", user_id=12, top_products=10)
    test_smart_search("thời tiết hà nội hôm nay thế nào")
    test_featured(top_n=10)

    print("\n" + "✅ " * 18)
    print(" HOÀN THÀNH TẤT CẢ CÁC BÀI TEST KIỂM THỬ HỆ THỐNG!")
    print(" 💡 Mẹo: Chạy 'python test.py -i' để mở Menu tương tác hoặc 'python test.py -j' để xem Hành trình khách hàng.")
    print("✅ " * 18 + "\n")


if __name__ == "__main__":
    main()
