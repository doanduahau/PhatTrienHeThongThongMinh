"""Tang 1: boc tach cac rang buoc cung (hard constraints) bang regex."""

from __future__ import annotations

import re
from typing import Any

from .text_utils import fold_vietnamese

# ---------------------------------------------------------------------------
# Chuan hoa so / tien te
# ---------------------------------------------------------------------------
_NUM = r"\d+(?:\.\d+)?"
_PRICE_UNIT_FACTORS = {
    "trieu": 1_000_000,
    "tr": 1_000_000,
    "cu": 1_000_000,
    "k": 1_000,
    "nghin": 1_000,
    "ngan": 1_000,
    "canh": 1_000,
    "xi": 100_000,
    "vnd": 1,
    "dong": 1,
    "d": 1,
}
_PRICE_UNITS = "trieu|tr|cu|k|nghin|ngan|canh|xi|vnd|dong|d"
_AMOUNT_RE = re.compile(rf"(?P<num>{_NUM})\s*(?P<unit>{_PRICE_UNITS})\b")

_WEIGHT_RE = re.compile(rf"(?P<num>{_NUM})\s*(?P<unit>kg|gram|gam|gr|g)\b")
_WEIGHT_FACTORS = {"kg": 1000.0, "gram": 1.0, "gam": 1.0, "gr": 1.0, "g": 1.0}

_HZ_RE = re.compile(rf"(?P<num>{_NUM})\s*(?P<kilo>k)?\s*(?:hz|hertz)\b")
_POLLING_WORD_RE = re.compile(
    r"(?:polling|tan so quet|do tre|rate)\D{0,10}(?P<num>\d{3,5})"
)

# ---------------------------------------------------------------------------
# Tu khoa quan he (da bo dau)
# ---------------------------------------------------------------------------
_MAX_PREFIX_RE = re.compile(
    r"(?<!\w)(?:duoi|nho hon|nhe hon|be hon|re hon|khong qua|toi da|it hon|"
    r"chua toi)\s*(?:khoang|tam)?\s*$"
)
_MIN_PREFIX_RE = re.compile(
    r"(?<!\w)(?:tren|lon hon|to hon|it nhat|toi thieu|hon|tu)"
    r"\s*(?:khoang|tam)?\s*$"
)
_AROUND_PREFIX_RE = re.compile(
    r"(?<!\w)(?:tam|khoang|co|chung|xap xi|quanh|loanh quanh)"
    r"\s*(?:khoang|tam)?\s*$"
)
_MAX_SUFFIX_RE = re.compile(r"^\s*(?:do lai|tro xuong|tro lai)\b")
_MIN_SUFFIX_RE = re.compile(r"^\s*(?:tro len|tro di)\b")

_RANGE_CONNECTORS = {
    "den",
    "toi",
    "-",
    "–",
    "—",
    "~",
    "->",
    "hoac",
    "va",
}

# ---------------------------------------------------------------------------
# Danh muc
# ---------------------------------------------------------------------------
# Thu tu uu tien: ban phim truoc ban (de "ban phim" khong bi nham la "ban")
_CATEGORY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "ban_phim",
        re.compile(
            r"\bban phim\b|\bkeyboard\b|\bkeycap\b|\bphim co\b|\bnumpad\b|"
            r"\bswitch\b|\bhotswap\b"
        ),
    ),
    (
        "tai_nghe",
        re.compile(
            r"\btai nghe\b|\bheadphone\b|\bheadset\b|\bearphone\b|\biem\b|"
            r"in[\s-]?ear|on[\s-]?ear"
        ),
    ),
    (
        "chuot",
        re.compile(r"\bchuot\b|\bmouse\b|chuot gaming|chuot khong day"),
    ),
    (
        "ghe",
        re.compile(r"\bghe\b|\bchair\b|ghe cong thai hoc|ghe gaming"),
    ),
    (
        "arm",
        re.compile(
            r"\barm\b|tay treo|gia do man hinh|ke man hinh|mount man hinh"
        ),
    ),
    (
        "ban",
        re.compile(r"\bban\b(?!\s*phim)|\bdesk\b|ban nang ha|standing desk"),
    ),
    (
        "lot_chuot",
        re.compile(r"lot chuot|\bpad\b|mouse\s*pad|ban di chuot"),
    ),
    (
        "soundcard",
        re.compile(r"sound\s*card|\bdac\b|\bamp\b"),
    ),
    (
        "phu_kien",
        re.compile(r"ke tay|ke chan|gia treo tai nghe|phu kien"),
    ),
]

