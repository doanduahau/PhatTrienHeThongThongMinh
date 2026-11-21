"""Lưu CSV do quản trị viên tải lên, cạnh các bộ dữ liệu huấn luyện có sẵn."""

from __future__ import annotations

import csv
import io
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

from src.config import DATA_DIR

MAX_DATASET_BYTES = 10 * 1024 * 1024
DATASET_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.csv", re.IGNORECASE)


def dataset_directory(scope: str) -> Path:
    if scope == "original":
        return DATA_DIR
    directory = DATA_DIR / "uploads"
    if directory.is_symlink():
        raise OSError("Thư mục uploads không hợp lệ")
    return directory


def dataset_path(scope: str, name: str) -> Path:
    if not DATASET_NAME.fullmatch(name):
        raise ValueError("Tên tệp CSV chỉ gồm chữ không dấu, số, dấu chấm, gạch nối và gạch dưới.")
    path = dataset_directory(scope) / name
    if path.is_symlink():
        raise FileNotFoundError(name)
    return path


def dataset_info(path: Path, scope: str) -> dict:
    stat = path.stat()
    return {
        "name": path.name,
        "scope": scope,
        "size_bytes": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }


def list_datasets() -> list[dict]:
    items = []
    for scope in ("original", "uploaded"):
        directory = dataset_directory(scope)
        if not directory.is_dir():
            continue
        for path in sorted(directory.iterdir()):
            if not DATASET_NAME.fullmatch(path.name) or path.is_symlink() or not path.is_file():
                continue
            try:
                items.append(dataset_info(path, scope))
            except FileNotFoundError:
                continue
    return items


def save_dataset(name: str, content: bytes) -> dict:
    path = dataset_path("uploaded", name)
    try:
        decoded = content.decode("utf-8-sig")
        if "\x00" in decoded:
            raise ValueError("Tệp CSV chứa ký tự không hợp lệ.")
        rows = csv.reader(io.StringIO(decoded, newline=""), strict=True)
        header = [field.strip() for field in next(rows, [])]
        if not header or not all(header) or len(set(header)) != len(header):
            raise ValueError("CSV cần có hàng tiêu đề với tên cột khác nhau.")
        data_rows = 0
        for row in rows:
            if not row:
                continue
            if len(row) != len(header):
                raise ValueError(f"Số cột ở dòng {rows.line_num} không khớp với tiêu đề.")
            data_rows += 1
        if not data_rows:
            raise ValueError("CSV cần có ít nhất một dòng dữ liệu.")
    except (UnicodeDecodeError, csv.Error) as exc:
        raise ValueError("Tệp phải là CSV UTF-8 hợp lệ, phân cách bằng dấu phẩy.") from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, delete=False) as output:
        temporary = Path(output.name)
        try:
            output.write(content)
            output.close()
            info = dataset_info(temporary, "uploaded")
            # Công bố nguyên tệp sau khi ghi xong, kể cả hai lần tải đồng thời trùng tên.
            os.link(temporary, path)
            return {**info, "name": name}
        finally:
            temporary.unlink(missing_ok=True)
