"""Kiểm thử trực quan gợi ý mua kèm / Frequently Bought Together (FP-Growth).

Tính năng:
    - Nhập danh sách Product ID trong giỏ hàng (hoặc chạy tương tác chọn giỏ hàng mẫu).
    - [1] Hiển thị chi tiết Giỏ hàng hiện tại (Tên sản phẩm, Danh mục, Giá tiền, Tổng tạm tính).
    - [2] Hiển thị thông số khai phá luật kết hợp FP-Tree (Min Support, Min Confidence, Min Lift).
    - [3] Trả danh sách sản phẩm gợi ý mua kèm trực quan:
          + Sơ đồ luật kết hợp: [Giỏ hàng] ──(Confidence %, Lift x)──> [Sản phẩm mua kèm].
          + Giải thích ý nghĩa thực tế của Confidence & Lift và giá trị Combo sau khi gộp.

Cách chạy:
    # 1. Chế độ nhập tương tác trực quan:
    python fp_growth/test.py

    # 2. Truyền tham số Product ID trực tiếp:
    python fp_growth/test.py --ids 1
    python fp_growth/test.py --ids 15 290 --top 5
"""

from __future__ import annotations

import argparse
import re
import warnings
from pathlib import Path
from typing import Any

import pandas as pd

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parents[3]

from ml_service.algorithms.fp_growth.model import FPGrowthRecommender


def format_vnd(amount: float) -> str:
    """Format tiền VNĐ dễ đọc."""
    return f"{int(amount):,} đ".replace(",", ".")


def load_product_catalog() -> dict[str, dict[str, Any]]:
    """Tải danh mục toàn bộ sản phẩm (từ SQL seeds + data/cosine.csv) để hiển thị đầy đủ Tên, Danh mục, Giá."""
    catalog: dict[str, dict[str, Any]] = {}

    # 1. Đọc từ SQL seed (bao phủ đủ ID 1 -> 405: Chuột, Bàn phím, Tai nghe, Lót chuột, Ghế, Arm...)
    cat_map = {
        1: "Chuột",
        2: "Tai nghe",
        3: "Soundcard",
        4: "Bàn phím",
        5: "Ghế công thái học",
        6: "Bàn nâng hạ",
        7: "Arm màn hình",
        8: "Phụ kiện Setup",
        9: "Lót chuột",
    }
    seed_dir = ROOT_DIR / "ml_service" / "db" / "seed"
    brand_id_map: dict[int, str] = {}
    cat_seed_file = seed_dir / "01_categories.sql"
    if cat_seed_file.exists():
        try:
            cat_txt = cat_seed_file.read_text(encoding="utf-8")
            if "-- Seed brands" in cat_txt:
                brand_section = cat_txt.split("-- Seed brands")[1]
                for bm in re.finditer(r"\(\s*(\d+)\s*,\s*'([^']+)'\s*\)", brand_section):
                    brand_id_map[int(bm.group(1))] = bm.group(2)
        except Exception:
            pass

    if seed_dir.exists():
        pattern = re.compile(
            r"\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\d+\s*,\s*'[^']*'\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)"
        )
        for sql_file in sorted(seed_dir.glob("*.sql")):
            if sql_file.name == "01_categories.sql":
                continue
            try:
                content = sql_file.read_text(encoding="utf-8")
                for m in pattern.finditer(content):
                    pid, cid, bid, name, color, price, rating = m.groups()
                    catalog[str(pid)] = {
                        "product_id": str(pid),
                        "name": name,
                        "category": cat_map.get(int(cid), "Phụ kiện"),
                        "brand_id": int(bid),
                        "brand": brand_id_map.get(int(bid), name.split()[0] if name else "N/A"),
                        "price": float(price),
                        "rating": float(rating),
                    }
            except Exception:
                pass

    # 2. Bổ sung thêm sản phẩm từ data/cosine.csv nếu chưa có trong SQL seed
    csv_path = ROOT_DIR / "data" / "cosine.csv"
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            for _, row in df.iterrows():
                pid = str(row["product_id"])
                if pid not in catalog:
                    catalog[pid] = {
                        "product_id": pid,
                        "name": str(row.get("name", f"Sản phẩm #{pid}")),
                        "category": str(row.get("category", "Phụ kiện")),
                        "brand": str(row.get("brand", "N/A")),
                        "price": float(row.get("price", 0)),
                        "rating": float(row.get("rating", 5.0)),
                    }
        except Exception:
            pass

    return catalog