# ---------------------------------------------------------------------------
# Thuong hieu (Brand)
# ---------------------------------------------------------------------------
_BRAND_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Logitech", re.compile(r"\blogitech\b|\blogi\b|\bg\s*pro\b|\bg502\b|\bg304\b|\bmx\s*master\b")),
    ("Razer", re.compile(r"\brazer\b|\bviper\b|\bdeathadder\b|\bbasilisk\b|\borochi\b|\bblackwidow\b|\bhuntsman\b")),
    ("Pulsar", re.compile(r"\bpulsar\b")),
    ("Lamzu", re.compile(r"\blamzu\b|\batlantis\b|\bthorn\b|\bmaya\b")),
    ("Zowie", re.compile(r"\bzowie\b|\bbenq\b")),
    ("Attack Shark", re.compile(r"attack\s*shark")),
    ("Zaopin", re.compile(r"\bzaopin\b")),
    ("Ajazz", re.compile(r"\bajazz\b")),
    ("Akko", re.compile(r"\bakko\b|\bmonsgeek\b")),
    ("Keychron", re.compile(r"\bkeychron\b")),
    ("Wooting", re.compile(r"\bwooting\b")),
    ("Aula", re.compile(r"\baula\b|\bf75\b")),
    ("Xinmeng", re.compile(r"\bxinmeng\b")),
    ("HyperX", re.compile(r"\bhyperx\b|\bcloud\s*(?:ii|2|3|iii|alpha|stinger)\b")),
    ("Sony", re.compile(r"\bsony\b|\bwh-1000\b|\binzone\b")),
    ("SteelSeries", re.compile(r"steel\s*series|\barctis\b|\bapex\b|\brival\b|\baerox\b")),
    ("Corsair", re.compile(r"\bcorsair\b")),
    ("ASUS", re.compile(r"\basus\b|\brog\b|\btuf\b")),
    ("Cooler Master", re.compile(r"cooler\s*master|\bmm71\d\b|\bmm720\b")),
    ("DareU", re.compile(r"\bdareu\b")),
    ("Fantech", re.compile(r"\bfantech\b")),
    ("Filco", re.compile(r"\bfilco\b|\bmajestouch\b")),
    ("Leopold", re.compile(r"\bleopold\b")),
    ("NuPhy", re.compile(r"\bnuphy\b")),
    ("Royal Kludge", re.compile(r"royal\s*kludge|\brk\d+\b|\brk\b")),
    ("DrunkDeer", re.compile(r"drunk\s*deer")),
    ("VXE", re.compile(r"\bvxe\b|\bvgn\b|\bmchose\b|\batk\b")),
    ("Kysona", re.compile(r"\bkysona\b")),
    ("Darmoshark", re.compile(r"\bdarmoshark\b")),
    ("Endgame Gear", re.compile(r"endgame\s*gear|\bop1\b|\bxm2\b")),
    ("Ninjutso", re.compile(r"\bninjutso\b|\bsora\b")),
    ("WLmouse", re.compile(r"wl\s*mouse|\bbeast\s*x\b")),
    ("Finalmouse", re.compile(r"final\s*mouse|\bultralightx\b")),
    ("Artisan", re.compile(r"\bartisan\b|\bzero\b|\bhien\b|\bhayate\b")),
    ("Xraypad", re.compile(r"x[\s-]?ray\s*pad|\baqua\s*control\b")),
    ("Tangzu", re.compile(r"\btangzu\b|\bwan[\s']*er\b")),
    ("Moondrop", re.compile(r"\bmoondrop\b")),
    ("Truthear", re.compile(r"\btruthear\b")),
    ("7Hz", re.compile(r"\b7hz\b")),
    ("KZ", re.compile(r"\bkz\b")),
    ("Sennheiser", re.compile(r"sennheiser|\bepos\b")),
    ("Audio-Technica", re.compile(r"audio[\s-]?technica")),
    ("Beyerdynamic", re.compile(r"beyerdynamic|\bdt\s*\d+\b")),
    ("Herman Miller", re.compile(r"herman\s*miller|\baeron\b")),
    ("Sihoo", re.compile(r"\bsihoo\b")),
    ("Epione", re.compile(r"\bepione\b")),
    ("HyperWork", re.compile(r"hyper\s*work")),
    ("North Bayou", re.compile(r"north\s*bayou|\bnb\s*f80\b|\bnb\s*f160\b")),
]

