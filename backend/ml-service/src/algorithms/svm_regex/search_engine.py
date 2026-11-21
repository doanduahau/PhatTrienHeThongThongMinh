"""Khối Tìm kiếm thông minh (Smart Search) - Thuật toán: SVM + Regex.

Kết hợp:
1. SVM (Calibrated LinearSVC + TF-IDF): Phân loại intent (tim_kiem_san_pham vs ngoai_pham_vi).
2. Regex Rules: Bóc tách ràng buộc cứng (giá min/max, danh mục, kết nối, cân nặng...).
3. Regex Soft Tags: Bóc tách 42 thuộc tính mềm (claw grip, silent, thocky, ergonomic...).

Business service ánh xạ kết quả parse sang truy vấn Prisma.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .constants import INTENT_LABELS
from .hard_rules import extract_hard_constraints
from .intent_classifier import IntentClassifier
from .tag_extractor import extract_soft_tags

from ...config import MODELS_DIR


DEFAULT_MODEL_PATH = MODELS_DIR / "intent_model.joblib"


class SmartSearchEngine:
    """Bộ phân tích tìm kiếm bằng SVM và Regex, không truy vấn DB."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        target_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        self.model_path = target_path if target_path.exists() else None
        self.classifier: IntentClassifier | None = None
        if self.model_path and self.model_path.exists():
            self.classifier = IntentClassifier.load(self.model_path)
    def process_query(self, query: str) -> dict[str, Any]:
        """Phân tích câu truy vấn của người dùng từ thanh tìm kiếm."""
        cleaned_query = query.strip()
        if not cleaned_query:
            return {
                "query": query,
                "is_search": False,
                "intent": "ngoai_pham_vi",
                "confidence": 1.0,
                "hard_constraints": {},
                "soft_tags": [],
                "should_query_db": False,
                "message": "Truy vấn rỗng",
            }

        # 1. Bóc tách ràng buộc cứng (Regex)
        hard_constraints = extract_hard_constraints(cleaned_query)

        # 2. Bóc tách thuộc tính mềm (Regex)
        soft_tags = extract_soft_tags(cleaned_query)
        categories = set(hard_constraints.get("categories") or [])
        if "dinh_huong_fps" in soft_tags and categories & {"chuot", "ban_phim", "lot_chuot"}:
            if "tai_nghe" not in categories:
                soft_tags.remove("dinh_huong_fps")
            if "game_cs2_valorant" not in soft_tags:
                soft_tags.append("game_cs2_valorant")

        # Kiểm tra xem có chứa bất kỳ thuộc tính/từ khóa sản phẩm máy tính nào không
        has_domain_features = (
            bool(hard_constraints.get("categories"))
            or bool(hard_constraints.get("brands"))
            or hard_constraints.get("keyword") is not None
            or hard_constraints.get("min_price") is not None
            or hard_constraints.get("max_price") is not None
            or bool(hard_constraints.get("connectivity"))
            or hard_constraints.get("max_weight_g") is not None
            or hard_constraints.get("polling_rate_hz") is not None
            or hard_constraints.get("hotswap")
            or hard_constraints.get("mac_support")
            or hard_constraints.get("has_mic")
            or hard_constraints.get("noise_cancelling")
            or hard_constraints.get("silent")
            or hard_constraints.get("rgb")
            or bool(soft_tags)
        )

        # 3. Phân loại intent bằng SVM
        if self.classifier:
            pred = self.classifier.predict(cleaned_query)
            intent = pred["intent"]
            confidence = pred["confidence"]
            is_oov = pred.get("is_oov", False)
        else:
            intent = "tim_kiem_san_pham" if has_domain_features else "ngoai_pham_vi"
            confidence = 0.5
            is_oov = False

        # Kết hợp phân tích ngữ nghĩa và SVM:
        if has_domain_features:
            # Chứa các từ khóa danh mục / hãng / thông số phụ kiện máy tính rõ ràng
            intent = "tim_kiem_san_pham"
            confidence = max(confidence, 0.92)
            should_query_db = True
        elif is_oov:
            # Toàn bộ từ ngữ nằm ngoài từ điển mô hình và không có bất kỳ thuộc tính sản phẩm nào
            intent = "ngoai_pham_vi"
            confidence = 0.98
            should_query_db = False
        elif intent == "ngoai_pham_vi":
            should_query_db = False
        else:
            # SVM đoán tim_kiem_san_pham nhưng không có ràng buộc regex nào:
            # Phải có độ tự tin cao (>= 0.75) mới kích hoạt tìm kiếm DB
            should_query_db = confidence >= 0.75
            if not should_query_db:
                intent = "ngoai_pham_vi"
                confidence = round(1.0 - confidence + 0.35, 4)

        return {
            "query": cleaned_query,
            "is_search": intent == "tim_kiem_san_pham",
            "intent": intent,
            "intent_label": INTENT_LABELS.get(intent, intent),
            "confidence": min(1.0, confidence),
            "hard_constraints": hard_constraints,
            "soft_tags": soft_tags,
            "should_query_db": should_query_db,
        }
