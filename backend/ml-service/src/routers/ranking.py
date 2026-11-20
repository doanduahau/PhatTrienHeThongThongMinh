"""Router xếp hạng sản phẩm nổi bật bằng cây quyết định đã train."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from src.schemas import FeaturedItem, FeaturedResponse
from src.model_store import ModelNotReady, store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ranking", tags=["ranking"])


@router.get("/featured", response_model=FeaturedResponse)
def featured_products(
    category_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
) -> FeaturedResponse:
    try:
        from src.db.repository import fetch_featured_products_df

        ranker = store.get("featured")
        products_df = fetch_featured_products_df(category_id=category_id)
        ranked = ranker.get_featured_products(products_df, top_n=limit)
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
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
    return FeaturedResponse(model="decision_tree", items=items)
