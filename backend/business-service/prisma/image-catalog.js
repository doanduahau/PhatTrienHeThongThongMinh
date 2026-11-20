/**
 * Tải catalog công khai (Shopify `products.json`) của phongcachxanh.vn và các
 * hãng/Shopify store đã thử nghiệm được, về cache cục bộ để ghép ảnh thật.
 *
 *   node prisma/image-catalog.js            # tải / cập nhật index
 *   node prisma/image-catalog.js --stat     # chỉ in thống kê file cache
 *   node prisma/image-catalog.js --store=keychron
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PAGE_SIZE = 250;
const MAX_PAGES = 20;
const OUT_DIR = path.resolve("prisma/.cache");
const OUT_FILE = path.join(OUT_DIR, "source-products.json");

/** Chỉ giữ store trả về products.json hợp lệ (thử ngày 20-11-2026). */
const SOURCES = [
  "https://phongcachxanh.vn",
  "https://www.keychron.com",
  "https://lamzu.com",
  "https://endgamegear.com",
  "https://finalmouse.com",
  "https://sihoo.com",
  "https://www.nuphy.co",
  "https://varmilo.com",
  "https://www.melgeek.com",
  "https://www.drunkdeer.com",
  "https://www.wlmouse.com",
  "https://darmoshark.com",
  "https://ninjutso.com",
  "https://www.ajazz.net",
  "https://eweadn.com",
  "https://www.attackshark.com",
  "https://esptiger.com",
  "https://gwolves.shop",
  "https://scyrox.com",
  "https://pulsar.gg",
];

/** Bỏ dấu tiếng Việt + ký tự thừa để so khớp tên sản phẩm. */
export const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Bài đăng không phải sản phẩm (vận chuyển, bảo hành, gift wrap, test...). */
const JUNK =
  /shipping|van chuyen|warranty|bao hanh|gift ?wrap|hoi ?thuong|deposit|chinh sach|policy|test product|proc|proc ?duct|san ?pham ?kiem|non-?returnable|dich ?vu|service fee|installment|tra gop|booking|dat coc|sac du phong|phu kien khong ban roi|link|voucher|the cao|surcharge/;

/**
 * Kiểu sản phẩm dựa vào tên (Việt + Anh). Thứ tự quan trọng:
 * "lót chuột / mousepad" phải kiểm trước "chuột / mouse".
 */
const TYPE_RULES = [
  ["mousepad", /lot chuot|mouse ?pad|desk ?mat|glass pad|gan tat/],
  ["keyboard", /ban phim|mechanical keyboard|keyboard|hall ?effect keyboard|numpad|keeb/],
  ["soundcard", /sound ?card|\bdac\b|\bamp\b|amplifier|audio interface|usb sound|dsp/],
  ["headset", /tai nghe|headset|headphone|earphone|earbud|\biem\b|in-?ear|monitor headphone/],
  ["chair", /\bghe\b|gaming chair|office chair|ergonomic chair|\bchair\b/],
  ["monitor_arm", /tay do|monitor arm|\barm\b.*man hinh|mount bracket|monitor mount/],
  ["desk", /ban lam viec|standing desk|height adjustable|\bdesk\b|workstation table/],
  ["mouse", /chuot|gaming mouse|\bmouse\b|mice|trackball|chuot khong day/],
  ["monitor", /man hinh|\bmonitor\b/],
];

/** Phụ kiện — ảnh của nó không dùng cho thiết bị được. */
const ACCESSORY =
  /\b(feet|skate|skates|grip|grips|tape|skin|skins|sticker|decal|keycap|keycaps|switch|switches|dongle|dock|charger|cable|pouch|case|bag|box|brush|cleaning|base|sheet|film|cover|kit|o-ring|lube|mod|bat|battery|wrist rest|pad stack|cap|ring|stand|mount kit|kệ|day chuot|op|nam cham|nut|oc|vit)\b/;

export const classify = (title) => {
  const n = normalize(title);
  for (const [type, re] of TYPE_RULES) if (re.test(n)) return type;
  return "other";
};

export const isAccessory = (title) => ACCESSORY.test(normalize(title));
export const isJunk = (title) => JUNK.test(normalize(title));

const toRow = (origin, p) => {
  const srcs = (p.images ?? [])
    .map((i) => i?.src)
    .filter((s) => typeof s === "string" && s.startsWith("https://"));
  if (!srcs.length || isJunk(p.title)) return null;
  return {
    store: origin.replace(/^https?:\/\/(www\.)?/, ""),
    title: String(p.title).trim(),
    vendor: String(p.vendor ?? "").trim(),
    srcs: srcs.slice(0, 8),
  };
};

const fetchStore = async (origin) => {
  const out = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetch(`${origin}/products.json?limit=${PAGE_SIZE}&page=${page}`, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!res.ok) {
        console.log(`  ${origin} trang ${page}: HTTP ${res.status}`);
        break;
      }
      const json = await res.json().catch(() => null);
      const products = json?.products ?? [];
      for (const p of products) {
        const row = toRow(origin, p);
        if (row) out.push(row);
      }
      if (products.length < PAGE_SIZE) break;
      await new Promise((r) => setTimeout(r, 350));
    }
  } catch (e) {
    console.log(`  ${origin}: ${String(e?.cause?.code ?? e.message ?? e).slice(0, 32)}`);
  }
  return out;
};

const main = async () => {
  if (process.argv.includes("--stat")) {
    if (!existsSync(OUT_FILE)) return console.log("chưa có cache");
    const rows = JSON.parse(readFileSync(OUT_FILE, "utf8"));
    const byStore = {};
    for (const r of rows) byStore[r.store] = (byStore[r.store] ?? 0) + 1;
    console.log(`${rows.length} sản phẩm nguồn:`);
    for (const [s, n] of Object.entries(byStore).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${s}`);
    return;
  }

  const only = process.argv.find((a) => a.startsWith("--store="))?.split("=")[1];
  const sources = only ? SOURCES.filter((s) => s.includes(only)) : SOURCES;
  const all = [];
  for (const origin of sources) {
    const rows = await fetchStore(origin);
    console.log(`  ${origin}: ${rows.length} sản phẩm (tổng ${all.length + rows.length})`);
    all.push(...rows);
    await new Promise((r) => setTimeout(r, 350));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(all));
  const withImg = new Set(all.map((r) => r.srcs[0])).size;
  console.log(`\nĐã lưu ${OUT_FILE}: ${all.length} sản phẩm, ${withImg} sản phẩm distinct`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error("TẢI CATALOG THẤT BẠI:", e); process.exitCode = 1; });
}