# ---------------------------------------------------------------------------
# Cac tu stopword / tu khoa chung can loai bo khi trich xuat keyword ten SP
# ---------------------------------------------------------------------------
_NOISE_WORDS = {
    "tim", "kiem", "mua", "cho", "toi", "minh", "shop", "oi", "can", "muon",
    "co", "loai", "nao", "cai", "chiec", "con", "bo", "san", "pham", "phu", "kien",
    "chuot", "mouse", "ban", "phim", "keyboard", "phim", "co", "tai", "nghe",
    "headphone", "headset", "ghe", "chair", "arm", "lot", "pad", "mousepad",
    "gaming", "game", "choi", "van", "phong", "lam", "viec", "gia", "re", "tot",
    "duoi", "tren", "tam", "khoang", "tu", "den", "trieu", "tr", "cu", "nghin",
    "ngan", "k", "vnd", "dong", "khong", "day", "wireless", "co", "wired",
    "bluetooth", "tri", "mode", "sieu", "nhe", "under", "claw", "palm", "fingertip",
    "grip", "tay", "nho", "to", "cong", "thai", "hoc", "doi", "xung", "silent",
    "im", "lang", "hotswap", "hot", "swap", "led", "rgb", "mic", "micro", "chong",
    "on", "anc",
}

# ---------------------------------------------------------------------------
# Ket noi
# ---------------------------------------------------------------------------
_CONNECTIVITY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("wireless", re.compile(r"khong day|wireless|2\.4\s*g(hz)?|receiver|dongle")),
    ("bluetooth", re.compile(r"bluetooth|\bbt\b")),
    ("type-c", re.compile(r"type[\s-]?c|usb[\s-]?c")),
    ("wired", re.compile(r"co day|cam day|\bwired\b|usb(?![\s-]?c)")),
    ("multi", re.compile(r"da ket noi|3\s*(?:mode|che do|cach ket noi)|tri[\s-]?mode")),
]


# ---------------------------------------------------------------------------
# Ham phu
# ---------------------------------------------------------------------------
def _expand_shorthand(match: re.Match[str]) -> str:
    """'1tr5' -> '1.5 trieu', '2k5' -> '2.5 k'."""
    num, unit, digit = match.group(1), match.group(2), match.group(3)
    canonical = "trieu" if unit in {"trieu", "tr"} else unit
    return f"{num}.{digit} {canonical}"


def _expand_half(match: re.Match[str]) -> str:
    """'1tr ruoi' -> '1.5 trieu'."""
    num, unit = match.group(1), match.group(2)
    canonical = "trieu" if unit in {"trieu", "tr"} else unit
    return f"{float(num) + 0.5} {canonical}"


def _normalize_money_text(text: str) -> str:
    t = fold_vietnamese(text)

    # '1,5' -> '1.5' (dau phay thap phan)
    t = re.sub(r"(?<=\d),(?=\d{1,2}(?!\d))", ".", t)

    # '1.000.000' -> '1000000' (dau cham phan cach nghin)
    previous = None
    while previous != t:
        previous = t
        t = re.sub(r"(?<=\d)\.(?=\d{3}(?!\d))", "", t)

    t = re.sub(r"\b(\d+)\s*(trieu|tr|cu|k)\s*(\d)\b", _expand_shorthand, t)
    t = re.sub(
        r"\b(\d+(?:\.\d+)?)\s*(trieu|tr|cu|k)\s*ruoi\b", _expand_half, t
    )
    return t


