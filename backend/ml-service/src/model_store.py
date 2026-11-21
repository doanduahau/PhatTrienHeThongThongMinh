"""Quản lý vòng đời model: nạp một lần khi khởi động, tái sử dụng, reload nóng.

Service không bao giờ đọc ``.joblib`` theo từng request. Mỗi model được nạp
một lần và giữ trong bộ nhớ; ``POST /admin/reload`` thay model đang dùng
sau khi nạp thành công tệp đã huấn luyện.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from src.config import MODELS_DIR, ROOT_DIR

logger = logging.getLogger(__name__)


class ModelNotReady(RuntimeError):
    """Model chưa có file hoặc nạp thất bại."""


@dataclass(frozen=True)
class ModelSpec:
    key: str
    label: str
    path: Path
    loader: Callable[[Path], Any]


def _load_similar(path: Path) -> Any:
    from src.algorithms.cosine.model import SimilarProductsRecommender

    return SimilarProductsRecommender.load(path)


def _load_bundles(path: Path) -> Any:
    from src.algorithms.fp_growth.model import FPGrowthRecommender

    return FPGrowthRecommender.load(path)


def _load_personalized(path: Path) -> Any:
    from src.algorithms.cosine_kmeans.model import PersonalizedRecommender

    return PersonalizedRecommender.load(path)


def _load_search(path: Path) -> Any:
    from src.algorithms.svm_regex.search_engine import SmartSearchEngine

    return SmartSearchEngine(path)


def _load_featured(path: Path) -> Any:
    from src.algorithms.decision_tree.ranking import FeaturedProductsRanker

    return FeaturedProductsRanker.load(path)


MODEL_SPECS: tuple[ModelSpec, ...] = (
    ModelSpec(
        key="featured",
        label="Sản phẩm nổi bật (Decision Tree)",
        path=MODELS_DIR / "featured_model.joblib",
        loader=_load_featured,
    ),
    ModelSpec(
        key="similar",
        label="Sản phẩm tương tự (Cosine Similarity)",
        path=MODELS_DIR / "similar_model.joblib",
        loader=_load_similar,
    ),
    ModelSpec(
        key="bundles",
        label="Thường mua kèm (FP-Growth)",
        path=MODELS_DIR / "rules_model.joblib",
        loader=_load_bundles,
    ),
    ModelSpec(
        key="personalized",
        label="Gợi ý cá nhân hóa (Cosine + K-Means)",
        path=MODELS_DIR / "personalized_model.joblib",
        loader=_load_personalized,
    ),
    ModelSpec(
        key="search",
        label="Tìm kiếm thông minh (SVM + Regex)",
        path=MODELS_DIR / "intent_model.joblib",
        loader=_load_search,
    ),
)


def _iso_mtime(path: Path) -> str | None:
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def _read_manifest(path: Path) -> dict[str, Any] | None:
    """Manifest do train.py ghi kèm model, ví dụ ``similar_model.manifest.json``."""
    manifest_path = path.with_suffix(".manifest.json")
    if not manifest_path.exists():
        return None
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("Không đọc được manifest %s", manifest_path)
        return None


class ModelStore:
    """Registry model an toàn luồng (thread-safe)."""

    def __init__(self, specs: tuple[ModelSpec, ...] = MODEL_SPECS) -> None:
        self._specs = {spec.key: spec for spec in specs}
        self._models: dict[str, Any] = {}
        self._errors: dict[str, str] = {}
        self._loaded_at: dict[str, str] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Any:
        spec = self._specs.get(key)
        if spec is None:
            raise KeyError(f"Không có model '{key}'")

        with self._lock:
            if key in self._models:
                return self._models[key]

            return self._load(spec)

    def _load(self, spec: ModelSpec) -> Any:
        key = spec.key
        if not spec.path.is_file():
            message = f"Thiếu tệp model {spec.path.name}. Hãy chạy scripts/train.py."
            self._errors[key] = message
            raise ModelNotReady(message)

        try:
            model = spec.loader(spec.path)
        except Exception as exc:  # noqa: BLE001 - biến mọi lỗi nạp thành 503
            self._errors[key] = str(exc)
            logger.exception("Nạp model '%s' thất bại", key)
            raise ModelNotReady(f"Không nạp được model '{key}': {exc}") from exc

        self._models[key] = model
        self._errors.pop(key, None)
        self._loaded_at[key] = datetime.now(tz=timezone.utc).isoformat()
        logger.info("Đã nạp model '%s' từ %s", key, spec.path)
        return model

    def preload(self) -> None:
        """Nạp trước toàn bộ model; lỗi được log lại để service vẫn khởi động."""
        for key in self._specs:
            try:
                self.get(key)
            except ModelNotReady as exc:
                logger.warning("Bỏ qua model '%s': %s", key, exc)

    def reload(self, key: str | None = None) -> list[dict[str, Any]]:
        specs = (self._specs[key],) if key is not None else self._specs.values()
        for spec in specs:
            with self._lock:
                try:
                    self._load(spec)
                except ModelNotReady as exc:
                    logger.warning("Giữ nguyên trạng thái model '%s': %s", spec.key, exc)
        return self.info()

    def info(self) -> list[dict[str, Any]]:
        with self._lock:
            result: list[dict[str, Any]] = []
            for key, spec in self._specs.items():
                exists = spec.path.exists()
                result.append(
                    {
                        "key": key,
                        "label": spec.label,
                        "path": str(spec.path.relative_to(ROOT_DIR)).replace("\\", "/"),
                        "exists": exists,
                        "loaded": key in self._models,
                        "loaded_at": self._loaded_at.get(key),
                        "modified_at": _iso_mtime(spec.path),
                        "size_bytes": spec.path.stat().st_size if exists else None,
                        "manifest": _read_manifest(spec.path),
                        "error": self._errors.get(key),
                    }
                )
            return result


store = ModelStore()
