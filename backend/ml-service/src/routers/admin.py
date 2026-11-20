"""Endpoint nội bộ: reload model sau khi train lại."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from src.deps import require_internal_token
from src.model_store import store
from src.schemas import ReloadResponse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_internal_token)])


@router.post("/reload", response_model=ReloadResponse)
def reload_models() -> ReloadResponse:
    return ReloadResponse(reloaded=True, models=store.reload())