def _relation(prefix: str, suffix: str) -> str | None:
    """Tra ve 'max' / 'min' / 'around' dua tren tu khoa sat so tien."""
    if _MAX_PREFIX_RE.search(prefix) or _MAX_SUFFIX_RE.search(suffix):
        return "max"
    if _MIN_PREFIX_RE.search(prefix) or _MIN_SUFFIX_RE.search(suffix):
        return "min"
    if _AROUND_PREFIX_RE.search(prefix):
        return "around"
    return None


def _price_of(match: re.Match[str]) -> int:
    value = float(match.group("num")) * _PRICE_UNIT_FACTORS[match.group("unit")]
    return int(round(value))


def _find_price_range(
    text: str, matches: list[re.Match[str]]
) -> tuple[int, int, set[int]] | None:
    for i in range(len(matches) - 1):
        gap = text[matches[i].end() : matches[i + 1].start()].strip(" ,.;:")
        if gap in _RANGE_CONNECTORS:
            low, high = sorted((_price_of(matches[i]), _price_of(matches[i + 1])))
            return low, high, {i, i + 1}
    return None


def _detect_categories(text: str) -> list[str]:
    return [name for name, pattern in _CATEGORY_PATTERNS if pattern.search(text)]


def _detect_brands(text: str) -> list[str]:
    return [brand for brand, pattern in _BRAND_PATTERNS if pattern.search(text)]


