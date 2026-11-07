"""Khối Sản phẩm nổi bật (Featured Products) - Thuật toán: Sắp xếp theo Rating (Baseline).

Sử dụng thuật toán xếp hạng theo Rating chuẩn hóa (Bayesian Average Rating)
kết hợp giữa điểm sao trung bình (Rating) và số lượng đánh giá (Review Count),
hoặc truy vấn trực tiếp bảng products và order_items trong PostgreSQL Supabase.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


class FeaturedProductsRanker:
    """Xếp hạng sản phẩm nổi bật dựa trên điểm đánh giá và độ uy tín (Baseline)."""

    def __init__(self, min_reviews_quantile: float = 0.5) -> None:
        self.min_reviews_quantile = min_reviews_quantile

    def rank_from_db(
        self,
        category_id: int | None = None,
        top_n: int = 10,
    ) -> list[dict[str, Any]]:
        """Truy vấn trực tiếp danh sách sản phẩm nổi bật nhất từ PostgreSQL Supabase."""
        from ml_service.db.repository import fetch_featured_products_from_db

        return fetch_featured_products_from_db(category_id=category_id, limit=top_n)

    def calculate_bayesian_score(self, df: pd.DataFrame) -> pd.Series:
        """Tính điểm Bayesian Weighted Rating (công thức tương tự IMDB)."""
        R = df["rating"].fillna(0)
        v = df["review_count"].fillna(0) if "review_count" in df.columns else pd.Series([1.0] * len(df))
        C = R.mean() if len(R) > 0 else 0.0

        m = max(3.0, float(v.quantile(self.min_reviews_quantile)) if len(v) > 0 else 3.0)
        bayesian_scores = (v / (v + m)) * R + (m / (v + m)) * C
        return bayesian_scores

    def get_featured_products(
        self,
        products_df: pd.DataFrame,
        category: str | None = None,
        brand: str | None = None,
        top_n: int = 10,
        include_sold_boost: bool = True,
    ) -> list[dict[str, Any]]:
        """Lấy danh sách các sản phẩm nổi bật từ một DataFrame truyền vào."""
        if products_df.empty:
            return []

        df = products_df.copy()

        if category:
            cat_col = "category_name" if "category_name" in df.columns else "category"
            if cat_col in df.columns:
                df = df[df[cat_col].astype(str).str.lower() == category.lower()]

        if brand and "brand" in df.columns:
            df = df[df["brand"].astype(str).str.lower() == brand.lower()]

        if df.empty:
            return []

        for col in ("rating", "review_count", "sold_count"):
            if col not in df.columns:
                df[col] = 0.0
            else:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        df["featured_score"] = self.calculate_bayesian_score(df)

        if include_sold_boost and "sold_count" in df.columns:
            max_sold = df["sold_count"].max()
            if max_sold > 0:
                sold_boost = np.log1p(df["sold_count"]) / np.log1p(max_sold) * 0.5
                df["featured_score"] += sold_boost

        df_sorted = df.sort_values(by="featured_score", ascending=False).head(top_n)

        results: list[dict[str, Any]] = []
        for rank, (_, row) in enumerate(df_sorted.iterrows(), start=1):
            results.append({
                "rank": rank,
                "product_id": str(row.get("product_id", row.get("id", ""))),
                "name": str(row.get("name", "")),
                "category": str(row.get("category_name", row.get("category", ""))),
                "brand": str(row.get("brand", "")),
                "price": float(row.get("price", 0.0)),
                "rating": round(float(row.get("rating", 0.0)), 2),
                "review_count": int(row.get("review_count", 0)),
                "sold_count": int(row.get("sold_count", 0)),
                "featured_score": round(float(row["featured_score"]), 4),
            })

        return results
