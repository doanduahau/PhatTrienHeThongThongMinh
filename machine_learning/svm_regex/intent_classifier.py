"""Tang 3: phan loai intent bang TF-IDF + LinearSVC da hieu chuan xac suat."""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from .text_utils import normalize_for_model


class IntentClassifier:
    """Pipeline TF-IDF + CalibratedClassifierCV(LinearSVC).

    CalibratedClassifierCV giup LinearSVC (von khong co predict_proba)
    tra ve confidence score trong khoang 0.0 - 1.0.
    """

    def __init__(self, cv: int = 5) -> None:
        self.cv = cv
        self.pipeline: Pipeline = self._build_pipeline(cv)
        self.classes_: list[str] = []

    @staticmethod
    def _build_pipeline(cv: int) -> Pipeline:
        return Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        max_df=0.9,
                        min_df=1,
                        preprocessor=normalize_for_model,
                        token_pattern=r"(?u)\b\w+\b",
                    ),
                ),
                (
                    "clf",
                    CalibratedClassifierCV(
                        LinearSVC(dual=False, random_state=42),
                        cv=cv,
                    ),
                ),
            ]
        )

    # ------------------------------------------------------------------
    def train(self, texts: list[str], labels: list[str]) -> "IntentClassifier":
        if not texts or len(texts) != len(labels):
            raise ValueError("texts va labels phai khac rong va cung do dai")

        class_counts = Counter(labels)
        if len(class_counts) < 2:
            raise ValueError("Can it nhat 2 intent de huan luyen")
        min_count = min(class_counts.values())
        if min_count < 2:
            raise ValueError(
                "Moi intent can it nhat 2 cau mau de hieu chuan xac suat "
                f"(intent it nhat: {class_counts.most_common()[-1][0]})"
            )

        # cv khong the lon hon so mau cua lop nho nhat
        effective_cv = max(2, min(self.cv, min_count))
        if effective_cv != self.cv:
            self.cv = effective_cv
            self.pipeline = self._build_pipeline(effective_cv)

        self.pipeline.fit(texts, labels)
        self.classes_ = [str(c) for c in self.pipeline.classes_]
        return self

    # ------------------------------------------------------------------
    def predict(self, text: str) -> dict[str, Any]:
        self._ensure_trained()
        tfidf = self.pipeline.named_steps.get("tfidf")
        is_oov = False
        if tfidf is not None:
            vec = tfidf.transform([text])
            if vec.nnz == 0:
                is_oov = True

        probabilities = self.pipeline.predict_proba([text])[0]
        best = int(np.argmax(probabilities))
        return {
            "intent": str(self.pipeline.classes_[best]),
            "confidence": round(float(probabilities[best]), 4),
            "is_oov": is_oov,
        }

    def predict_top_k(self, text: str, k: int = 3) -> list[dict[str, Any]]:
        self._ensure_trained()
        probabilities = self.pipeline.predict_proba([text])[0]
        order = np.argsort(probabilities)[::-1][: max(1, k)]
        return [
            {
                "intent": str(self.pipeline.classes_[int(i)]),
                "confidence": round(float(probabilities[int(i)]), 4),
            }
            for i in order
        ]

    # ------------------------------------------------------------------
    def save(self, path: str | Path) -> Path:
        self._ensure_trained()
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "pipeline": self.pipeline,
                "classes": self.classes_,
                "cv": self.cv,
                "format_version": 1,
            },
            target,
        )
        return target

    @classmethod
    def load(cls, path: str | Path) -> "IntentClassifier":
        source = Path(path)
        if not source.exists():
            raise FileNotFoundError(
                f"Khong tim thay model: {source}. Hay chay 'python train.py' truoc."
            )
        payload = joblib.load(source)
        model = cls(cv=int(payload.get("cv", 5)))
        model.pipeline = payload["pipeline"]
        model.classes_ = [str(c) for c in payload.get("classes", [])]
        return model

    # ------------------------------------------------------------------
    def _ensure_trained(self) -> None:
        if not self.classes_:
            raise RuntimeError("Model chua duoc huan luyen hoac chua duoc load.")