# ---------------------------------------------------------------------------
# API chinh
# ---------------------------------------------------------------------------
def extract_hard_constraints(text: str) -> dict[str, Any]:
    """Boc tach rang buoc cung tu cau chat.

    Tra ve dict luon co du cac key (gia tri None/False neu khong tim thay)
    de phia goi khong phai xu ly KeyError.
    """
    folded = fold_vietnamese(text)
    money_text = _normalize_money_text(text)
    categories = _detect_categories(folded)
    brands = _detect_brands(folded)
    polling_context = bool(
        re.search(r"\b(?:polling|hz|tan so quet|do tre|rate)\b", folded)
    ) or "chuot" in categories

    result: dict[str, Any] = {
        "min_price": None,
        "max_price": None,
        "max_weight_g": None,
        "min_weight_g": None,
        "polling_rate_hz": None,
        "connectivity": [],
        "hotswap": False,
        "mac_support": False,
        "has_mic": False,
        "noise_cancelling": False,
        "silent": False,
        "rgb": False,
        "category": categories[0] if categories else None,
        "categories": categories,
        "brand": brands[0] if brands else None,
        "brands": brands,
        "keyword": None,
    }

    # ---------------- Gia ----------------
    amount_matches: list[re.Match[str]] = []
    for match in _AMOUNT_RE.finditer(money_text):
        value = _price_of(match)
        # "4k"/"8k" (va 1k/2k khi noi ve chuot) la polling rate, khong phai gia
        if match.group("unit") == "k" and value <= 8000:
            if value >= 4000 or polling_context:
                continue
        amount_matches.append(match)

    if amount_matches:
        price_range = _find_price_range(money_text, amount_matches)
        if price_range:
            result["min_price"], result["max_price"], _ = price_range
        else:
            max_values: list[int] = []
            min_values: list[int] = []
            around_values: list[int] = []
            bare_values: list[int] = []
            for match in amount_matches:
                prefix = money_text[max(0, match.start() - 30) : match.start()]
                suffix = money_text[match.end() : match.end() + 18]
                relation = _relation(prefix, suffix)
                value = _price_of(match)
                if relation == "max":
                    max_values.append(value)
                elif relation == "min":
                    min_values.append(value)
                elif relation == "around":
                    around_values.append(value)
                else:
                    bare_values.append(value)

            if min_values:
                result["min_price"] = max(min_values)
            if max_values:
                result["max_price"] = min(max_values)
            if around_values:
                around = around_values[-1]
                result["min_price"] = int(round(around * 0.9, -3))
                result["max_price"] = int(round(around * 1.1, -3))
            if (
                bare_values
                and result["min_price"] is None
                and result["max_price"] is None
            ):
                result["max_price"] = max(bare_values)
    # ---------------- Can nang ----------------
    weight_matches = list(_WEIGHT_RE.finditer(money_text))
    if weight_matches:
        max_weights: list[float] = []
        min_weights: list[float] = []
        around_weights: list[float] = []
        for match in weight_matches:
            value = float(match.group("num")) * _WEIGHT_FACTORS[match.group("unit")]
            if value <= 0:
                continue
            prefix = money_text[max(0, match.start() - 30) : match.start()]
            suffix = money_text[match.end() : match.end() + 18]
            relation = _relation(prefix, suffix)
            if relation == "min":
                min_weights.append(value)
            elif relation == "around":
                around_weights.append(value)
            else:
                max_weights.append(value)

        if max_weights:
            result["max_weight_g"] = int(round(min(max_weights)))
        if min_weights:
            result["min_weight_g"] = int(round(max(min_weights)))
        if around_weights and result["max_weight_g"] is None:
            result["max_weight_g"] = int(round(around_weights[-1]))

    # ---------------- Polling rate ----------------
    polling_values: list[int] = []
    for match in _HZ_RE.finditer(money_text):
        value = float(match.group("num"))
        if match.group("kilo"):
            value *= 1000
        polling_values.append(int(round(value)))

    polling_context = bool(
        re.search(r"\b(?:polling|hz|tan so quet|do tre|rate)\b", folded)
    ) or "chuot" in categories
    for match in re.finditer(r"\b([1248])k\b", folded):
        value = int(match.group(1))
        # 4k/8k luon hieu la polling; 1k/2k can ngu canh chuot/polling
        if value >= 4 or polling_context:
            polling_values.append(value * 1000)
    if polling_context:
        for match in _POLLING_WORD_RE.finditer(folded):
            polling_values.append(int(match.group("num")))

    if polling_values:
        result["polling_rate_hz"] = max(polling_values)

    # ---------------- Ket noi ----------------
    result["connectivity"] = [
        name for name, pattern in _CONNECTIVITY_PATTERNS if pattern.search(folded)
    ]

    # ---------------- Thuoc tinh boolean ----------------
    result["hotswap"] = bool(
        re.search(
            r"hot[\s-]?swap|thay switch|thay phim|doi switch|socket\s*(?:3|5)\s*pin",
            folded,
        )
    )
    result["mac_support"] = bool(
        re.search(r"\bmac\b|macos|mac os|macbook|layout mac|phim mac", folded)
    )
    result["has_mic"] = bool(re.search(r"\bmic\b|micro", folded))
    result["noise_cancelling"] = bool(
        re.search(
            r"chong on|khu on|\banc\b|noise cancel|active noise|cach am", folded
        )
    )
    result["silent"] = bool(
        re.search(
            r"\bsilent\b|im lang|khong on|it on|khong tieng|nhe nhang|phong hop",
            folded,
        )
    )
    result["rgb"] = bool(re.search(r"\brgb\b|\bargb\b|\bled\b|den led", folded))

    # ---------------- Tu khoa ten model cu the (Model keyword) ----------------
    model_keywords: list[str] = []
    for m_tok in re.findall(r"\b(?:g\s*pro\s*x|superlight|g502|g304|mx\s*master|viper|deathadder|orochi|basilisk|f75|f87|nb\s*f80|nb\s*f160|wh-1000xm5|cloud\s*ii|cloud\s*3|cloud\s*iii|x2\s*v2|sora|atlantis|maya|thorn|zero|hien|wan'er|waner|aeron)\b", folded):
        model_keywords.append(m_tok.strip())
    if model_keywords:
        result["keyword"] = model_keywords[0]

    return result
