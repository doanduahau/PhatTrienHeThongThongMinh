"""Khối Gợi ý cho bạn (Personalized Recommendation) - Thuật toán: Cosine trên hồ sơ + K-Means.

Quy trình:
1. User Profiling: Xây dựng vector hồ sơ người dùng (User Profile Vector) dựa trên trọng số
   tương tác (đơn hàng: 5, giỏ hàng: 3) và đặc trưng sản phẩm đã tương tác trong PostgreSQL.
2. K-Means Clustering: Gom cụm người dùng thành K phân khúc sở thích.
3. Cosine Similarity & Cluster Boost: Tính độ tương đồng Cosine giữa hồ sơ người dùng
   và vector sản phẩm, kết hợp điểm phổ biến trong cụm để gợi ý cá nhân hóa.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler


class PersonalizedRecommender:
    """Hệ thống gợi ý cá nhân hóa kết hợp Cosine trên hồ sơ người dùng và K-Means clustering."""

    INTERACTION_WEIGHTS = {
        "view": 1.0,
        "like": 2.0,
        "cart": 3.0,
        "buy": 5.0,
    }

    def __init__(self, n_clusters: int = 4, random_state: int = 42) -> None:
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.tfidf = TfidfVectorizer(
            ngram_range=(1, 2),
            max_df=0.9,
            min_df=1,
            token_pattern=r"(?u)\b\w+\b",
        )
        self.scaler = MinMaxScaler()
        self.kmeans: KMeans | None = None

        self.products_df: pd.DataFrame = pd.DataFrame()
        self.product_features: np.ndarray | None = None
        self.product_id_to_idx: dict[str, int] = {}
        self.user_profiles: dict[str, np.ndarray] = {}
        self.user_clusters: dict[str, int] = {}
        self.cluster_popular_items: dict[int, list[str]] = {}

    def _build_item_text(self, row: pd.Series) -> str:
        parts = [
            str(row.get("name", "")),
            str(row.get("category_name", row.get("category", ""))),
            str(row.get("brand", "")),
            str(row.get("color", "")),
            str(row.get("connectivity", "")),
            str(row.get("hand_orientation", "")),
            str(row.get("layout", "")),
            str(row.get("headphone_type", "")),
            str(row.get("setup_category", "")),
            str(row.get("description", "")),
            str(row.get("tags", "")).replace(",", " "),
        ]
        return " ".join(p.strip() for p in parts if p.strip())

    def fit_from_db(self) -> "PersonalizedRecommender":
        """Nạp dữ liệu sản phẩm và lịch sử tương tác trực tiếp từ PostgreSQL Supabase."""
        from ml_service.db.repository import fetch_master_products_df, fetch_user_interactions

        products_df = fetch_master_products_df()
        interactions_df = fetch_user_interactions()
        return self.fit(products_df, interactions_df)

    def fit(
        self,
        products_df: pd.DataFrame,
        interactions_df: pd.DataFrame,
    ) -> "PersonalizedRecommender":
        """Huấn luyện trích xuất đặc trưng sản phẩm, hồ sơ người dùng và phân cụm K-Means."""
        if products_df.empty:
            raise ValueError("Dataframe sản phẩm rỗng, không thể huấn luyện.")

        self.products_df = products_df.copy().reset_index(drop=True)
        if "product_id" not in self.products_df.columns and "id" in self.products_df.columns:
            self.products_df["product_id"] = self.products_df["id"]

        self.products_df["product_id"] = self.products_df["product_id"].astype(str)
        self.product_id_to_idx = {
            pid: idx for idx, pid in enumerate(self.products_df["product_id"])
        }

        # 1. Trích xuất đặc trưng sản phẩm
        corpus = self.products_df.apply(self._build_item_text, axis=1).tolist()
        text_matrix = self.tfidf.fit_transform(corpus).toarray()

        if "price" in self.products_df.columns:
            prices = self.products_df[["price"]].fillna(0).to_numpy()
            price_scaled = self.scaler.fit_transform(prices)
            self.product_features = np.hstack([text_matrix, price_scaled * 0.2])
        else:
            self.product_features = text_matrix

        # 2. Xây dựng vector hồ sơ người dùng (User Profile Vector)
        if interactions_df.empty or "user_id" not in interactions_df.columns:
            self.user_profiles = {}
            self.user_clusters = {}
            self.cluster_popular_items = {}
            return self

        df_inter = interactions_df.copy()
        df_inter["product_id"] = df_inter["product_id"].astype(str)
        df_inter["user_id"] = df_inter["user_id"].astype(str)

        user_profiles_dict: dict[str, np.ndarray] = {}
        user_interacted_items: dict[str, set[str]] = {}

        for user_id, group in df_inter.groupby("user_id"):
            profile_vec = np.zeros(self.product_features.shape[1])
            total_weight = 0.0
            items_set = set()

            for _, row in group.iterrows():
                pid = row["product_id"]
                if pid not in self.product_id_to_idx:
                    continue

                items_set.add(pid)
                base_w = self.INTERACTION_WEIGHTS.get(str(row.get("interaction_type", "")).lower(), 1.0)
                weight = float(row.get("weight", base_w) or base_w)

                idx = self.product_id_to_idx[pid]
                profile_vec += self.product_features[idx] * weight
                total_weight += weight

            if total_weight > 0:
                user_profiles_dict[user_id] = profile_vec / total_weight
                user_interacted_items[user_id] = items_set

        self.user_profiles = user_profiles_dict

        # 3. Phân cụm người dùng bằng K-Means
        if len(self.user_profiles) >= self.n_clusters:
            effective_k = min(self.n_clusters, len(self.user_profiles))
            user_ids = list(self.user_profiles.keys())
            X_users = np.array([self.user_profiles[uid] for uid in user_ids])

            self.kmeans = KMeans(n_clusters=effective_k, random_state=self.random_state, n_init=10)
            cluster_labels = self.kmeans.fit_predict(X_users)
            self.user_clusters = {uid: int(label) for uid, label in zip(user_ids, cluster_labels)}

            self.cluster_popular_items = {}
            for k in range(effective_k):
                cluster_uids = [uid for uid, lbl in self.user_clusters.items() if lbl == k]
                cluster_items = [
                    item for uid in cluster_uids for item in user_interacted_items.get(uid, [])
                ]
                if cluster_items:
                    item_counts = pd.Series(cluster_items).value_counts()
                    self.cluster_popular_items[k] = item_counts.index.tolist()[:20]
        else:
            self.user_clusters = {}
            self.cluster_popular_items = {}

        return self

    def recommend(
        self,
        user_id: str | int,
        top_n: int = 10,
    ) -> list[dict[str, Any]]:
        """Gợi ý top N sản phẩm cá nhân hóa cho một người dùng cụ thể."""
        if self.product_features is None:
            raise RuntimeError("Mô hình chưa được fit(). Hãy gọi fit() hoặc fit_from_db() trước.")

        uid_str = str(user_id)
        if uid_str not in self.user_profiles:
            return self._cold_start_recommend(top_n)

        user_vec = self.user_profiles[uid_str].reshape(1, -1)
        sim_scores = cosine_similarity(user_vec, self.product_features)[0]

        cluster_id = self.user_clusters.get(uid_str)
        if cluster_id is not None and cluster_id in self.cluster_popular_items:
            popular_in_cluster = set(self.cluster_popular_items[cluster_id])
            for pid, idx in self.product_id_to_idx.items():
                if pid in popular_in_cluster:
                    sim_scores[idx] += 0.05

        sorted_indices = np.argsort(sim_scores)[::-1]

        results: list[dict[str, Any]] = []
        for idx in sorted_indices:
            row = self.products_df.iloc[idx]
            results.append({
                "product_id": str(row["product_id"]),
                "name": str(row.get("name", "")),
                "category": str(row.get("category_name", row.get("category", ""))),
                "brand": str(row.get("brand", "")),
                "price": float(row.get("price", 0.0)),
                "rating": float(row.get("rating", 0.0)),
                "image_url": str(row.get("image_url", "")),
                "match_score": round(float(sim_scores[idx]), 4),
            })
            if len(results) >= top_n:
                break

        return results

    def _cold_start_recommend(self, top_n: int) -> list[dict[str, Any]]:
        """Gợi ý fallback cho người dùng mới dựa trên rating cao trong DB."""
        df_copy = self.products_df.copy()
        if "rating" in df_copy.columns:
            df_copy = df_copy.sort_values(by="rating", ascending=False)
        items = df_copy.head(top_n)
        return [
            {
                "product_id": str(row["product_id"]),
                "name": str(row.get("name", "")),
                "category": str(row.get("category_name", row.get("category", ""))),
                "brand": str(row.get("brand", "")),
                "price": float(row.get("price", 0.0)),
                "rating": float(row.get("rating", 0.0)),
                "image_url": str(row.get("image_url", "")),
                "match_score": 0.5,
            }
            for _, row in items.iterrows()
        ]

    def save(self, path: str | Path) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "products_df": self.products_df,
                "product_features": self.product_features,
                "product_id_to_idx": self.product_id_to_idx,
                "user_profiles": self.user_profiles,
                "user_clusters": self.user_clusters,
                "cluster_popular_items": self.cluster_popular_items,
                "n_clusters": self.n_clusters,
            },
            target,
        )
        return target

    @classmethod
    def load(cls, path: str | Path) -> "PersonalizedRecommender":
        source = Path(path)
        if not source.exists():
            raise FileNotFoundError(f"Không tìm thấy model tại {source}")
        data = joblib.load(source)
        rec = cls(n_clusters=data["n_clusters"])
        rec.products_df = data["products_df"]
        rec.product_features = data["product_features"]
        rec.product_id_to_idx = data["product_id_to_idx"]
        rec.user_profiles = data["user_profiles"]
        rec.user_clusters = data["user_clusters"]
        rec.cluster_popular_items = data["cluster_popular_items"]
        return rec
