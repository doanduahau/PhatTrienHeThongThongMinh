"""Data Validator: kiểm tra file CSV dataset có đúng chuẩn nhãn hay không.

Chức năng chính:
- Bắt lỗi header thiếu cột.
- Bắt dòng rỗng / thiếu text / thiếu intent.
- Bắt intent không nằm trong 2 nhãn chuẩn (sai chính tả, viết hoa...).
- Thống kê số câu mỗi intent.
- Cảnh báo intent chưa đạt `target_samples_count` trong metadata.

Có thể dùng như module:
    from ml_service.algorithms.svm_regex.validator import validate_dataset
    report = validate_dataset("data/intents.csv")
    print(report["valid"], report["intent_counts"])

Hoặc chạy trực tiếp:
    python -m ml_service.algorithms.svm_regex.validator data/intents.csv
"""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

from .constants import ALL_INTENTS

DEFAULT_METADATA_PATH = Path(__file__).resolve().parents[3] / "data" / "labels_metadata.json"


def _load_intent_targets(
    metadata_path: str | Path | None = None,
) -> tuple[dict[str, int], list[str]]:
    """Đọc target_samples_count trực tiếp từ labels_metadata.json.

    Không hardcode chỉ tiêu trong code. Nếu file metadata thiếu hoặc sai,
    validator báo lỗi rõ ràng để người dùng chạy lại setup_labels.py.
    """
    path = Path(metadata_path) if metadata_path else DEFAULT_METADATA_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Không tìm thấy metadata: {path}. "
            "Hãy chạy 'python setup_labels.py' để tạo file chuẩn."
        )

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Không đọc được metadata {path}: {exc}") from exc

    if not isinstance(payload, dict):
        raise ValueError(f"Metadata {path} phải là một JSON object.")

    intents = payload.get("intents")
    if isinstance(intents, list):
        intents = {
            item.get("code"): item
            for item in intents
            if isinstance(item, dict) and isinstance(item.get("code"), str)
        }
    if not isinstance(intents, dict):
        raise ValueError(
            f"Metadata {path} thiếu khóa 'intents' hoặc sai định dạng."
        )

    targets: dict[str, int] = {}
    for code in ALL_INTENTS:
        item = intents.get(code)
        if not isinstance(item, dict):
            raise ValueError(f"Metadata {path} thiếu intent '{code}'.")
        value = item.get("target_samples_count")
        if not isinstance(value, int) or value <= 0:
            raise ValueError(
                f"Metadata {path}: target_samples_count của '{code}' "
                "phải là số nguyên dương."
            )
        targets[code] = value

    warnings: list[str] = []
    extra = sorted(set(intents) - set(ALL_INTENTS))
    if extra:
        warnings.append(
            f"Metadata có intent không nằm trong danh sách chuẩn: {extra}"
        )
    return targets, warnings


def _finalize_report(
    report: dict[str, Any], targets: dict[str, int]
) -> dict[str, Any]:
    counts: dict[str, int] = report["intent_counts"]
    missing = [code for code in ALL_INTENTS if counts.get(code, 0) == 0]

    progress: dict[str, dict[str, Any]] = {}
    below_target: dict[str, dict[str, Any]] = {}

    for code in ALL_INTENTS:
        current = counts.get(code, 0)
        target = targets[code]
        percent = round(current / target * 100, 1) if target else 0.0
        status = "ĐẠT" if current >= target else "THIẾU"

        progress[code] = {
            "current": current,
            "target": target,
            "percent": percent,
            "status": status,
        }

        if current < target:
            below_target[code] = {
                "current": current,
                "target": target,
                "percent": percent,
            }
            if code == "tim_kiem_san_pham":
                report["warnings"].append(
                    f"CẢNH BÁO NHÃN LÕI: 'tim_kiem_san_pham' mới có "
                    f"{current}/{target} câu (thiếu {target - current}). "
                    "Cần bổ sung biến thể cú pháp tìm kiếm, danh mục, giá tiền, thông số, từ lóng."
                )
            elif code == "ngoai_pham_vi":
                report["warnings"].append(
                    f"CẢNH BÁO NGOÀI PHẠM VI: 'ngoai_pham_vi' mới có "
                    f"{current}/{target} câu (thiếu {target - current}). "
                    "Cần phủ câu hỏi code, toán, thời tiết, triết học..."
                )
            else:
                report["warnings"].append(
                    f"Nhãn '{code}' mới có {current}/{target} câu "
                    f"(còn thiếu {target - current})."
                )

    report["missing_labels"] = missing
    report["below_target"] = below_target
    report["intent_progress"] = progress
    report["targets"] = dict(targets)
    report["target_total"] = sum(targets.values())
    report["current_total"] = sum(counts.values())
    if report.get("total_rows", 0) == 0 and not report["errors"]:
        report["warnings"].append(
            "Dataset chưa có dòng dữ liệu nào (chỉ có header hoặc file trống)."
        )
    report["valid"] = not report["errors"]
    return report


