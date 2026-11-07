"""Cấu hình của ML service, đọc từ biến môi trường (không hardcode credential)."""

from __future__ import annotations

import os
from pathlib import Path

# Thư mục gốc service: backend/ml-service
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = ROOT_DIR / "models"

# Nạp .env nếu có (không bắt buộc cài python-dotenv khi chạy test).
try:  # pragma: no cover - phụ thuộc môi trường
    from dotenv import load_dotenv

    load_dotenv(ROOT_DIR / ".env")
except ImportError:  # pragma: no cover
    pass


class Settings:
    """Cấu hình tối giản, đọc trực tiếp từ process.env."""

    def __init__(self) -> None:
        self.app_name = "Gear Shop ML Service"
        self.version = "1.0.0"
        self.host = os.getenv("ML_HOST", "127.0.0.1")
        self.port = int(os.getenv("ML_PORT", "8000"))
        # Nếu đặt token, các endpoint /admin/* yêu cầu header X-Internal-Token.
        self.internal_token = os.getenv("ML_INTERNAL_TOKEN", "").strip()


settings = Settings()
