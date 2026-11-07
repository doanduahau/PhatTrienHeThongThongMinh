"""Router tìm kiếm: ML chỉ phân tích câu truy vấn, backend tự truy vấn DB."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from ml_service.model_store import ModelNotReady, store
from ml_service.schemas import SearchParseRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


@router.post("/parse")
def parse_query(payload: SearchParseRequest) -> dict[str, Any]:
    """Trả intent + ràng buộc cứng + soft tags; không chạm database."""
    try:
        engine = store.get("search")
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        return engine.process_query(payload.query)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Phân tích truy vấn thất bại")
        raise HTTPException(status_code=500, detail=f"Không phân tích được truy vấn: {exc}") from exc