def render_conf_bar(conf: float, width: int = 16) -> str:
    """Thanh trực quan cho độ tin cậy Confidence."""
    clamped = max(0.0, min(1.0, conf))
    filled = int(round(clamped * width))
    bar = "█" * filled + "░" * (width - filled)
    color = "\033[92m" if clamped >= 0.4 else ("\033[93m" if clamped >= 0.25 else "\033[96m")
    return f"{color}[{bar}] {clamped * 100:5.1f}%\033[0m"


def test_fpgrowth_visual(
    product_ids: list[str | int] | str | int = "1",
    top_n: int = 10,
) -> None:
    """Kiểm thử trực quan gợi ý mua kèm (FP-Growth)."""
    model_path = ROOT_DIR / "models" / "rules_model.joblib"
    if not model_path.exists():
        print(f"❌ Chưa có model tại {model_path}. Hãy chạy 'python scripts/train.py --model fp_growth' trước.")
        return

    rec = FPGrowthRecommender.load(model_path)
    catalog = load_product_catalog()

    if isinstance(product_ids, (str, int)):
        items = [str(p).strip() for p in str(product_ids).split(",") if str(p).strip()]
    else:
        items = [str(p).strip() for p in product_ids if str(p).strip()]

    print("\n" + "═" * 80)
    print(" 🛒 KIỂM THỬ TRỰC QUAN FP-GROWTH (GỢI Ý MUA KÈM / FREQUENTLY BOUGHT TOGETHER)")
    print("═" * 80)

    # PHẦN 1: GIỎ HÀNG HIỆN TẠI
    print("\n🛍️  [1] GIỎ HÀNG HIỆN TẠI CỦA KHÁCH (ANTECEDENT ITEMS):")
    cart_total = 0.0
    cart_names: list[str] = []
    for pid in items:
        info = catalog.get(pid, {
            "name": f"Sản phẩm #{pid}",
            "category": "Phụ kiện",
            "brand": "N/A",
            "price": 0.0,
            "rating": 5.0,
        })
        cart_total += info["price"]
        cart_names.append(f"[ID {pid}] {info['name']}")
        print(
            f"   • \033[1;96m[ID {pid}] {info['name']}\033[0m "
            f"| Danh mục: {info['category']} | Giá: \033[93m{format_vnd(info['price'])}\033[0m"
        )
    print(f"   👉 Tổng tạm tính giỏ hàng: \033[1;93m{format_vnd(cart_total)}\033[0m")

    # PHẦN 2: THÔNG TIN KHAI PHÁ FP-TREE & ASSOCIATION RULES
    matching_rules_count = sum(
        1 for r in rec.rules if set(r["antecedents"]).issubset(set(items))
    )
    print("\n⚙️  [2] THÔNG SỐ KHAI PHÁ LUẬT KẾT HỢP (FP-TREE MINING METRICS):")
    print(f"   • Tổng tập luật trong Model : {len(rec.rules)} luật kết hợp")
    print(f"   • Ngưỡng lọc (Thresholds)   : Support ≥ {rec.min_support*100:.1f}% | Confidence ≥ {rec.min_confidence*100:.1f}% | Lift ≥ {rec.min_lift:.1f}x")
    print(f"   • Số luật kích hoạt từ giỏ  : \033[92m{matching_rules_count} luật phù hợp\033[0m")

    # PHẦN 3: KẾT QUẢ GỢI Ý MUA KÈM
    results = rec.recommend(items, top_n=top_n)
    print(f"\n📦 [3] TOP {len(results)} SẢN PHẨM GỢI Ý MUA KÈM TỐT NHẤT (CONSEQUENT ITEMS):")
    print("─" * 80)

    if not results:
        # Gợi ý các ID có nhiều luật kết hợp trong hệ thống
        active_ants = sorted({r["antecedents"][0] for r in rec.rules if len(r["antecedents"]) == 1})[:8]
        print("   ⚠️ Chưa có sản phẩm mua kèm nào vượt ngưỡng Confidence/Lift cho giỏ hàng này.")
        print(f"   💡 Gợi ý các Product ID có nhiều combo mua kèm nhất: {', '.join(active_ants)}")
        print("═" * 80 + "\n")
        return

    cart_label = " + ".join(f"ID {p}" for p in items)
    for rank, item in enumerate(results, start=1):
        rec_pid = str(item["product_id"])
        p_info = catalog.get(rec_pid, {
            "name": f"Sản phẩm #{rec_pid}",
            "category": "Phụ kiện",
            "brand": "N/A",
            "price": 0.0,
            "rating": 5.0,
        })
        conf = item["confidence"]
        lift = item["lift"]
        supp = item["support"]
        combo_price = cart_total + p_info["price"]

        print(f"   {rank}. [ID {rec_pid}] \033[1m{p_info['name']}\033[0m ({p_info['category']})")
        print(f"      • Luật kết hợp   : \033[96m[{cart_label}]\033[0m ──(hay mua cùng)──▶ \033[92m[ID {rec_pid}: {p_info['name']}]\033[0m")
        print(f"      • Độ tin cậy     : {render_conf_bar(conf)} (Khách mua [{cart_label}] có {conf*100:.1f}% mua thêm món này)")
        print(f"      • Hệ số thúc đẩy : \033[1;95mLift = {lift:.2f}x\033[0m (Khả năng mua chung cao gấp {lift:.2f} lần mua ngẫu nhiên | Support: {supp*100:.2f}%)")
        print(f"      • Giá mua lẻ     : \033[93m{format_vnd(p_info['price'])}\033[0m ➔ Tổng giá trị Combo: \033[1;93m{format_vnd(combo_price)}\033[0m")
        print()

    print("═" * 80 + "\n")


