"""Tien ich chuan hoa van ban tieng Viet (dung chung cho model va rule)."""

from __future__ import annotations

import re
import unicodedata

_WS_RE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Gop khoang trang va cat khoang trang hai dau."""
    return _WS_RE.sub(" ", str(text)).strip()


def strip_diacritics(text: str) -> str:
    """Bo dau tieng Viet, giu nguyen do dai chuoi o muc co ban."""
    text = text.replace("đ", "d").replace("Đ", "D")
    decomposed = unicodedata.normalize("NFD", text)
    without_marks = "".join(
        ch for ch in decomposed if unicodedata.category(ch) != "Mn"
    )
    return unicodedata.normalize("NFC", without_marks)


def fold_vietnamese(text: str) -> str:
    """Lowercase + bo dau + gop khoang trang.

    Nho vay cac cau go khong dau (rat pho bien khi chat) van khop voi
    tu khoa co dau trong bo rule.
    """
    return _WS_RE.sub(" ", strip_diacritics(clean_text(text).lower())).strip()


def normalize_for_model(text: str) -> str:
    """Chuan hoa dau vao cho TF-IDF: bo dau, bo ky tu nhieu, giu chu va so."""
    folded = fold_vietnamese(text)
    folded = re.sub(r"[^\w\s]", " ", folded, flags=re.UNICODE)
    return _WS_RE.sub(" ", folded).strip()
