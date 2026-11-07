"""Khối Sản phẩm tương tự (Similar Products) - Thuật toán: Cosine Similarity.

Xây dựng ma trận đặc trưng từ thuộc tính sản phẩm trong PostgreSQL Supabase
(Tên, Danh mục, Thương hiệu, Màu sắc, Kết nối, Cân nặng, Switch, Sensor, Layout, Form tay...),
sau đó tính độ tương đồng Cosine để tìm ra các sản phẩm tương đồng nhất.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler


class SimilarProductsRecommender:
    """Hệ thống gợi ý sản phẩm tương tự bằng Cosine Similarity."""

    def __init__(self) -> None:
        self.tfidf = TfidfVectorizer(
            ngram_range=(1, 2),
            max_df=0.9,
            min_df=1,
            token_pattern=r"(?u)\b\w+\b",
        )
        self.scaler = MinMaxScaler()
        self.products_df: pd.DataFrame = pd.DataFrame()
        self.feature_matrix: np.ndarray | None = None
        self.similarity_matrix: np.ndarray | None = None
        self.id_to_index: dict[str, int] = {}
        self.index_to_id: dict[int, str] = {}

    def _build_content_text(self, row: pd.Series) -> str:
        """Kết hợp các trường thông số kỹ thuật thực tế trong DB/CSV thành chuỗi đặc trưng ngữ nghĩa."""
        parts = [
            str(row.get("name", "")),
            str(row.get("category_name", row.get("category", ""))),
            str(row.get("brand", "")),
            str(row.get("color", "")),
            str(row.get("connectivity", "")),
            str(row.get("hand_orientation", "")),
            str(row.get("mouse_switch", "")),
            str(row.get("keyboard_switch", "")),
            str(row.get("sensor", "")),
            str(row.get("layout", "")),
            str(row.get("headphone_type", "")),
            str(row.get("pad_type", "")),
            str(row.get("setup_category", "")),
            str(row.get("description", "")),
            str(row.get("specs", "")),
            str(row.get("tags", "")).replace(",", " "),
        ]
        # Bổ sung các cờ boolean
        if row.get("has_rapid_trigger"):
            parts.append("rapid trigger nam cham hall effect")
        if row.get("has_hotswap"):
            parts.append("hotswap thay switch")
        if row.get("support_macos"):
            parts.append("ho tro mac macos macbook")
        if row.get("has_mic"):
            parts.append("co micro dam thoai")
        if row.get("has_anc"):
            parts.append("chong on chu dong anc")

        # Cân nặng siêu nhẹ
        weight = row.get("weight_g")
        if weight and float(weight) <= 60:
            parts.append("sieu nhe under 60g")

        return " ".join(p.strip() for p in parts if p.strip())

    def fit_from_db(self) -> "SimilarProductsRecommender":
        """Nạp dữ liệu 405 sản phẩm trực tiếp từ PostgreSQL Supabase và huấn luyện ma trận Cosine."""
        from ml_service.db.repository import fetch_master_products_df

        df = fetch_master_products_df()
        return self.fit(df)

    def fit(self, products_df: pd.DataFrame) -> "SimilarProductsRecommender":
        """Xây dựng ma trận đặc trưng và ma trận Cosine Similarity từ dataframe sản phẩm."""
        if products_df.empty:
            raise ValueError("Dataframe sản phẩm rỗng, không thể huấn luyện.")

        self.products_df = products_df.copy().reset_index(drop=True)
        if "product_id" not in self.products_df.columns and "id" in self.products_df.columns:
            self.products_df["product_id"] = self.products_df["id"]

        self.products_df["product_id"] = self.products_df["product_id"].astype(str)
        self.id_to_index = {
            pid: idx for idx, pid in enumerate(self.products_df["product_id"])
        }
        self.index_to_id = {
            idx: pid for idx, pid in enumerate(self.products_df["product_id"])
        }

        # 1. Trích xuất đặc trưng văn bản bằng TF-IDF
        corpus = self.products_df.apply(self._build_content_text, axis=1).tolist()
        text_features = self.tfidf.fit_transform(corpus).toarray()

        # 2. Chuẩn hóa giá tiền
        if "price" in self.products_df.columns:
            prices = self.products_df[["price"]].fillna(0).to_numpy()
            price_scaled = self.scaler.fit_transform(prices)
            self.feature_matrix = np.hstack([text_features, price_scaled * 0.25])
        else:
            self.feature_matrix = text_features

        # 3. Tính ma trận Cosine Similarity
        self.similarity_matrix = cosine_similarity(self.feature_matrix)
        return self

    def recommend(
        self,
        product_id: str | int,
        top_n: int = 10,
        same_category_only: bool = False,
    ) -> list[dict[str, Any]]:
        """Lấy danh sách top N sản phẩm tương tự với một sản phẩm mục tiêu (sắp xếp giảm dần)."""
        if self.similarity_matrix is None:
            raise RuntimeError("Mô hình chưa được fit(). Hãy gọi fit() hoặc fit_from_db() trước.")

        pid_str = str(product_id)
        if pid_str not in self.id_to_index:
            raise KeyError(f"Không tìm thấy product_id '{pid_str}' trong hệ thống.")

        idx = self.id_to_index[pid_str]
        sim_scores = self.similarity_matrix[idx]
        sorted_indices = np.argsort(sim_scores)[::-1]

        target_cat = self.products_df.loc[idx, "category_name"] if "category_name" in self.products_df.columns else None

        results: list[dict[str, Any]] = []
        for i in sorted_indices:
            if i == idx:
                continue  # Bỏ qua chính nó

            row = self.products_df.iloc[i]
            if same_category_only and target_cat and row.get("category_name") != target_cat:
                continue

            results.append({
                "product_id": str(row["product_id"]),
                "name": str(row.get("name", "")),
                "category": str(row.get("category_name", row.get("category", ""))),
                "brand": str(row.get("brand", "")),
                "price": float(row.get("price", 0.0)),
                "rating": float(row.get("rating", 0.0)),
                "image_url": str(row.get("image_url", "")),
                "similarity_score": round(float(sim_scores[i]), 4),
            })

            if len(results) >= top_n:
                break

        return results

    def save(self, path: str | Path) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "products_df": self.products_df,
                "similarity_matrix": self.similarity_matrix,
                "id_to_index": self.id_to_index,
                "index_to_id": self.index_to_id,
            },
            target,
        )
        return target

    @classmethod
    def load(cls, path: str | Path) -> "SimilarProductsRecommender":
        source = Path(path)
        if not source.exists():
            raise FileNotFoundError(f"Không tìm thấy model tại {source}")
        data = joblib.load(source)
        recommender = cls()
        recommender.products_df = data["products_df"]
        recommender.similarity_matrix = data["similarity_matrix"]
        recommender.id_to_index = data["id_to_index"]
        recommender.index_to_id = data["index_to_id"]
        return recommender