def run_interactive_fpgrowth() -> None:
    """Giao diện dòng lệnh trực quan cho phép thử nghiệm các giỏ hàng mua kèm."""
    print("\n" + "🚀 " * 15)
    print(" TRÌNH KIỂM THỬ TRỰC QUAN FP-GROWTH (GỢI Ý SẢN PHẨM THƯỜNG MUA KÈM)")
    print(" Nhập ID sản phẩm trong giỏ để xem: Giỏ hàng -> Luật kết hợp -> Gợi ý Combo")
    print(" Gõ 'exit' hoặc 'quit' để thoát.")
    print("🚀 " * 15)

    sample_carts = [
        (["1"], "Giỏ có Chuột Logitech G Pro X Superlight 2 (ID: 1)"),
        (["15"], "Giỏ có Chuột Razer Orochi V2 (ID: 15)"),
        (["15", "290"], "Giỏ có Chuột Razer Orochi V2 + Bàn phím Akko 3108RF (ID: 15, 290)"),
        (["1", "290"], "Giỏ có Chuột Superlight 2 + Bàn phím Akko 3108RF (ID: 1, 290)"),
    ]
    print("\n💡 Gợi ý giỏ hàng mẫu để test nhanh:")
    for idx, (pids, desc) in enumerate(sample_carts, 1):
        print(f"   {idx}. Giỏ {pids} -> {desc}")

    while True:
        try:
            print("\n" + "-" * 68)
            inp = input("👉 Nhập Product ID trong giỏ (cách nhau dấu phẩy, chọn 1-4, Enter=mẫu [1]): ").strip()
            if inp.lower() in ("exit", "quit", "0"):
                print("Tạm biệt! 👋")
                break

            if inp in ("1", "2", "3", "4") and len(inp) == 1:
                selected_ids = sample_carts[int(inp) - 1][0]
            elif not inp:
                selected_ids = sample_carts[0][0]
            else:
                selected_ids = [x.strip() for x in inp.replace(" ", ",").split(",") if x.strip()]

            test_fpgrowth_visual(product_ids=selected_ids, top_n=10)
        except (KeyboardInterrupt, EOFError):
            print("\nTạm biệt! 👋")
            break


def test_fpgrowth(product_ids: list[str | int] | str | int = "1", top_n: int = 10) -> None:
    """Wrapper tương thích ngược với test suite."""
    test_fpgrowth_visual(product_ids=product_ids, top_n=top_n)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm thử trực quan gợi ý mua kèm (FP-Growth)")
    parser.add_argument("--ids", nargs="+", default=None, help="Danh sách Product ID trong giỏ hàng (ví dụ: --ids 15 290)")
    parser.add_argument("--top", type=int, default=10, help="Số lượng sản phẩm gợi ý (mặc định: 10)")
    args = parser.parse_args()

    if args.ids is not None:
        test_fpgrowth_visual(product_ids=args.ids, top_n=args.top)
    else:
        run_interactive_fpgrowth()


if __name__ == "__main__":
    main()
