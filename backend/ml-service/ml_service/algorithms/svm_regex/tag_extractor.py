"""Tang 2: boc tach 42 nhan mem (soft tags) tu tu khoa dong nghia."""

from __future__ import annotations

import re

from .constants import SOFT_TAGS
from .text_utils import fold_vietnamese

# Tat ca pattern deu viet tren van ban da bo dau (fold_vietnamese).
_TAG_PATTERNS: dict[str, list[str]] = {
    "claw_grip": [
        r"\bclaw(?:\s*grip)?\b",
        r"kieu cam claw",
        r"cam kieu claw",
        r"cam claw",
    ],
    "palm_grip": [
        r"\bpalm(?:\s*grip)?\b",
        r"kieu cam palm",
        r"cam palm",
        r"ap long ban tay",
        r"cam full long ban tay",
    ],
    "fingertip_grip": [
        r"\bfingertip(?:\s*grip)?\b",
        r"kieu cam fingertip",
        r"cam bang dau ngon tay",
        r"cam dau ngon",
        r"chi dung dau ngon tay",
    ],
    "tay_nho": [
        r"\btay nho\b",
        r"\btay be\b",
        r"\bban tay nho\b",
        r"\bban tay be\b",
        r"\btay mini\b",
        r"\btay nu\b",
        r"nho tay",
    ],
    "tay_to": [
        r"\btay to\b",
        r"\btay lon\b",
        r"\bban tay to\b",
        r"\bban tay lon\b",
        r"\btay nam\b",
        r"\btay nguoi lon\b",
    ],
    "sieu_nhe_under_60g": [
        r"sieu nhe",
        r"under\s*60\s*g",
        r"duoi\s*60\s*(?:g|gram|gam)\b",
        r"nhe hon\s*60\s*(?:g|gram|gam)\b",
        r"nhe duoi\s*60",
        r"60\s*g\s*do lai",
        r"<=?\s*60\s*g",
        r"nhe tenh",
        r"nhe nhu khong",
    ],
    "cong_thai_hoc": [
        r"cong thai hoc",
        r"\bergonomic\b",
        r"thiet ke cong thai hoc",
        r"do moi tay",
        r"om tay",
    ],
    "doi_xung": [
        r"doi xung",
        r"\bambidextrous\b",
        r"\bsymmetrical\b",
        r"dung duoc ca hai tay",
        r"thuan ca hai tay",
        r"hai ben giong nhau",
    ],
    "polling_rate_cao": [
        r"\bpolling\b",
        r"tan so quet",
        r"\b(?:1|2|4|8)\s*k\s*hz\b",
        r"\b(?:1000|2000|4000|8000)\s*hz\b",
        r"do tre thap",
        r"delay thap",
        r"phan hoi nhanh",
        r"\besports\b",
    ],
    "click_silent_im_lang": [
        r"\bsilent\b",
        r"click em",
        r"chuot em",
        r"em ai",
        r"im lang",
        r"khong on",
        r"it on",
        r"khong tieng click",
        r"khong gay tieng on",
        r"nhe nhang",
    ],
    "cuon_vo_cuc_fast_scroll": [
        r"free\s*scroll",
        r"fast\s*scroll",
        r"cuon sieu nhanh",
        r"cuon vo cuc",
        r"con lan tron",
        r"cuon nhanh",
        r"hyper\s*scroll",
        r"cuon khong nac",
        r"nut chuyen che do cuon",
        r"unlock scroll",
    ],
    "chuot_dung_vertical": [
        r"chuot doc",
        r"chuot vertical",
        r"\bvertical mouse\b",
        r"chuot dung",
        r"cam doc",
        r"ergonomic doc",
    ],
    "chuyen_doi_nhieu_may": [
        r"chuyen may",
        r"chuyen doi may",
        r"nhieu thiet bi",
        r"da thiet bi",
        r"multi[\s-]?device",
        r"\b[23]\s*(?:may|thiet bi)\b",
        r"chuyen doi giua cac may",
        r"dung chung nhieu may",
        r"switch giua mac va win",
        r"ket noi nhieu may",
    ],
    "rapid_trigger": [
        r"rapid\s*trigger",
        r"\brapid\b",
        r"hanh trinh ngan",
        r"kich hoat nhanh",
        r"trigger nhanh",
        r"0[.,]1\s*mm",
        r"hall effect",
        r"cam bien hall",
    ],
    "switch_linear": [
        r"\blinear\b",
        r"tuyen tinh",
        r"switch do",
        r"red switch",
        r"switch red",
        r"khong khac",
        r"go thang",
        r"go tron",
        r"muot ma",
    ],
    "switch_tactile": [
        r"\btactile\b",
        r"switch nau",
        r"brown switch",
        r"co khac",
        r"khac nhe",
        r"phan hoi khi nhan",
        r"\bbrown\b",
    ],
    "switch_clicky": [
        r"\bclicky\b",
        r"switch xanh",
        r"blue switch",
        r"tieng click",
        r"click to",
        r"on ao",
    ],
    "am_thocky": [
        r"thock",
        r"\btram am\b",
        r"\bam tram\b",
        r"\btieng tram\b",
        r"\bam day\b",
        r"\bam bass\b",
        r"deep sound",
        r"go thock",
    ],
    "am_clacky": [
        r"\bclacky?\b",
        r"\btieng trong\b",
        r"\bam cao\b",
        r"trong treo",
        r"tach tach",
        r"\bgion\b",
        r"\bam gion\b",
        r"high pitch",
    ],
    "layout_compact": [
        r"\bcompact\b",
        r"nho gon",
        r"\b(?:60|65|75)\s*%\b",
        r"layout nho",
        r"ban phim nho",
        r"\btenkeyless\b",
        r"\btkl\b",
        r"khong (?:co )?numpad",
        r"tiet kiem dien tich",
    ],
    "hot_swap": [
        r"hot[\s-]?swap",
        r"thay switch",
        r"thay phim",
        r"doi switch",
        r"socket\s*(?:3|5)\s*pin",
    ],
    "phim_silent_khong_on": [
        r"phim silent",
        r"switch silent",
        r"go em",
        r"go khong on",
        r"phong hop",
        r"khong lam phien dong nghiep",
        r"go dem",
        r"ban phim im lang",
        r"phim em",
        r"khong on khi go",
    ],
    "low_profile_mong_nhe": [
        r"low[\s-]?profile",
        r"phim mong",
        r"ban phim mong",
        r"mong nhe",
        r"keycap thap",
        r"sieu mong",
        r"thiet ke mong",
    ],
    "fullsize_nhap_lieu_excel": [
        r"full[\s-]?size",
        r"co numpad",
        r"\bnumpad\b",
        r"phim so",
        r"\bexcel\b",
        r"ke toan",
        r"nhap lieu",
        r"lam excel",
        r"day du phim",
    ],
    "layout_mac_chuan": [
        r"layout mac",
        r"phim mac",
        r"mac layout",
        r"cho mac",
        r"macbook",
        r"phim command",
        r"\bcommand\b",
        r"\boption\b",
        r"keycap mac",
        r"macos",
        r"mac os",
    ],
    "co_driver_web": [
        r"driver web",
        r"web driver",
        r"phan mem",
        r"\bdriver\b",
        r"\bmacro\b",
        r"cau hinh qua web",
        r"app cau hinh",
        r"khong can cai driver",
        r"plug and play",
        r"phan mem cau hinh",
    ],
    "dinh_huong_fps": [
        r"\bfps\b",
        r"game fps",
        r"ban sung",
        r"game ban sung",
        r"dau sung",
        r"\baim\b",
        r"tac chien",
        r"\bshooter\b",
    ],
    "deo_lau_em_tai": [
        r"deo lau",
        r"em tai",
        r"khong dau tai",
        r"deo ca ngay",
        r"thoai mai khi deo",
        r"nhe tai",
        r"khong moi tai",
        r"om tai em",
        r"deo lau khong dau",
    ],
    "cach_am_tot": [
        r"cach am",
        r"khu on",
        r"chong on",
        r"noise cancel",
        r"\banc\b",
        r"passive isolation",
        r"kin tai",
        r"co lap am",
        r"cach am moi truong",
    ],
    "iem": [
        r"\biem\b",
        r"in[\s-]?ear",
        r"nhot tai",
        r"tai nghe nhot tai",
        r"\bearphone\b",
        r"tai in ear",
    ],
    "mic_loc_on_dam_thoai_hop": [
        r"\bmic\b",
        r"micro",
        r"loc on",
        r"khu on mic",
        r"hop online",
        r"hop zoom",
        r"google meet",
        r"\bteams\b",
        r"dam thoai",
        r"goi dien",
        r"micro ro",
        r"mic trong",
    ],
    "tai_nghe_on_ear_nhe": [
        r"on[\s-]?ear",
        r"tai nghe on ear",
        r"tai nghe nhe",
        r"tai nghe gon nhe",
        r"headphone on ear",
        r"tai nghe di dong nhe",
    ],
    "game_cs2_valorant": [
        r"\bcs2\b",
        r"\bcsgo\b",
        r"cs:?go",
        r"counter[\s-]?strike",
        r"\bvalorant\b",
        r"\bpubg\b",
        r"\bapex\b",
        r"overwatch",
        r"call of duty",
        r"\bcod\b",
    ],
    "game_moba": [
        r"\bmoba\b",
        r"\blol\b",
        r"lien minh",
        r"league of legends",
        r"\bdota\b",
        r"dota\s*2",
        r"lien quan",
        r"mobile legends",
    ],
    "setup_rgb": [
        r"\brgb\b",
        r"\bargb\b",
        r"\bled\b",
        r"den led",
        r"den rgb",
        r"phat sang",
        r"led mau",
        r"dep lung linh",
    ],
    "pin_trau": [
        r"pin trau",
        r"pin lau",
        r"thoi luong pin",
        r"pin ben",
        r"dung lau",
        r"pin khung",
        r"sac lau",
        r"pin \d+\s*(?:h|gio)\b",
    ],
    "tri_mode": [
        r"3\s*mode",
        r"3\s*che do",
        r"tri[\s-]?mode",
        r"da ket noi",
        r"bluetooth va 2\.4g",
        r"2\.4g va bluetooth",
        r"wired wireless",
        r"3 cach ket noi",
        r"co day va khong day",
        r"3 kieu ket noi",
    ],
    "van_phong_lam_viec": [
        r"van phong",
        r"lam viec",
        r"cong viec",
        r"dong nghiep",
        r"\bwork\b",
        r"\boffice\b",
        r"soan van ban",
        r"\bword\b",
        r"go van ban",
        r"cong so",
        r"nhan vien",
    ],
    "setup_toi_gian_minimalism": [
        r"toi gian",
        r"\bminimal(?:ism)?\b",
        r"gon gang",
        r"setup gon",
        r"sach se",
        r"khong rgb",
        r"don gian",
        r"thanh lich",
        r"dep toi gian",
    ],
    "ngoi_lau_chong_moi_lung": [
        r"ngoi lau",
        r"dau lung",
        r"moi lung",
        r"chong moi lung",
        r"tua lung",
        r"support lung",
        r"cong thai hoc lung",
        r"ngoi \d+\s*tiet",
        r"lam viec lau",
        r"do dau lung",
    ],
    "ban_nang_ha_dung_lam_viec": [
        r"ban nang ha",
        r"nang ha",
        r"dung lam viec",
        r"ngoi dung",
        r"height adjustable",
        r"dieu chinh do cao",
        r"ban dung",
        r"standing desk",
    ],
    "phu_kien_ke_tay_ke_chan": [
        r"ke tay",
        r"ke chan",
        r"gia do tay",
        r"gia do chan",
        r"lot tay",
        r"\barmrest\b",
        r"\bfootrest\b",
        r"do co tay",
        r"ke co tay",
        r"de chan",
    ],
}

