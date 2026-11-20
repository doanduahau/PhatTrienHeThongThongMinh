"""Xem sản phẩm nổi bật và quy tắc cây đã học: python -m src.algorithms.decision_tree.demo --top 5."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def test_featured_visual(top_n: int = 10, category: str | None = None, brand: str | None = None) -> None:
    from sklearn.tree import export_text
    from src.db.repository import fetch_featured_products_df
    from src.model_store import store

    ranker = store.get("featured")
    products = fetch_featured_products_df()
    if category:
        products = products.loc[products["category_name"].str.casefold() == category.casefold()]
    if brand:
        products = products.loc[products["brand"].str.casefold() == brand.casefold()]
    print("Decision Tree: Nhan mo phong do an, khong phai danh gia kinh doanh thuc te.")
    print(export_text(ranker.classifier, feature_names=list(ranker.classifier.feature_names_in_)))
    by_id = products.set_index("product_id")
    for item in ranker.get_featured_products(products, top_n=top_n):
        product = by_id.loc[item["product_id"]]
        print(f"{item['rank']:2}. #{item['product_id']} {product['name']} | score={item['featured_score']:.3f}")


def test_featured(top_n: int = 10) -> None:
    test_featured_visual(top_n=top_n)


def run_interactive_featured() -> None:
    test_featured_visual(
        category=input("Danh muc (Enter = tat ca): ").strip() or None,
        brand=input("Thuong hieu (Enter = tat ca): ").strip() or None,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Demo Decision Tree cho san pham noi bat")
    parser.add_argument("--top", type=int, default=5)
    parser.add_argument("--category")
    parser.add_argument("--brand")
    args = parser.parse_args()
    test_featured_visual(args.top, args.category, args.brand)
