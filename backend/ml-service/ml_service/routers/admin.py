"""Endpoint nội bộ: reload model sau khi train lại."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ml_service.deps import require_internal_token
from ml_service.model_store import store
from ml_service.schemas import ReloadResponse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_internal_token)])


@router.post("/reload", response_model=ReloadResponse)
def reload_models() -> ReloadResponse:
    return ReloadResponse(reloaded=True, models=store.reload())
