"""Cấu hình nhãn chuẩn cho thanh tìm kiếm thông minh phụ kiện máy tính.

File này là nguồn dữ liệu duy nhất (single source of truth) cho:
- 2 intent (tìm kiếm sản phẩm trong DB vs ngoài phạm vi).
- 42 soft tag (sở thích / nhu cầu mềm trích xuất từ truy vấn).
- Metadata mô tả từng nhãn, nhóm nhãn và mục tiêu số câu.

Các module khác (validator, setup_labels, tag_extractor, CLI...) đều import
từ đây để tránh lệch nhãn.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


# ---------------------------------------------------------------------------
# Enum nhãn
# ---------------------------------------------------------------------------
class IntentEnum(str, Enum):
    """2 nhãn ý định cho thanh tìm kiếm thông minh."""

    TIM_KIEM_SAN_PHAM = "tim_kiem_san_pham"
    NGOAI_PHAM_VI = "ngoai_pham_vi"

    def __str__(self) -> str:  # pragma: no cover - chi de hien thi dep
        return self.value


class SoftTagEnum(str, Enum):
    """42 nhãn sở thích mềm, chia thành 4 nhóm."""

    # --- Nhóm chuột (13) ---
    CLAW_GRIP = "claw_grip"
    PALM_GRIP = "palm_grip"
    FINGERTIP_GRIP = "fingertip_grip"
    TAY_NHO = "tay_nho"
    TAY_TO = "tay_to"
    SIEU_NHE_UNDER_60G = "sieu_nhe_under_60g"
    CONG_THAI_HOC = "cong_thai_hoc"
    DOI_XUNG = "doi_xung"
    POLLING_RATE_CAO = "polling_rate_cao"
    CLICK_SILENT_IM_LANG = "click_silent_im_lang"
    CUON_VO_CUC_FAST_SCROLL = "cuon_vo_cuc_fast_scroll"
    CHUOT_DUNG_VERTICAL = "chuot_dung_vertical"
    CHUYEN_DOI_NHIEU_MAY = "chuyen_doi_nhieu_may"

    # --- Nhóm bàn phím (13) ---
    RAPID_TRIGGER = "rapid_trigger"
    SWITCH_LINEAR = "switch_linear"
    SWITCH_TACTILE = "switch_tactile"
    SWITCH_CLICKY = "switch_clicky"
    AM_THOCKY = "am_thocky"
    AM_CLACKY = "am_clacky"
    LAYOUT_COMPACT = "layout_compact"
    HOT_SWAP = "hot_swap"
    PHIM_SILENT_KHONG_ON = "phim_silent_khong_on"
    LOW_PROFILE_MONG_NHE = "low_profile_mong_nhe"
    FULLSIZE_NHAP_LIEU_EXCEL = "fullsize_nhap_lieu_excel"
    LAYOUT_MAC_CHUAN = "layout_mac_chuan"
    CO_DRIVER_WEB = "co_driver_web"

    # --- Nhóm tai nghe & micro (6) ---
    DINH_HUONG_FPS = "dinh_huong_fps"
    DEO_LAU_EM_TAI = "deo_lau_em_tai"
    CACH_AM_TOT = "cach_am_tot"
    IEM = "iem"
    MIC_LOC_ON_DAM_THOAI_HOP = "mic_loc_on_dam_thoai_hop"
    TAI_NGHE_ON_EAR_NHE = "tai_nghe_on_ear_nhe"

    # --- Nhóm ghế, bàn & mục đích (10) ---
    GAME_CS2_VALORANT = "game_cs2_valorant"
    GAME_MOBA = "game_moba"
    SETUP_RGB = "setup_rgb"
    PIN_TRAU = "pin_trau"
    TRI_MODE = "tri_mode"
    VAN_PHONG_LAM_VIEC = "van_phong_lam_viec"
    SETUP_TOI_GIAN_MINIMALISM = "setup_toi_gian_minimalism"
    NGOI_LAU_CHONG_MOI_LUNG = "ngoi_lau_chong_moi_lung"
    BAN_NANG_HA_DUNG_LAM_VIEC = "ban_nang_ha_dung_lam_viec"
    PHU_KIEN_KE_TAY_KE_CHAN = "phu_kien_ke_tay_ke_chan"

    def __str__(self) -> str:  # pragma: no cover - chi de hien thi dep
        return self.value


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class IntentMeta:
    code: str
    name_vi: str
    group: str
    description: str
    target_samples_count: int


@dataclass(frozen=True)
class TagMeta:
    code: str
    name_vi: str
    group: str
    description: str
    target_samples_count: int = 20


INTENT_GROUP_LABELS: dict[str, str] = {
    "product_search": "Tìm kiếm sản phẩm",
    "fallback": "Ngoài phạm vi",
}

TAG_GROUP_LABELS: dict[str, str] = {
    "mouse": "Chuột",
    "keyboard": "Bàn phím",
    "headphone": "Tai nghe & Micro",
    "setup_general": "Ghế, bàn & mục đích",
}


def _intent(
    code: str,
    name_vi: str,
    group: str,
    description: str,
    target_samples_count: int,
) -> IntentMeta:
    return IntentMeta(code, name_vi, group, description, target_samples_count)


def _tag(code: str, name_vi: str, group: str, description: str) -> TagMeta:
    return TagMeta(
        code=code,
        name_vi=name_vi,
        group=group,
        description=description,
        target_samples_count=20,
    )


INTENT_METADATA: dict[str, IntentMeta] = {
    "tim_kiem_san_pham": _intent(
        "tim_kiem_san_pham",
        "Tìm kiếm sản phẩm",
        "product_search",
        "Truy vấn tìm kiếm phụ kiện theo nhu cầu, tính năng, thông số kỹ thuật và giá để lọc DB",
        150,
    ),
    "ngoai_pham_vi": _intent(
        "ngoai_pham_vi",
        "Ngoài phạm vi",
        "fallback",
        "Truy vấn không liên quan đến tìm sản phẩm trong DB (hỏi đáp, đơn hàng, xã giao, câu hỏi ngoài lề)",
        100,
    ),
}


TAG_METADATA: dict[str, TagMeta] = {
    # --- Chuột (13) ---
    "claw_grip": _tag("claw_grip", "Cầm claw grip", "mouse", "Cầm kiểu cào móng"),
    "palm_grip": _tag(
        "palm_grip", "Cầm palm grip", "mouse", "Cầm ôm trọn lòng bàn tay"
    ),
    "fingertip_grip": _tag(
        "fingertip_grip", "Cầm fingertip grip", "mouse", "Cầm bằng đầu ngón tay"
    ),
    "tay_nho": _tag("tay_nho", "Tay nhỏ (<17cm)", "mouse", "Tay bé, dưới 17cm"),
    "tay_to": _tag("tay_to", "Tay to (>19cm)", "mouse", "Tay to, trên 19cm"),
    "sieu_nhe_under_60g": _tag(
        "sieu_nhe_under_60g", "Siêu nhẹ (<60g)", "mouse", "Trọng lượng dưới 60g"
    ),
    "cong_thai_hoc": _tag(
        "cong_thai_hoc",
        "Công thái học",
        "mouse",
        "Thiết kế ôm tay phải công thái học",
    ),
    "doi_xung": _tag(
        "doi_xung", "Đối xứng", "mouse", "Thiết kế đối xứng thuận hai tay"
    ),
    "polling_rate_cao": _tag(
        "polling_rate_cao", "Polling rate cao", "mouse", "Tần số 4000Hz - 8000Hz"
    ),
    "click_silent_im_lang": _tag(
        "click_silent_im_lang",
        "Click im lặng",
        "mouse",
        "Nút bấm im lặng, dùng văn phòng",
    ),
    "cuon_vo_cuc_fast_scroll": _tag(
        "cuon_vo_cuc_fast_scroll",
        "Cuộn siêu tốc",
        "mouse",
        "Con lăn cuộn siêu tốc, cuộn ngang Excel",
    ),
    "chuot_dung_vertical": _tag(
        "chuot_dung_vertical",
        "Chuột đứng",
        "mouse",
        "Chuột đứng công thái học chống đau cổ tay",
    ),
    "chuyen_doi_nhieu_may": _tag(
        "chuyen_doi_nhieu_may",
        "Chuyển đổi nhiều máy",
        "mouse",
        "Nút chuyển đổi nhanh nhiều thiết bị (Easy-Switch)",
    ),
    # --- Bàn phím (13) ---
    "rapid_trigger": _tag(
        "rapid_trigger",
        "Rapid trigger",
        "keyboard",
        "Switch từ tính nhận phím siêu nhạy",
    ),
    "switch_linear": _tag(
        "switch_linear", "Switch linear", "keyboard", "Switch bấm trơn mượt không khấc"
    ),
    "switch_tactile": _tag(
        "switch_tactile",
        "Switch tactile",
        "keyboard",
        "Switch có khấc phản hồi nảy nhẹ",
    ),
    "switch_clicky": _tag(
        "switch_clicky",
        "Switch clicky",
        "keyboard",
        "Switch phát tiếng lách cách to",
    ),
    "am_thocky": _tag(
        "am_thocky", "Âm thocky", "keyboard", "Profile âm gõ trầm, ấm, đầm"
    ),
    "am_clacky": _tag(
        "am_clacky", "Âm clacky", "keyboard", "Profile âm gõ đanh, giòn"
    ),
    "layout_compact": _tag(
        "layout_compact",
        "Layout compact",
        "keyboard",
        "Phím rút gọn 60%, 65%, 75%, TKL",
    ),
    "hot_swap": _tag(
        "hot_swap", "Hot-swap", "keyboard", "Mạch tự nhổ thay switch"
    ),
    "phim_silent_khong_on": _tag(
        "phim_silent_khong_on",
        "Phím silent",
        "keyboard",
        "Phím cơ tiêu âm gõ cực êm",
    ),
    "low_profile_mong_nhe": _tag(
        "low_profile_mong_nhe",
        "Low-profile mỏng nhẹ",
        "keyboard",
        "Phím cơ lùn, mỏng nhẹ",
    ),
    "fullsize_nhap_lieu_excel": _tag(
        "fullsize_nhap_lieu_excel",
        "Fullsize numpad",
        "keyboard",
        "Phím fullsize có cụm phím số numpad",
    ),
    "layout_mac_chuan": _tag(
        "layout_mac_chuan",
        "Layout Mac",
        "keyboard",
        "Tương thích layout Command/Option cho macOS",
    ),
    "co_driver_web": _tag(
        "co_driver_web",
        "Driver web",
        "keyboard",
        "Tùy chỉnh qua trình duyệt web",
    ),
    # --- Tai nghe & micro (6) ---
    "dinh_huong_fps": _tag(
        "dinh_huong_fps",
        "Định hướng FPS",
        "headphone",
        "Nghe rõ tiếng bước chân trong game FPS",
    ),
    "deo_lau_em_tai": _tag(
        "deo_lau_em_tai",
        "Đeo lâu êm tai",
        "headphone",
        "Đệm êm, không cấn người đeo kính",
    ),
    "cach_am_tot": _tag(
        "cach_am_tot",
        "Cách âm tốt",
        "headphone",
        "Cách âm thụ động dày hoặc có ANC",
    ),
    "iem": _tag(
        "iem",
        "IEM in-ear",
        "headphone",
        "Tai nghe nhét tai dây rời (In-Ear Monitor)",
    ),
    "mic_loc_on_dam_thoai_hop": _tag(
        "mic_loc_on_dam_thoai_hop",
        "Mic lọc ồn họp",
        "headphone",
        "Mic lọc ồn phục vụ họp online/Discord",
    ),
    "tai_nghe_on_ear_nhe": _tag(
        "tai_nghe_on_ear_nhe",
        "On-ear nhẹ",
        "headphone",
        "Tai nghe chụp áp tai nhẹ làm việc cả ngày",
    ),
    # --- Ghế, bàn & mục đích (10) ---
    "game_cs2_valorant": _tag(
        "game_cs2_valorant",
        "Game CS2/Valorant",
        "setup_general",
        "Tối ưu game bắn súng FPS",
    ),
    "game_moba": _tag(
        "game_moba",
        "Game MOBA",
        "setup_general",
        "Tối ưu thao tác click liên tục (LMHT, Dota)",
    ),
    "setup_rgb": _tag(
        "setup_rgb", "Setup RGB", "setup_general", "Hệ thống LED RGB đồng bộ"
    ),
    "pin_trau": _tag(
        "pin_trau", "Pin trâu", "setup_general", "Thời lượng pin dài trên 1 tuần"
    ),
    "tri_mode": _tag(
        "tri_mode",
        "3-mode",
        "setup_general",
        "Đủ 3 chế độ (Bluetooth, 2.4G, Type-C)",
    ),
    "van_phong_lam_viec": _tag(
        "van_phong_lam_viec",
        "Văn phòng",
        "setup_general",
        "Nhu cầu công sở, gõ văn bản",
    ),
    "setup_toi_gian_minimalism": _tag(
        "setup_toi_gian_minimalism",
        "Setup tối giản",
        "setup_general",
        "Tone màu tối giản đen/trắng, gọn gàng",
    ),
    "ngoi_lau_chong_moi_lung": _tag(
        "ngoi_lau_chong_moi_lung",
        "Ngồi lâu, đỡ mỏi lưng",
        "setup_general",
        "Ghế lưới đỡ thắt lưng ngồi 8 tiếng",
    ),
    "ban_nang_ha_dung_lam_viec": _tag(
        "ban_nang_ha_dung_lam_viec",
        "Bàn nâng hạ",
        "setup_general",
        "Bàn nâng hạ đứng/ngồi luân phiên",
    ),
    "phu_kien_ke_tay_ke_chan": _tag(
        "phu_kien_ke_tay_ke_chan",
        "Kê tay/kê chân",
        "setup_general",
        "Đệm kê cổ tay và kê chân công thái học",
    ),
}


# ---------------------------------------------------------------------------
# Danh sách & nhóm nhãn (dẫn xuất từ metadata để không bị lệch)
# ---------------------------------------------------------------------------
ALL_INTENTS: list[str] = [item.value for item in IntentEnum]
ALL_SOFT_TAGS: list[str] = [item.value for item in SoftTagEnum]

INTENT_GROUPS: dict[str, list[str]] = {
    group: [code for code, meta in INTENT_METADATA.items() if meta.group == group]
    for group in INTENT_GROUP_LABELS
}

TAG_GROUPS: dict[str, list[str]] = {
    group: [code for code, meta in TAG_METADATA.items() if meta.group == group]
    for group in TAG_GROUP_LABELS
}

INTENT_LABELS: dict[str, str] = {
    code: meta.name_vi for code, meta in INTENT_METADATA.items()
}
TAG_LABELS: dict[str, str] = {
    code: meta.name_vi for code, meta in TAG_METADATA.items()
}

INTENT_CODES: dict[str, str] = {
    "tim_kiem_san_pham": "TK",
    "ngoai_pham_vi": "NV",
}

# Alias tương thích với các module cũ.
INTENTS = ALL_INTENTS
SOFT_TAGS = ALL_SOFT_TAGS


# ---------------------------------------------------------------------------
# Kiểm tra tính nhất quán ngay khi import
# ---------------------------------------------------------------------------
assert len(ALL_INTENTS) == 2, "Phải có đúng 2 intent"
assert len(ALL_SOFT_TAGS) == 42, "Phải có đúng 42 soft tag"
assert len(set(ALL_INTENTS)) == len(ALL_INTENTS), "Intent bị trùng"
assert len(set(ALL_SOFT_TAGS)) == len(ALL_SOFT_TAGS), "Soft tag bị trùng"
assert set(INTENT_METADATA) == set(ALL_INTENTS), "Metadata intent lệch enum"
assert set(TAG_METADATA) == set(ALL_SOFT_TAGS), "Metadata tag lệch enum"
assert all(meta.code == code for code, meta in INTENT_METADATA.items())
assert all(meta.code == code for code, meta in TAG_METADATA.items())
assert sum(len(items) for items in INTENT_GROUPS.values()) == 2
assert sum(len(items) for items in TAG_GROUPS.values()) == 42
assert sum(meta.target_samples_count for meta in INTENT_METADATA.values()) == 250
assert all(meta.target_samples_count > 0 for meta in INTENT_METADATA.values())
assert all(meta.target_samples_count == 20 for meta in TAG_METADATA.values())