def validate_dataset(
    csv_path: str,
    metadata_path: str | Path | None = None,
) -> dict[str, Any]:
    """Validate dataset CSV với 2 cột bắt buộc: text, intent.

    Args:
        csv_path: Đường dẫn file CSV cần kiểm tra.
        metadata_path: Đường dẫn labels_metadata.json (mặc định data/...).

    Returns:
        dict báo cáo gồm các khóa chính:
        - valid (bool)
        - total_rows / valid_rows / invalid_rows
        - intent_counts (đủ 2 intent, mặc định 0)
        - unknown_labels (dict nhãn lạ -> số lần)
        - errors / warnings / row_errors
        - missing_labels / below_target / target_total / current_total
        - targets / intent_progress (current, target, percent, status)

    Raises:
        FileNotFoundError: nếu file CSV không tồn tại.
    """
    path = Path(csv_path)
    if not path.is_file():
        raise FileNotFoundError(f"Không tìm thấy file dataset: {path}")

    targets, metadata_warnings = _load_intent_targets(metadata_path)

    report: dict[str, Any] = {
        "valid": False,
        "csv_path": str(path.resolve()),
        "metadata_path": str(
            Path(metadata_path).resolve()
            if metadata_path
            else DEFAULT_METADATA_PATH.resolve()
        ),
        "total_rows": 0,
        "valid_rows": 0,
        "invalid_rows": 0,
        "intent_counts": {code: 0 for code in ALL_INTENTS},
        "unknown_labels": {},
        "errors": [],
        "warnings": list(metadata_warnings),
        "row_errors": [],
        "missing_labels": [],
        "below_target": {},
        "target_total": 0,
        "current_total": 0,
    }

    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        normalized = {str(name).strip().lower(): name for name in fieldnames}

        if "text" not in normalized or "intent" not in normalized:
            report["errors"].append(
                "Header phải có đủ 2 cột 'text' và 'intent'. "
                f"Hiện tại: {fieldnames or 'file rỗng'}"
            )
            return _finalize_report(report, targets)

        text_col = normalized["text"]
        intent_col = normalized["intent"]

        extra_columns = [
            name
            for name in fieldnames
            if name not in {text_col, intent_col} and str(name).strip()
        ]
        if extra_columns:
            report["warnings"].append(
                f"Các cột thừa sẽ bị bỏ qua: {extra_columns}"
            )

        unknown_counter: Counter[str] = Counter()

        for row in reader:
            report["total_rows"] += 1
            line_number = reader.line_num

            text = (row.get(text_col) or "").strip()
            intent = (row.get(intent_col) or "").strip()

            reason: str | None = None
            if not text and not intent:
                reason = "cả 'text' và 'intent' đều rỗng"
            elif not text:
                reason = "'text' bị rỗng"
            elif not intent:
                reason = "'intent' bị rỗng"
            elif intent not in ALL_INTENTS:
                reason = f"intent '{intent}' không nằm trong 2 nhãn chuẩn"
                unknown_counter[intent] += 1

            if reason:
                report["invalid_rows"] += 1
                report["row_errors"].append(
                    {
                        "line": line_number,
                        "text": text,
                        "intent": intent,
                        "reason": reason,
                    }
                )
                report["errors"].append(f"Dòng {line_number}: {reason}")
                continue

            report["valid_rows"] += 1
            report["intent_counts"][intent] += 1

    report["unknown_labels"] = dict(unknown_counter.most_common())
    return _finalize_report(report, targets)


