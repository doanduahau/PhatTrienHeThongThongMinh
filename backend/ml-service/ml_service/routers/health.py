"""Health/readiness và thông tin model."""

from __future__ import annotations

from fastapi import APIRouter

from ml_service.config import settings
from ml_service.model_store import store
from ml_service.schemas import HealthResponse, ModelInfoResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, version=settings.version)


@router.get("/ready")
def ready() -> dict:
    models = store.info()
    missing = [m["key"] for m in models if not m["exists"]]
    return {
        "status": "ready" if not missing else "degraded",
        "missing_models": missing,
        "models": models,
    }


@router.get("/models", response_model=ModelInfoResponse)
def models() -> ModelInfoResponse:
    return ModelInfoResponse(models=store.info())
