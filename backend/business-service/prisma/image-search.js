/**
 * Tìm ảnh sản phẩm thật qua DuckDuckGo image search cho toàn bộ products.
 * (prisma/match-images.js sẽ ưu tiên ảnh catalog cùng hãng nếu khớp chính xác hơn.)
 *
 *   node prisma/image-search.js --limit=8    # thử 8 sản phẩm
 *   node prisma/image-search.js              # chạy hết, lưu .cache/image-search.json
 *
 * Mỗi URL ứng viên được kiểm tra bằng request thật (không gửi Referer) để bảo đảm
 * hotlink được từ frontend; kết quả nhiều phương án được giữ lại để tránh trùng.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";
import { normalize } from "./image-catalog.js";

const OUT = path.resolve("prisma/.cache/image-search.json");
const DELAY = Number((process.argv.find((a) => a.startsWith("--delay=")) ?? "").split("=")[1]) || 1500;

const UA = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="126", "Google Chrome";v="126"',
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
};

/** CDN/website ảnh dùng được cho trang bán hàng. */
const GOOD_HOST =
  /logitechg\.com|logitech\.com|razerzone\.com|dlcdnwebimgs\.asus\.com|steelseries\.com|hyperxgaming|media-amazon|bbystatic|bestbuy|costcoprodimages|corsair\.com|sony\.com|\.cdn\.shopify\.com|wooting\.io|keychron|nuphy|endgamegear|glorious|glorious|mrnav|epos\.audio|sihoo|flexispot|ergotron|humanskace|creative\.com|master-gears|zaopin|vaxee|lamzu|pulsar|finalmouse|ninjutso|wlmouse|mchose|attackshark|ajazz|dareu|fantech|rapoo|varmilo|leopold|filco|realforce|melgeek|drunkdeer|monsgeek|akko|royalkludge|xtrfy|cherry|artisansquid|artison|esptiger|xraypad|pavadesign|g-wolves|gwolves|cyrox|darmoshark|cyberpower|shopify|cdn\.shop|myshopify/;

/** Ảnh review/blog/watermark/chụp bởi người dùng — chỉ dùng khi không còn gì khác. */
const MEDIOCRE_HOST =
  /notebookcheck|reddit\.com|redd\.it|pinimg\.com|karousell|susercontent|shopee|lazcdn|aliexpress|alibaba|taobao|tmall|jd\.com|ebayimg|imgbb|postimg|photobucket|wallpapersafari|hdqwalls|unsplash|wallpaper|wtwsocial|gzh5|tripadvisor|facebook|fbexternal|ytimg\.com|youtube|medium\.com|theverge|tomsguide|tomshw|pcmag|puntech|rtings|wired|cnet|ndtv|gizmodo|bgr|digitaltrends|androidauthority|thuthuat|chinhsau|vntic|vn|blog|news|artfile|kayac|amazon\.com\/images\/I\/[A-Za-z0-9]+\._(AC_SX38)_/;

const TYPE_WORD = {
  chuot: "gaming mouse",
  "ban-phim": "mechanical keyboard",
  "lot-chuot": "desk mat mousepad",
  "tai-nghe": "gaming headset",
  ghe: "ergonomic office chair",
  "arm-man-hinh": "monitor arm",
  soundcard: "usb dac amplifier",
  ban: "height adjustable desk",
  "phu-kien-cong-thai-hoc": "",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jar = {};
const cookies = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
const takeCookies = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    if (i > 0) jar[kv.slice(0, i)] = kv.slice(i + 1);
  }
};

/** Chữ mô tả tiếng Việt trong tên ta — bỏ khỏi query tìm kiếm. */
const VN_FILLER = new Set([
  "ban", "phim", "co", "khi", "tai", "nghe", "lot", "chuot", "ghe", "ngoai", "ngu",
  "man", "hinh", "am", "thanh", "khong", "day", "pin", "toi", "den", "may", "tinh",
  "cho", "game", "chuyen", "dung", "vang", "dau", "nhan", "cong", "tat", "kinh",
  "lu", "giup", "ho", "so", "vai", "nhua", "go", "sat", "kem", "dai", "ngan",
]);

/** "Logitech Logitech G703 HERO" -> "g703 hero" (bỏ brand lặp, bỏ chữ VN). */
const modelTokens = (name, brand) => {
  const b = normalize(brand).split(" ");
  let n = normalize(name);
  for (const tok of b) while (n.startsWith(`${tok} `)) n = n.slice(tok.length + 1);
  return n
    .split(" ")
    .filter((t) => t && !VN_FILLER.has(t))
    .join(" ");
};

const queryFor = (p, model) =>
  [p.brand?.name ?? "", model, TYPE_WORD[p.category?.slug] ?? ""]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(" ");

