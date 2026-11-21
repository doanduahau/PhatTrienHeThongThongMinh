"""Quản trị tệp CSV và model qua API nội bộ của ML service."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from src.config import settings
from src.datasets import MAX_DATASET_BYTES, dataset_path, list_datasets, save_dataset
from src.deps import require_internal_token
from src.model_store import store
from src.schemas import ModelInfoResponse, ReloadResponse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_internal_token)])
DatasetScope = Literal["original", "uploaded"]


def require_dataset_token() -> None:
    if not settings.internal_token:
        raise HTTPException(status_code=503, detail="Cần cấu hình ML_INTERNAL_TOKEN để quản lý tệp dữ liệu.")


dataset_router = APIRouter(prefix="/datasets", dependencies=[Depends(require_dataset_token)])


@router.get("/models", response_model=ModelInfoResponse)
def list_models() -> ModelInfoResponse:
    return ModelInfoResponse(models=store.info())


@router.post("/reload", response_model=ReloadResponse)
def reload_models(key: str | None = None) -> ReloadResponse:
    try:
        models = store.reload(key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy model.") from exc
    selected = [model for model in models if key is None or model["key"] == key]
    success = all(model["loaded"] and not model["error"] for model in selected)
    return ReloadResponse(reloaded=success, models=models)


@dataset_router.get("")
def datasets() -> dict:
    return {"datasets": list_datasets()}


@dataset_router.get("/{scope}/{name}")
def download_dataset(scope: DatasetScope, name: str) -> StreamingResponse:
    try:
        path = dataset_path(scope, name)
        if not path.is_file():
            raise FileNotFoundError(name)
        file = path.open("rb")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp dữ liệu.") from exc
    return StreamingResponse(
        iter(lambda: file.read(64 * 1024), b""),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
        background=BackgroundTask(file.close),
    )


@dataset_router.put("/uploaded/{name}")
async def upload_dataset(name: str, request: Request) -> dict:
    if request.headers.get("content-type") != "application/octet-stream":
        raise HTTPException(status_code=415, detail="Yêu cầu phải chứa nội dung tệp CSV.")
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > MAX_DATASET_BYTES:
            raise HTTPException(status_code=413, detail="Tệp CSV tối đa 10 MB.")
        content.extend(chunk)

    try:
        return await run_in_threadpool(save_dataset, name, bytes(content))
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail="Tệp đã tồn tại. Hãy đổi tên trước khi tải lên.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@dataset_router.delete("/uploaded/{name}")
def delete_dataset(name: str) -> dict:
    try:
        dataset_path("uploaded", name).unlink()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (FileNotFoundError, IsADirectoryError) as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp dữ liệu.") from exc
    return {"name": name}


router.include_router(dataset_router)
