"""Entrypoint FastAPI của ML service.

Chạy từ thư mục ``backend/ml-service``::

    .\\venv\\Scripts\\python.exe -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload

Service chỉ nên bind 127.0.0.1 và được gọi nội bộ từ backend.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ml_service.config import settings
from ml_service.model_store import store
from ml_service.routers import admin, health, ranking, recommend, search

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Đang nạp model AI...")
    store.preload()
    logger.info("ML service sẵn sàng tại http://%s:%s", settings.host, settings.port)
    yield
    logger.info("ML service dừng.")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Các thuật toán gợi ý và tìm kiếm thông minh cho shop gear gaming.",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(recommend.router)
app.include_router(search.router)
app.include_router(ranking.router)
app.include_router(admin.router)


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("ml_service.main:app", host=settings.host, port=settings.port, reload=True)