def format_validation_report(report: dict[str, Any], max_items: int = 20) -> str:
    """Trả về báo cáo dạng text để in ra terminal."""
    lines = [
        "=" * 78,
        "KẾT QUẢ VALIDATE DATASET",
        "=" * 78,
        f"File        : {report.get('csv_path', '-')}",
        f"Metadata    : {report.get('metadata_path', '-')}",
        f"Trạng thái  : {'HỢP LỆ' if report.get('valid') else 'KHÔNG HỢP LỆ'}",
        f"Tổng dòng   : {report.get('total_rows', 0)}",
        f"Hợp lệ      : {report.get('valid_rows', 0)}",
        f"Không hợp lệ: {report.get('invalid_rows', 0)}",
    ]

    progress = report.get("intent_progress") or {}
    if progress:
        lines.append("")
        lines.append("BẢNG TIẾN ĐỘ INTENT")
        header = (
            f"{'Nhãn':<24} {'Hiện có':>8} {'Mục tiêu':>9} "
            f"{'Hoàn thành':>11}  {'Trạng thái':>10}"
        )
        lines.append(header)
        lines.append("-" * len(header))
        for code in ALL_INTENTS:
            item = progress.get(code)
            if not item:
                continue
            lines.append(
                f"{code:<24} {item['current']:>8} {item['target']:>9} "
                f"{item['percent']:>10.1f}%  {item['status']:>10}"
            )

        current_total = report.get("current_total", 0)
        target_total = report.get("target_total", 0)
        total_percent = (
            round(current_total / target_total * 100, 1) if target_total else 0.0
        )
        total_status = "ĐẠT" if current_total >= target_total else "THIẾU"
        lines.append("-" * len(header))
        lines.append(
            f"{'TỔNG':<24} {current_total:>8} {target_total:>9} "
            f"{total_percent:>10.1f}%  {total_status:>10}"
        )

    unknown = report.get("unknown_labels") or {}
    if unknown:
        lines.append(
            "Nhãn lạ     : "
            + ", ".join(f"{label} ({count})" for label, count in unknown.items())
        )

    errors = report.get("errors") or []
    if errors:
        lines.append("")
        lines.append(f"LỖI ({len(errors)}):")
        for message in errors[:max_items]:
            lines.append(f"  - {message}")
        if len(errors) > max_items:
            lines.append(f"  ... và {len(errors) - max_items} lỗi khác")

    warnings = report.get("warnings") or []
    if warnings:
        lines.append("")
        lines.append(f"CẢNH BÁO ({len(warnings)}):")
        for message in warnings[:max_items]:
            lines.append(f"  - {message}")
        if len(warnings) > max_items:
            lines.append(f"  ... và {len(warnings) - max_items} cảnh báo khác")

    missing = report.get("missing_labels") or []
    if missing:
        lines.append("")
        lines.append(f"Nhãn chưa có câu nào ({len(missing)}): {', '.join(missing)}")

    lines.append("")
    lines.append(
        f"Tiến độ tổng: {report.get('current_total', 0)}/"
        f"{report.get('target_total', 0)} câu mục tiêu"
    )
    lines.append("=" * 72)
    return "\n".join(lines)


if __name__ == "__main__":  # pragma: no cover
    import sys

    if len(sys.argv) != 2:
        print("Cách dùng: python -m nlp.validator <duong_dan_csv>")
        raise SystemExit(2)

    try:
        result = validate_dataset(sys.argv[1])
    except (FileNotFoundError, ValueError) as exc:
        print(f"[lỗi] {exc}")
        raise SystemExit(1)

    print(format_validation_report(result))
    raise SystemExit(0 if result["valid"] else 1)