_COMPILED: dict[str, list[re.Pattern[str]]] = {
    tag: [re.compile(pattern) for pattern in patterns]
    for tag, patterns in _TAG_PATTERNS.items()
}

# Kiem tra moi tag deu co rule (tranh quen khai bao)
_missing = [tag for tag in SOFT_TAGS if tag not in _COMPILED]
assert not _missing, f"Thieu rule cho tag: {_missing}"


def extract_soft_tags(text: str) -> list[str]:
    """Tra ve danh sach tag (theo thu tu khai bao trong SOFT_TAGS)."""
    folded = fold_vietnamese(text)
    found = {
        tag
        for tag in SOFT_TAGS
        if any(pattern.search(folded) for pattern in _COMPILED[tag])
    }

    # "4k/8k" luon la polling; "1k/2k" can ngu canh chuot/polling
    for match in re.finditer(r"\b([1248])k\b", folded):
        if int(match.group(1)) >= 4 or re.search(
            r"\bchuot\b|\bpolling\b|tan so quet|\bhz\b|do tre", folded
        ):
            found.add("polling_rate_cao")
            break

    # "dưới 59g" / "nhẹ hơn 55 gram" -> sieu nhe
    for match in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(?:g|gram|gam)\b", folded):
        value = float(match.group(1).replace(",", "."))
        if value >= 60:
            continue
        prefix = folded[max(0, match.start() - 24) : match.start()]
        suffix = folded[match.end() : match.end() + 16]
        if re.search(
            r"(?:duoi|nhe hon|nho hon|be hon|under|<=?)\s*$", prefix
        ) or re.search(r"^\s*(?:do lai|tro xuong)", suffix):
            found.add("sieu_nhe_under_60g")
            break

    return [tag for tag in SOFT_TAGS if tag in found]