const searchImages = async (query, attempt = 0) => {
  const page = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { ...UA, cookie: cookies() || "t=..." },
  });
  takeCookies(page);
  const html = await page.text();
  const vqd = html.match(/vqd="([^"]+)"/)?.[1] ?? html.match(/vqd=([\d-]+)/)?.[1];
  if (!vqd) throw new Error(`khong co vqd (HTTP ${page.status})`);
  const res = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`,
    { headers: { ...UA, cookie: cookies(), referer: "https://duckduckgo.com/" } },
  );
  takeCookies(res);
  if (res.status === 403 && attempt < 3) {
    await sleep(4000 * (attempt + 1));
    return searchImages(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`i.js HTTP ${res.status}`);
  const json = await res.json().catch(() => null);
  return json?.results ?? [];
};

const rank = (results, brand, model) => {
  const brandTok = normalize(brand).split(" ").filter((t) => t.length > 2);
  const modelTok = normalize(model).split(" ").filter(Boolean);
  const digitTok = modelTok.filter((t) => /\d/.test(t));
  const generic = new Set(["gaming", "mouse", "keyboard", "wireless", "headset", "chair", "desk", "pro", "max", "mini"]);
  const strong = modelTok.filter((t) => !generic.has(t));

  return results
    .filter((r) => typeof r.image === "string" && r.image.startsWith("https://"))
    .filter((r) => /\.(png|jpe?g|webp)(\?|$)/i.test(r.image) || /cdn\.shop|media-amazon|resource\.|dlcdnwebimgs/.test(r.image))
    .map((r) => {
      const hay = normalize(`${r.image} ${r.url ?? ""} ${r.title ?? ""}`);
      const host = new URL(r.image).hostname;
      const brandHit = brandTok.some((t) => hay.includes(t));
      const modelHit = strong.filter((t) => hay.includes(t)).length;
      if (!brandHit || (digitTok.length && !digitTok.every((t) => hay.includes(t)))) return null;
      let s = 1 + modelHit;
      if (GOOD_HOST.test(host)) s += 3;
      if (MEDIOCRE_HOST.test(host)) s -= 3;
      if (/review|unboxing|wallpaper|setup|room|desk|showcase|blog|news/.test(normalize(r.title ?? ""))) s -= 2;
      if ((r.width ?? 0) >= 800 && (r.height ?? 0) >= 500) s += 2;
      if ((r.width ?? 0) < 420 || (r.height ?? 0) < 320) s -= 4;
      if (/logo|icon|banner|thumbnail|sprite|og\.|lifestyle/.test(normalize(r.image))) s -= 3;
      if (/gallery|product|pdp|\/files\/|preview|item|_ac_/.test(normalize(r.image))) s += 1;
      return { image: r.image, page: r.url, title: r.title, width: r.width, height: r.height, host, s };
    })
    .filter(Boolean)
    .sort((a, b) => b.s - a.s);
};

const usable = async (url) => {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 9000);
    const res = await fetch(url, { headers: { ...UA, range: "bytes=0-2047", referer: undefined }, signal: c.signal });
    clearTimeout(t);
    if (!res.ok && res.status !== 206) return `HTTP ${res.status}`;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return type || "khong-phai-anh";
    return null;
  } catch (e) {
    return String(e?.cause?.code ?? e.message ?? e).slice(0, 24);
  }
};

const pickFor = async (p, used) => {
  const model = modelTokens(p.name, p.brand?.name ?? "");
  const q = queryFor(p, model);
  let ranked;
  try {
    ranked = rank(await searchImages(q), p.brand?.name ?? "", model);
  } catch (e) {
    return { query: q, model, error: String(e.message).slice(0, 60), urls: [] };
  }
  const urls = [];
  const rejected = [];
  for (const r of ranked.slice(0, 25)) {
    if (urls.length >= 3 || rejected.length >= 5) break;
    if ((used.get(r.image) ?? 0) >= 2) { rejected.push(`${r.host}:trung`); continue; }
    const why = await usable(r.image);
    if (why) { rejected.push(`${r.host}:${why}`); continue; }
    used.set(r.image, (used.get(r.image) ?? 0) + 1);
    urls.push({ image: r.image, title: r.title, page: r.page, width: r.width, height: r.height, s: r.s });
  }
  return { query: q, model, urls, rejected, found: ranked.length };
};

const main = async () => {
  const limit = Number((process.argv.find((a) => a.startsWith("--limit=")) ?? "").split("=")[1]) || 0;
  const refresh = process.argv.includes("--refresh");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, brand: { select: { name: true } }, category: { select: { slug: true } } },
    orderBy: { id: "asc" },
  });

  mkdirSync(path.dirname(OUT), { recursive: true });
  const cache = existsSync(OUT) && !refresh ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const used = new Map();
  for (const v of Object.values(cache)) {
    for (const u of v.urls ?? []) used.set(u.image, (used.get(u.image) ?? 0) + 1);
  }
  const todo = products.filter((p) => !cache[p.id] || refresh);
  const batch = limit > 0 ? todo.slice(0, limit) : todo;
  console.log(`DDG image search: ${batch.length}/${products.length} sản phẩm (delay ${DELAY}ms)`);

  let ok = 0;
  for (let i = 0; i < batch.length; i += 1) {
    const p = batch[i];
    const found = await pickFor(p, used);
    cache[p.id] = found;
    if (found.urls?.length) ok += 1;
    writeFileSync(OUT, JSON.stringify(cache, null, 0));
    if ((i + 1) % 15 === 0 || i === batch.length - 1 || !found.urls?.length) {
      const host = found.urls?.[0]?.image ? new URL(found.urls[0].image).hostname : `✗ ${(found.rejected ?? []).slice(0, 3).join(",")}${found.error ?? ""}`;
      console.log(`  ${i + 1}/${batch.length} (có ảnh ${ok}) #${p.id} ${p.name.slice(0, 40)} -> ${host}`);
    }
    await sleep(DELAY);
  }

  writeFileSync(OUT, JSON.stringify(cache, null, 0));
  const total = Object.values(cache).filter((v) => v.urls?.length).length;
  console.log(`\nXong: ${total}/${Object.keys(cache).length} sản phẩm có ảnh. Cache: ${OUT}`);
};

main()
  .catch((e) => { console.error("IMAGE SEARCH THẤT BẠI:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
