"""Cây quyết định phân lớp Nổi bật/Bình thường từ bốn đặc trưng.

Nhãn mặc định là nhãn mô phỏng của đồ án, không phải kết quả kinh doanh
được kiểm chứng. Khi có nhãn thật, truyền labels vào fit() để thay thế.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

FEATURE_COLUMNS = ("rating", "rating_count", "positive_ratio", "sold_count")
DEMO_LABEL_POLICY = (
    "demo_v1: rating >= 4.2 AND positive_ratio >= 0.75 AND "
    "(rating_count >= 3 OR delivered_units >= 3); "
    "rule-generated labels, not independently observed popularity"
)


def feature_frame(products: pd.DataFrame) -> pd.DataFrame:
    missing = set(FEATURE_COLUMNS) - set(products.columns)
    if missing:
        raise ValueError(f"Thiếu đặc trưng: {', '.join(sorted(missing))}")
    return products.loc[:, list(FEATURE_COLUMNS)].apply(pd.to_numeric, errors="coerce").fillna(0.0)


def make_demo_labels(products: pd.DataFrame) -> pd.Series:
    """Đáp án mô phỏng để đồ án có thể train với DB hiện tại."""
    x = feature_frame(products)
    return (
        (x["rating"] >= 4.2)
        & (x["positive_ratio"] >= 0.75)
        & ((x["rating_count"] >= 3) | (x["sold_count"] >= 3))
    ).astype(int)


class FeaturedProductsRanker:
    def __init__(self) -> None:
        # Cây entropy của scikit-learn (CART), không phải cài đặt C4.5/Gain Ratio.
        self.classifier = DecisionTreeClassifier(
            criterion="entropy", max_depth=3, min_samples_leaf=5, random_state=42
        )

    def fit(self, products: pd.DataFrame, labels: pd.Series) -> "FeaturedProductsRanker":
        x = feature_frame(products)
        y = pd.Series(labels).to_numpy()
        if len(x) != len(y) or set(y) != {0, 1}:
            raise ValueError("Dữ liệu train phải có đủ hai nhãn 0 và 1, mỗi dòng có một nhãn.")
        self.classifier.fit(x, y)
        return self

    def get_featured_products(self, products_df: pd.DataFrame, top_n: int = 10) -> list[dict[str, Any]]:
        if products_df.empty:
            return []
        if not hasattr(self.classifier, "classes_"):
            raise RuntimeError("Chưa train model nổi bật. Chạy scripts/train.py --model featured --source db.")
        df = products_df.copy()
        x = feature_frame(df)
        positive_index = list(self.classifier.classes_).index(1)
        df["featured_score"] = self.classifier.predict_proba(x)[:, positive_index]
        df = df.loc[self.classifier.predict(x) == 1]
        if "stock_quantity" in df:
            df = df.loc[df["stock_quantity"] > 0]
        # Các lá có thể cùng xác suất; ưu tiên nhiều đánh giá hơn khi bằng điểm.
        df = df.sort_values(
            ["featured_score", "rating_count", "rating"], ascending=False, kind="stable"
        ).head(top_n)
        return [
            {"rank": rank, "product_id": str(row["product_id"]), "featured_score": round(float(row["featured_score"]), 6)}
            for rank, (_, row) in enumerate(df.iterrows(), 1)
        ]

    def save(self, path: str | Path) -> Path:
        if not hasattr(self.classifier, "classes_"):
            raise RuntimeError("Không lưu model chưa train.")
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + ".tmp")
        joblib.dump({"classifier": self.classifier, "features": FEATURE_COLUMNS, "format_version": 1}, temporary)
        temporary.replace(target)
        return target

    @classmethod
    def load(cls, path: str | Path) -> "FeaturedProductsRanker":
        payload = joblib.load(path)
        if tuple(payload["features"]) != FEATURE_COLUMNS:
            raise ValueError("Danh sách đặc trưng trong model không phù hợp; cần train lại.")
        instance = cls()
        instance.classifier = payload["classifier"]
        return instance
