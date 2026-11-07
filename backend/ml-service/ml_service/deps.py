"""Dependency dùng chung cho router."""

from __future__ import annotations

from fastapi import Header, HTTPException

from ml_service.config import settings


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Nếu ML_INTERNAL_TOKEN được đặt, bắt buộc header X-Internal-Token khớp.

    Khi chạy local một mình, có thể để trống biến này để không phải cấu hình.
    """
    if not settings.internal_token:
        return
    if x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="Internal token không hợp lệ!")
