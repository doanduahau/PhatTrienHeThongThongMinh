"""Kiểm thử trực quan gợi ý cá nhân hóa (Cosine + K-Means).

Tính năng:
    - Nhập User ID (hoặc chạy tương tác chọn người dùng mẫu đại diện cho từng Cụm).
    - [1] Hiển thị lịch sử hành vi của User (Xem, Yêu thích, Thêm giỏ, Mua hàng) kèm trọng số.
    - [2] Hiển thị thông tin phân cụm K-Means (Cụm sở thích, chân dung Persona, Top SP xu hướng trong cụm).
    - [3] Trả danh sách sản phẩm gợi ý cá nhân hóa kèm:
          + Phân tách điểm Match Score = Điểm Cosine Hồ sơ cá nhân + Điểm cộng Xu hướng Cụm (+0.05 Cluster Boost).
          + Nhãn đánh dấu sản phẩm Hot trong cụm hoặc sản phẩm khớp gu cá nhân.

Cách chạy:
    # 1. Chế độ nhập tương tác trực quan:
    python cosine_kmeans/test.py

    # 2. Truyền tham số User ID trực tiếp:
    python cosine_kmeans/test.py --user 1
    python cosine_kmeans/test.py --user 42 --top 5
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from cosine_kmeans.model import PersonalizedRecommender
from fp_growth.test import load_product_catalog

CLUSTER_PERSONAS = {
    0: "Gamer eSports / Hiệu năng cao (Ưu tiên chuột siêu nhẹ, Polling rate cao, FPS/MOBA)",
    1: "Workstation / Công thái học (Ưu tiên form cầm thoải mái, Bàn phím/Ghế/Setup làm việc)",
    2: "Wireless / Đa năng & Di động (Ưu tiên kết nối Tri-mode/Bluetooth, Pin trâu, Setup gọn)",
}

ACTION_LABELS = {
    "view": ("👁️  Xem SP", 1.0),
    "like": ("❤️  Yêu thích", 2.0),
    "wishlist": ("❤️  Wishlist", 2.0),
    "cart": ("🛒 Thêm giỏ", 3.0),
    "add_to_cart": ("🛒 Thêm giỏ", 3.0),
    "buy": ("💳 Đã mua", 5.0),
    "purchase": ("💳 Đã mua", 5.0),
}


def format_vnd(amount: float) -> str:
    """Format tiền VNĐ dễ đọc."""
    return f"{int(amount):,} đ".replace(",", ".")


def render_score_bar(score: float, width: int = 18) -> str:
    """Thanh trực quan cho điểm Match Score."""
    clamped = max(0.0, min(1.0, score))
    filled = int(round(clamped * width))
    bar = "█" * filled + "░" * (width - filled)
    color = "\033[92m" if clamped >= 0.45 else ("\033[93m" if clamped >= 0.25 else "\033[96m")
    return f"{color}[{bar}] {score:.4f}\033[0m"


def get_user_history(user_id: str, catalog: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Đọc lịch sử tương tác thực tế của User từ data/cosine_kmeans.csv."""
    csv_path = ROOT_DIR / "data" / "cosine_kmeans.csv"
    if not csv_path.exists():
        return []
    try:
        df = pd.read_csv(csv_path)
        df["user_id"] = df["user_id"].astype(str)
        u_df = df[df["user_id"] == str(user_id)].copy()
        if u_df.empty:
            return []

        history: list[dict[str, Any]] = []
        for _, row in u_df.iterrows():
            pid = str(row["product_id"])
            itype = str(row.get("interaction_type", "view")).lower()
            label, weight = ACTION_LABELS.get(itype, (itype, 1.0))
            p_info = catalog.get(pid, {"name": f"Sản phẩm #{pid}", "category": "Phụ kiện", "price": 0.0})
            history.append({
                "product_id": pid,
                "name": p_info["name"],
                "category": p_info["category"],
                "price": p_info["price"],
                "action_label": label,
                "weight": weight,
                "dwell_time": row.get("dwell_time_seconds", 0),
            })
        return history
    except Exception:
        return []


