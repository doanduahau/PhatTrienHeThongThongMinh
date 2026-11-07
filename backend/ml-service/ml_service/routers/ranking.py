"""Router xếp hạng sản phẩm nổi bật (Rating Baseline)."""

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

        rows = FeaturedProductsRanker().rank_from_db(category_id=category_id, top_n=limit)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Truy vấn sản phẩm nổi bật thất bại")
        raise HTTPException(status_code=503, detail=f"Không truy vấn được database: {exc}") from exc

    items = [
        FeaturedItem(
            product_id=str(row["product_id"]),
            rank=int(row["rank"]),
            score=float(row.get("rating", 0.0)),
        )
        for row in rows
    ]
    return FeaturedResponse(items=items)
