"""Script tổng hợp huấn luyện toàn bộ các mô hình AI & Recommender System.

Hỗ trợ huấn luyện từ file CSV (trong thư mục `data/`) hoặc trực tiếp từ Database PostgreSQL (Supabase).

Cách sử dụng (chạy từ thư mục ``backend/ml-service``):
    # Huấn luyện tất cả các mô hình từ dữ liệu CSV:
    .\\venv\\Scripts\\python.exe scripts\\train.py

    # Huấn luyện từng mô hình cụ thể:
    .\\venv\\Scripts\\python.exe scripts\\train.py --model cosine
    .\\venv\\Scripts\\python.exe scripts\\train.py --model fp_growth
    .\\venv\\Scripts\\python.exe scripts\\train.py --model kmeans
    .\\venv\\Scripts\\python.exe scripts\\train.py --model svm

    # Huấn luyện từ CSDL Supabase (khi đã cấu hình .env / DB):
    .\\venv\\Scripts\\python.exe scripts\\train.py --source db
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

# Đường dẫn thư mục gốc service (backend/ml-service)
ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = ROOT_DIR / "models"

# Cho phép import package ml_service khi chạy script trực tiếp.
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def _write_manifest(model_path: Path, metrics: dict | None = None) -> Path:
    """Ghi manifest cạnh model để service báo được version/ngày train."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "version": now.strftime("%Y%m%d%H%M%S"),
        "trained_at": now.isoformat(),
        "source": "train.py",
        "metrics": metrics or {},
    }
    target = model_path.with_suffix(".manifest.json")
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def train_cosine(source: str = "csv") -> None:
    """Huấn luyện mô hình Cosine Similarity (Sản phẩm tương tự)."""
    print("\n" + "=" * 60)
    print("▶ [1/4] HUẤN LUYỆN: Cosine Similarity (Sản phẩm tương tự)")
    print("=" * 60)
    from ml_service.algorithms.cosine.model import SimilarProductsRecommender

    recommender = SimilarProductsRecommender()
    if source == "db":
        print("  - Nạp dữ liệu từ PostgreSQL Supabase...")
        recommender.fit_from_db()
    else:
        csv_path = DATA_DIR / "cosine.csv"
        print(f"  - Đọc dữ liệu từ file: {csv_path}...")
        df = pd.read_csv(csv_path)
        print(f"    + Số lượng sản phẩm: {len(df)}")
        recommender.fit(df)

    save_path = MODELS_DIR / "similar_model.joblib"
    recommender.save(save_path)
    _write_manifest(save_path, {"products": int(len(recommender.products_df))})
    print(f"  ✓ Đã lưu mô hình tại: {save_path}")

    # Demo kết quả gợi ý
    sample_pid = recommender.products_df.iloc[0]["product_id"]
    sample_name = recommender.products_df.iloc[0].get("name", "")
    recs = recommender.recommend(sample_pid, top_n=3)
    print(f"  ★ Demo gợi ý sản phẩm tương tự cho '{sample_name}' (ID={sample_pid}):")
    for r in recs:
        print(f"    -> [ID: {r['product_id']}] {r['name']} | Hãng: {r['brand']} | Sim Score: {r['similarity_score']}")


def train_fp_growth(source: str = "csv") -> None:
    """Huấn luyện mô hình FP-Growth (Sản phẩm thường mua kèm)."""
    print("\n" + "=" * 60)
    print("▶ [2/4] HUẤN LUYỆN: FP-Growth (Thường mua kèm)")
    print("=" * 60)
    from ml_service.algorithms.fp_growth.model import FPGrowthRecommender

    recommender = FPGrowthRecommender(min_support=0.01, min_confidence=0.1, min_lift=1.0)
    if source == "db":
        print("  - Nạp lịch sử đơn hàng từ PostgreSQL Supabase...")
        recommender.fit_from_db()
        if not recommender.rules:
            csv_path = DATA_DIR / "fp_growth.csv"
            print(f"    (Chưa có đơn hàng trong DB -> nạp giao dịch từ {csv_path.name} với Product ID 1..405 khớp DB)")
            df = pd.read_csv(csv_path)
            recommender.fit(df)
    else:
        csv_path = DATA_DIR / "fp_growth.csv"
        print(f"  - Đọc lịch sử giao dịch từ file: {csv_path}...")
        df = pd.read_csv(csv_path)
        print(f"    + Số dòng giao dịch: {len(df)} | Số đơn hàng: {df['order_id'].nunique()}")
        recommender.fit(df)

    save_path = MODELS_DIR / "rules_model.joblib"
    recommender.save(save_path)
    _write_manifest(save_path, {"rules": len(recommender.rules)})
    print(f"  ✓ Đã khai phá được {len(recommender.rules)} luật kết hợp mua kèm.")
    print(f"  ✓ Đã lưu mô hình tại: {save_path}")

    # Demo kết quả gợi ý
    sample_item = "1"
    recs = recommender.recommend([sample_item], top_n=3)
    print(f"  ★ Demo gợi ý mua kèm khi chọn sản phẩm ID={sample_item}:")
    if recs:
        for r in recs:
            print(f"    -> Mua kèm [ID: {r['product_id']}] | Confidence: {r['confidence']} | Lift: {r['lift']}")
    else:
        print("    (Chưa có luật kết hợp đủ ngưỡng cho sản phẩm này)")