def test_kmeans_visual(user_id: str | int = 1, top_n: int = 10) -> None:
    """Kiểm thử trực quan gợi ý cá nhân hóa (Cosine + K-Means)."""
    model_path = ROOT_DIR / "cosine_kmeans" / "personalized_model.joblib"
    if not model_path.exists():
        print(f"❌ Chưa có model tại {model_path}. Hãy chạy 'python train.py --model kmeans' trước.")
        return

    rec = PersonalizedRecommender.load(model_path)
    catalog = load_product_catalog()
    uid_str = str(user_id).strip()

    print("\n" + "═" * 80)
    print(" 👤 KIỂM THỬ TRỰC QUAN COSINE + K-MEANS (GỢI Ý CÁ NHÂN HÓA CHO BẠN)")
    print("═" * 80)

    # PHẦN 1: LỊCH SỬ TƯƠNG TÁC CỦA NGƯỜI DÙNG
    history = get_user_history(uid_str, catalog)
    print(f"\n📜 [1] HỒ SƠ & LỊCH SỬ HÀNH VI CỦA USER (USER ID: {uid_str}):")
    if history:
        print(f"   • Tổng số lượt tương tác ghi nhận: {len(history)} sự kiện")
        for h in history[:6]:
            print(
                f"     - {h['action_label']:<13} (Trọng số x{h['weight']:.0f}) ➔ "
                f"[ID {h['product_id']}] \033[1m{h['name']}\033[0m ({h['category']} - {format_vnd(h['price'])})"
            )
        if len(history) > 6:
            print(f"     ... và {len(history) - 6} tương tác khác.")
    else:
        print("   • Chưa có lịch sử tương tác trong tập dữ liệu (Người dùng mới / Cold-start).")

    # PHẦN 2: PHÂN CỤM K-MEANS & XU HƯỚNG NHÓM
    cluster_id = rec.user_clusters.get(uid_str)
    print("\n🧭 [2] PHÂN CỤM SỞ THÍCH K-MEANS (USER SEGMENTATION):")
    if cluster_id is not None:
        same_cluster_users = [u for u, c in rec.user_clusters.items() if c == cluster_id]
        persona = CLUSTER_PERSONAS.get(cluster_id, f"Phân khúc sở thích #{cluster_id}")
        pop_ids = rec.cluster_popular_items.get(cluster_id, [])[:5]
        pop_names = [f"[ID {p}] {catalog.get(str(p), {}).get('name', f'SP #{p}')}" for p in pop_ids]

        print(f"   • Cụm K-Means hiện tại : \033[1;92mCụm #{cluster_id}\033[0m (Cùng nhóm với {len(same_cluster_users)} users khác)")
        print(f"   • Chân dung (Persona)  : {persona}")
        if pop_names:
            print(f"   • Sản phẩm Hot ở Cụm #{cluster_id}: " + ", ".join(pop_names[:3]))
    else:
        print("   • Trạng thái phân cụm  : \033[93mCold-start (Khách mới)\033[0m -> Kích hoạt chế độ gợi ý theo Rating cao nhất.")
        sample_users_by_cluster = {
            k: [u for u, c in rec.user_clusters.items() if c == k][:4]
            for k in sorted(set(rec.user_clusters.values()))
        }
        print(f"   💡 Gợi ý các User ID đã có hồ sơ theo từng cụm: {sample_users_by_cluster}")

    # PHẦN 3: DANH SÁCH GỢI Ý & GIẢI THÍCH ĐIỂM SỐ
    results = rec.recommend(uid_str, top_n=top_n)
    print(f"\n🎁 [3] TOP {len(results)} SẢN PHẨM GỢI Ý CÁ NHÂN HÓA & GIẢI THÍCH ĐIỂM SỐ:")
    print("─" * 80)

    # Tính riêng Cosine gốc để minh bạch hóa phần cộng Cluster Boost (+0.05)
    raw_cos_map: dict[str, float] = {}
    popular_in_cluster: set[str] = set()
    interacted_pids = {h["product_id"] for h in history}

    if uid_str in rec.user_profiles and rec.product_features is not None:
        user_vec = rec.user_profiles[uid_str].reshape(1, -1)
        raw_sims = cosine_similarity(user_vec, rec.product_features)[0]
        for pid, idx in rec.product_id_to_idx.items():
            raw_cos_map[str(pid)] = float(raw_sims[idx])
        if cluster_id is not None:
            popular_in_cluster = set(str(x) for x in rec.cluster_popular_items.get(cluster_id, []))

    for rank, item in enumerate(results, start=1):
        pid = str(item["product_id"])
        total_score = item["match_score"]
        base_cos = raw_cos_map.get(pid, total_score)
        has_boost = pid in popular_in_cluster and uid_str in rec.user_profiles
        already_seen = pid in interacted_pids

        badges: list[str] = []
        if has_boost:
            badges.append("\033[95m🔥 Xu hướng Cụm (+0.05 Boost)\033[0m")
        if already_seen:
            badges.append("\033[96m↺ Đã từng tương tác\033[0m")
        else:
            badges.append("\033[92m✨ Gợi ý khám phá mới\033[0m")

        badge_str = " | ".join(badges)
        print(f"   {rank}. [ID {pid}] \033[1m{item['name']}\033[0m  ({badge_str})")
        print(f"      • Điểm phù hợp  : {render_score_bar(total_score)}", end="")
        if uid_str in rec.user_profiles:
            boost_txt = " + 0.0500 (Cluster Boost)" if has_boost else " + 0.0000 (Cluster Boost)"
            print(f"  [Cosine Hồ sơ: {base_cos:.4f}{boost_txt}]")
        else:
            print("  [Điểm mặc định Cold-start theo Rating]")
        print(f"      • Thông tin SP  : Danh mục: {item['category']} | Hãng: {item['brand']} | Giá: \033[93m{format_vnd(item['price'])}\033[0m | ⭐ {item['rating']}")
        print()

    print("═" * 80 + "\n")


