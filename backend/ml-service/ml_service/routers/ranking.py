"""Router xếp hạng sản phẩm nổi bật (Bayesian Weighted Rating)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from ml_service.schemas import FeaturedItem, FeaturedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ranking", tags=["ranking"])


@router.get("/featured", response_model=FeaturedResponse)
def featured_products(
    category_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
) -> FeaturedResponse:
    try:
        from ml_service.algorithms.rating_baseline.ranking import FeaturedProductsRanker
        from ml_service.db.repository import fetch_featured_products_df

        products_df = fetch_featured_products_df(category_id=category_id)
        # Sold boost tắt vì toàn catalog mới có 1 lượt bán trong order_items:
        # phần thưởng log1p chuẩn hoá theo max sẽ ghim đúng sản phẩm đó lên hạng nhất,
        # biến nhiễu thành tín hiệu. Bật lại khi dữ liệu đơn hàng đủ dày.
        ranked = FeaturedProductsRanker().get_featured_products(
            products_df,
            top_n=limit,
            include_sold_boost=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Xếp hạng sản phẩm nổi bật thất bại")
        raise HTTPException(status_code=503, detail=f"Không xếp hạng được: {exc}") from exc

    items = [
        FeaturedItem(
            product_id=str(row["product_id"]),
            rank=int(row["rank"]),
            score=float(row["featured_score"]),
        )
        for row in ranked
    ]
    return FeaturedResponse(model="bayesian_weighted_rating", items=items)
