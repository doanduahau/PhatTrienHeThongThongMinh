"""Kiểm tra mô hình nổi bật mà không đọc/ghi database."""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.algorithms.decision_tree.ranking import FeaturedProductsRanker
from src.main import app


def purchase_training_data():
    # Cùng chất lượng đánh giá: chỉ sức mua phân biệt hai nhóm.
    return pd.DataFrame([
        {"product_id": str(i), "rating": 4.5, "rating_count": 2,
         "positive_ratio": 1.0, "sold_count": 10 if i >= 10 else 0,
         "stock_quantity": 5}
        for i in range(20)
    ])


def test_purchase_feature_and_model_roundtrip(tmp_path):
    products = purchase_training_data()
    ranker = FeaturedProductsRanker().fit(products, (products.sold_count > 0).astype(int))
    products.loc[10, "stock_quantity"] = 0
    expected = ranker.get_featured_products(products, top_n=3)
    assert [r["product_id"] for r in expected] == ["11", "12", "13"]
    assert all(0 <= r["featured_score"] <= 1 for r in expected)
    path = ranker.save(tmp_path / "featured.joblib")
    assert FeaturedProductsRanker.load(path).get_featured_products(products, top_n=3) == expected


def test_rejects_missing_class():
    products = purchase_training_data()
    with pytest.raises(ValueError, match="hai nhãn"):
        FeaturedProductsRanker().fit(products, pd.Series([0] * len(products)))


def test_featured_api_uses_trained_model_and_category(monkeypatch):
    import src.db.repository as repository
    from src.model_store import store

    products = purchase_training_data()
    ranker = FeaturedProductsRanker().fit(products, (products.sold_count > 0).astype(int))
    seen_categories = []

    def fetch(category_id=None):
        seen_categories.append(category_id)
        return products

    with TestClient(app) as client:
        monkeypatch.setattr(repository, "fetch_featured_products_df", fetch)
        monkeypatch.setitem(store._models, "featured", ranker)
        response = client.get("/ranking/featured?category_id=2&limit=2")
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "decision_tree"
    assert len(payload["items"]) == 2
    assert seen_categories == [2]
    assert all(set(item) == {"product_id", "rank", "score"} for item in payload["items"])
