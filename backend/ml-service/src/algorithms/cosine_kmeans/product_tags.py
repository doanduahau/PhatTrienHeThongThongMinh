"""Tạo nhãn sở thích từ đặc trưng có sẵn của từng sản phẩm."""

from __future__ import annotations

import re
import unicodedata

import pandas as pd

SPEC_FIELDS = {
    "connectivity": "ket_noi",
    "layout": "layout",
    "headphone_type": "kieu_tai_nghe",
    "setup_category": "loai_setup",
    "mouse_control": "kiem_soat",
    "speed": "toc_do",
    "surface": "be_mat",
    "pad_type": "loai_lot_chuot",
    "size": "kich_thuoc",
}

FPS_TERMS = re.compile(r"(?<![a-z0-9])(?:fps|cs2|csgo|valorant|esports|counter_strike)(?![a-z0-9])")
MOBA_TERMS = re.compile(r"(?<![a-z0-9])(?:moba|lol|dota_?2?|lien_minh|league_of_legends)(?![a-z0-9])")

PREFERENCE_LABELS = {
    "game_cs2_valorant": "Game FPS",
    "game_moba": "Game MOBA",
    "van_phong_lam_viec": "Văn phòng và làm việc",
    "setup_cong_thai_hoc": "Công thái học",
    "setup_toi_gian_minimalism": "Setup tối giản",
    "setup_rgb": "Setup RGB",
    "ket_noi_khong_day": "Kết nối không dây",
    "ket_noi_da_thiet_bi": "Kết nối đa thiết bị",
    "am_thanh": "Âm thanh",
    "dieu_khien_chuot_ban_phim": "Chuột, bàn phím và lót chuột",
}
INPUT_CATEGORIES = {"chuot", "ban_phim", "lot_chuot"}
AUDIO_CATEGORIES = {"tai_nghe", "soundcard"}
OFFICE_CATEGORIES = {"ghe", "ban", "arm_man_hinh", "phu_kien_cong_thai_hoc"}
WIRELESS_MODES = {"wireless", "wireless_2_4g", "bluetooth", "tri_mode"}


def _slug(value: object) -> str:
    if pd.isna(value):
        return ""
    text = str(value).casefold().replace("đ", "d")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def _number(value: object) -> float:
    return float(pd.to_numeric(value, errors="coerce"))


def product_category(row: pd.Series) -> str:
    return _slug(row.get("category_slug")) or _slug(row.get("category_name", row.get("category")))


def build_preference_tags(row: pd.Series) -> tuple[str, ...]:
    category = product_category(row)
    tags = set(row["tags"].split(",")) & PREFERENCE_LABELS.keys()
    connectivity = _slug(row.get("connectivity"))
    layout = _slug(row.get("layout"))
    color = _slug(row.get("color"))
    pad_type = _slug(row.get("pad_type"))
    text = "_".join([_slug(row.get("name")), _slug(row.get("description"))])

    if category in INPUT_CATEGORIES:
        tags.add("dieu_khien_chuot_ban_phim")
    if category in AUDIO_CATEGORIES:
        tags.add("am_thanh")
    if category in OFFICE_CATEGORIES:
        tags.update(("van_phong_lam_viec", "setup_cong_thai_hoc"))
    if category == "soundcard" and re.search(r"(?<![a-z0-9])(?:gaming|surround|7_1)(?![a-z0-9])", text):
        tags.add("game_cs2_valorant")
    if category == "lot_chuot":
        if pad_type in {"speed", "hybrid"}:
            tags.add("game_cs2_valorant")
        if pad_type in {"control", "hybrid"}:
            tags.add("game_moba")
    if _slug(row.get("hand_orientation")) == "ergonomic":
        tags.add("setup_cong_thai_hoc")
    if layout == "fullsize" or re.search(r"(?<![a-z0-9])(?:office|van_phong|vertical|mx_master)(?![a-z0-9])", text):
        tags.add("van_phong_lam_viec")
    if (
        color in {"black", "white", "den", "trang", "gray", "grey", "xam", "silver", "bac"}
        and (layout in {"60", "65", "75", "tkl"} or category == "arm_man_hinh")
    ) or re.search(r"(?<![a-z0-9])(?:compact|mini|minimalism|toi_gian)(?![a-z0-9])", text):
        tags.add("setup_toi_gian_minimalism")
    if re.search(r"(?<![a-z0-9])rgb(?![a-z0-9])", text):
        tags.add("setup_rgb")
    if connectivity in WIRELESS_MODES:
        tags.add("ket_noi_khong_day")
    if connectivity == "tri_mode" or re.search(r"(?<![a-z0-9])multi_device(?![a-z0-9])", text):
        tags.add("ket_noi_da_thiet_bi")

    return tuple(tag for tag in PREFERENCE_LABELS if tag in tags)


def build_product_tags(row: pd.Series) -> str:
    category = product_category(row)
    tags = {f"danh_muc_{category}"} if category else set()
    for field, prefix in SPEC_FIELDS.items():
        value = _slug(row.get(field))
        if value:
            tags.add(f"{prefix}_{value}")

    existing = row.get("tags")
    if pd.notna(existing):
        tags.update(tag for value in str(existing).split(",") if (tag := _slug(value)))

    connectivity = _slug(row.get("connectivity"))
    if connectivity == "tri_mode":
        tags.add("tri_mode")
    weight = _number(row.get("weight_g"))
    polling_rate = _number(row.get("polling_rate_hz"))
    if polling_rate >= 4000:
        tags.add("polling_rate_cao")

    if category == "chuot":
        orientation = _slug(row.get("hand_orientation"))
        if orientation == "ergonomic":
            tags.add("cong_thai_hoc")
        if orientation == "symmetrical":
            tags.add("doi_xung")
        if 0 < weight < 60:
            tags.add("sieu_nhe_under_60g")
            if polling_rate >= 1000:
                tags.add("game_cs2_valorant")

    if category == "ban_phim":
        if _slug(row.get("layout")) in {"60", "65", "75", "tkl"}:
            tags.add("layout_compact")
        for field, tag in (
            ("has_rapid_trigger", "rapid_trigger"),
            ("has_hotswap", "hot_swap"),
            ("support_macos", "layout_mac_chuan"),
        ):
            if _slug(row.get(field)) in {"true", "1"}:
                tags.add(tag)
        if "rapid_trigger" in tags:
            tags.add("game_cs2_valorant")

    if category == "tai_nghe":
        if _slug(row.get("headphone_type")) == "in_ear":
            tags.add("iem")
        if _slug(row.get("has_anc")) in {"true", "1"}:
            tags.add("cach_am_tot")

    product_text = "_".join([_slug(row.get("name")), _slug(row.get("description"))])
    if FPS_TERMS.search(product_text):
        tags.add("game_cs2_valorant")
    if MOBA_TERMS.search(product_text):
        tags.add("game_moba")

    return ",".join(sorted(tags))