def run_interactive_kmeans() -> None:
    """Giao diện dòng lệnh trực quan để test gợi ý cá nhân hóa theo các nhóm User."""
    print("\n" + "🚀 " * 15)
    print(" TRÌNH KIỂM THỬ TRỰC QUAN COSINE + K-MEANS (GỢI Ý CÁ NHÂN HÓA)")
    print(" Nhập User ID để xem: Lịch sử hành vi -> Phân cụm K-Means -> Giải thích điểm gợi ý")
    print(" Gõ 'exit' hoặc 'quit' để thoát.")
    print("🚀 " * 15)

    sample_users = [
        ("12", "User #12 (Thuộc Cụm #0 - Gamer eSports / Chuột siêu nhẹ)"),
        ("42", "User #42 (Thuộc Cụm #1 - Workstation / Công thái học)"),
        ("103", "User #103 (Thuộc Cụm #2 - Wireless / Đa năng & Di động)"),
        ("999", "User #999 (Khách hàng mới hoàn toàn - Test chế độ Cold-start)"),
    ]
    print("\n💡 Gợi ý User mẫu đại diện cho từng phân khúc để test nhanh:")
    for idx, (uid, desc) in enumerate(sample_users, 1):
        print(f"   {idx}. User ID={uid:<4} -> {desc}")

    while True:
        try:
            print("\n" + "-" * 68)
            inp = input("👉 Nhập User ID (hoặc chọn 1-4 theo mẫu trên, Enter=User 12): ").strip()
            if inp.lower() in ("exit", "quit", "0"):
                print("Tạm biệt! 👋")
                break

            if inp in ("1", "2", "3", "4") and len(inp) == 1:
                uid_val = sample_users[int(inp) - 1][0]
            elif not inp:
                uid_val = "12"
            else:
                uid_val = inp

            test_kmeans_visual(user_id=uid_val, top_n=10)
        except (KeyboardInterrupt, EOFError):
            print("\nTạm biệt! 👋")
            break


def test_kmeans(user_id: str | int = 1, top_n: int = 10) -> None:
    """Wrapper tương thích ngược với test suite."""
    test_kmeans_visual(user_id=user_id, top_n=top_n)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kiểm thử trực quan gợi ý cá nhân hóa (Cosine + K-Means)")
    parser.add_argument("--user", type=str, default=None, help="User ID cần gợi ý (ví dụ: 1, 12, 42, 103, 999)")
    parser.add_argument("--top", type=int, default=10, help="Số lượng sản phẩm gợi ý (mặc định: 10)")
    args = parser.parse_args()

    if args.user is not None:
        test_kmeans_visual(user_id=args.user, top_n=args.top)
    else:
        run_interactive_kmeans()


if __name__ == "__main__":
    main()