def train_kmeans(source: str = "csv") -> None:
    """Huấn luyện mô hình Cosine + K-Means (Gợi ý cá nhân hóa)."""
    print("\n" + "=" * 60)
    print("▶ [3/4] HUẤN LUYỆN: Cosine + K-Means (Gợi ý cho bạn)")
    print("=" * 60)
    from ml_service.algorithms.cosine_kmeans.model import PersonalizedRecommender

    recommender = PersonalizedRecommender(n_clusters=3, random_state=42)
    if source == "db":
        print("  - Nạp dữ liệu sản phẩm & tương tác từ PostgreSQL Supabase...")
        from ml_service.db.repository import fetch_master_products_df, fetch_user_interactions

        products_df = fetch_master_products_df()
        inter_df = fetch_user_interactions()
        if inter_df.empty:
            inter_path = DATA_DIR / "cosine_kmeans.csv"
            print(f"    (Chưa có đơn hàng trong DB -> kết hợp lịch sử tương tác từ {inter_path.name} với {len(products_df)} sản phẩm DB)")
            inter_df = pd.read_csv(inter_path)
        recommender.fit(products_df, inter_df)
    else:
        products_path = DATA_DIR / "cosine.csv"
        inter_path = DATA_DIR / "cosine_kmeans.csv"
        print(f"  - Đọc sản phẩm: {products_path}")
        print(f"  - Đọc tương tác người dùng: {inter_path}")
        products_df = pd.read_csv(products_path)
        inter_df = pd.read_csv(inter_path)
        print(f"    + Sản phẩm: {len(products_df)} | Tương tác: {len(inter_df)} | Số users: {inter_df['user_id'].nunique()}")
        recommender.fit(products_df, inter_df)

    save_path = MODELS_DIR / "personalized_model.joblib"
    recommender.save(save_path)
    _write_manifest(
        save_path,
        {
            "users": len(recommender.user_profiles),
            "products": int(len(recommender.products_df)),
        },
    )
    print(f"  ✓ Đã tạo {len(recommender.user_profiles)} vector hồ sơ người dùng.")
    print(f"  ✓ Đã phân cụm thành {len(set(recommender.user_clusters.values()))} nhóm sở thích K-Means.")
    print(f"  ✓ Đã lưu mô hình tại: {save_path}")

    # Demo kết quả gợi ý cho user 1
    sample_user = "1"
    recs = recommender.recommend(sample_user, top_n=3)
    print(f"  ★ Demo gợi ý cá nhân hóa cho User ID={sample_user}:")
    for r in recs:
        print(f"    -> [ID: {r['product_id']}] {r['name']} | Danh mục: {r['category']} | Match: {r['match_score']}")


def train_svm(source: str = "csv") -> None:
    """Huấn luyện mô hình LinearSVC + TF-IDF (Phân loại intent tìm kiếm thông minh)."""
    print("\n" + "=" * 60)
    print("▶ [4/4] HUẤN LUYỆN: LinearSVC + TF-IDF (Tìm kiếm thông minh)")
    print("=" * 60)
    from ml_service.algorithms.svm_regex.intent_classifier import IntentClassifier

    csv_path = DATA_DIR / "svm_regex.csv"
    print(f"  - Đọc tập dữ liệu intent từ file: {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"    + Số câu huấn luyện: {len(df)}")
    print(f"    + Phân bố nhãn: {df['intent'].value_counts().to_dict()}")

    classifier = IntentClassifier(cv=5)
    classifier.train(df["text"].tolist(), df["intent"].tolist())

    save_path = MODELS_DIR / "intent_model.joblib"
    classifier.save(save_path)
    _write_manifest(save_path, {"intents": int(df["intent"].nunique()), "samples": int(len(df))})
    print(f"  ✓ Đã lưu mô hình tại: {save_path}")

    # Demo kết quả phân loại
    test_queries = [
        "tìm chuột không dây siêu nhẹ chơi cs2",
        "thời tiết hôm nay thế nào",
    ]
    print("  ★ Demo phân loại ý định tìm kiếm:")
    for q in test_queries:
        pred = classifier.predict(q)
        print(f"    -> '{q}' => Intent: {pred['intent']} (Confidence: {pred['confidence']})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chương trình huấn luyện các mô hình AI Phụ Kiện Máy Tính")
    parser.add_argument(
        "--model",
        choices=["all", "cosine", "fp_growth", "kmeans", "svm"],
        default="all",
        help="Chọn mô hình cần huấn luyện (mặc định: 'all')",
    )
    parser.add_argument(
        "--source",
        choices=["csv", "db"],
        default="csv",
        help="Nguồn dữ liệu huấn luyện: 'csv' (từ thư mục data/) hoặc 'db' (từ PostgreSQL Supabase)",
    )

    args = parser.parse_args()

    print("\n" + "🚀 " * 15)
    print(f"BẮT ĐẦU QUÁ TRÌNH HUẤN LUYỆN (Model: {args.model.upper()}, Source: {args.source.upper()})")
    print("🚀 " * 15)

    try:
        if args.model in ("all", "cosine"):
            train_cosine(args.source)

        if args.model in ("all", "fp_growth"):
            train_fp_growth(args.source)

        if args.model in ("all", "kmeans"):
            train_kmeans(args.source)

        if args.model in ("all", "svm"):
            train_svm(args.source)

        print("\n" + "🎉 " * 15)
        print("TẤT CẢ CÁC MÔ HÌNH ĐÃ ĐƯỢC HUẤN LUYỆN VÀ LƯU THÀNH CÔNG!")
        print("🎉 " * 15 + "\n")
    except Exception as e:
        print(f"\n❌ LỖI TRONG QUÁ TRÌNH HUẤN LUYỆN: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

