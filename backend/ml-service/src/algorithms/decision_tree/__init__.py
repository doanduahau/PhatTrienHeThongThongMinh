"""Cây quyết định cho sản phẩm nổi bật."""

from .ranking import FEATURE_COLUMNS, FeaturedProductsRanker, make_demo_labels

__all__ = ["FEATURE_COLUMNS", "FeaturedProductsRanker", "make_demo_labels"]
