import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { normalize, isAccessory } from "./image-catalog.js";
const dir = path.resolve("prisma/.cache/image-repair");
const read = (name) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
const save = (name, data) => writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
const flags = [2,3,5,8,17,21,22,24,25,27,29,31,33,34,35,38,39,40,43,54,55,57,58,59,60,67,68,71,76,81,82,83,85,86,88,90,91,94,95,96,107,112,113,114,120,126,130,135,138,139,143,145,146,148,149,152,153,155,156,157,162,164,165,167,168,169,170,171,174,175,176,185,187,190,191,197,201,204,209,210,211,212,213,218,221,222,228,230,231,235,236,238,239,240,241,242,243,244,247,248,252,253,254,255,256,259,262,264,265,266,267,272,273,277,278,281,285,286,287,288,289,291,293,294,296,297,298,300,303,305,306,307,309,310,311,313,315,316,319,321,326,327,335,345,348,351,352,353,354,355,356,357,359,360,361,362,363,364,365,366,367,368,371,372,373,374,377,378,379,380,381,382,383,384,385,386,387,389,390,394,395,398,399,400,403,404,405];
const types = { chuot: "mouse", "ban-phim": "keyboard", "tai-nghe": "headset", ghe: "chair", "arm-man-hinh": "monitor arm", ban: "standing desk", "lot-chuot": "mousepad", soundcard: "DAC" };
const custom = {
  8: "Logitech G Pro wireless gaming mouse", 21: "Razer Viper V3 Pro black mouse", 22: "Razer Viper V3 Pro white mouse", 57: "Vaxee XE wireless mouse", 58: "Vaxee Outset AX wireless mouse", 59: "Vaxee NP-01S wireless mouse", 60: "Vaxee Zygen NP-01 mouse", 145: "Metaphyuni XPH01 magnesium mouse", 155: "HyperX Cloud II red headset", 157: "HyperX Cloud II wireless headset", 167: "Logitech G Pro X 2 Lightspeed white headset", 168: "Logitech G Pro X 2 Lightspeed magenta headset", 210: "KZ Castor Harman earphones", 278: "Keychron Lemokey L3 keyboard", 296: "MonsGeek MG75 V2 keyboard", 310: "Royal Kludge RK84 V2 keyboard", 351: "Epione palm rest keyboard", 355: "HyperWork lumbar cushion", 356: "HyperWork L01 laptop stand", 364: "HyperWork Core Arm MCA01 black", 365: "HyperWork Core Arm MCA01 white", 366: "HyperWork Core Arm MCA02 dual", 383: "UpGen Athena standing desk", 384: "Drapow E2 standing desk", 400: "VXE Sirius wireless charging mousepad", 399: "LGG Venus Pro white mousepad"
  ,122: "Incott Ghero Pro yellow mouse", 141: "Pwnage Stormbreaker olive green mouse", 143: "Vancer Pollux lavender mouse", 144: "Vancer Castor cyan mouse", 146: "Waizowl OGM Pro Ink Feather mouse", 149: "Mchose AX5 silver mouse", 152: "Delux M900 Pro white mouse", 153: "Machenike M7 Pro white mouse", 232: "DrunkDeer A75 Pro silver keyboard", 235: "VXE ATK68 black keyboard", 236: "ATK75 Pro white keyboard", 237: "ATK RS7 Pro silver keyboard", 270: "Keychron Q3 Max space grey keyboard", 302: "Aula F99 Pro matcha green keyboard", 308: "FL Esports CMK99 Sammar keyboard", 309: "Royal Kludge RK61 Plus white keyboard", 312: "Royal Kludge M75 purple keyboard", 313: "Nuphy Air75 V2 lunar gray keyboard", 327: "Xinmeng M71 silver keyboard", 361: "Humanmotion T7-1A monitor arm", 362: "Humanmotion T7-2A monitor arm", 373: "Ergotron LX polished aluminum monitor arm", 262: "Logitech Pro X TKL magenta keyboard", 264: "Logitech G915 white keyboard", 165: "Logitech G Pro X wired headset black", 405: "Xraypad Equate Plus grey mousepad"
};
custom[244] = "Razer DeathStalker V2 Pro TKL white keyboard";
const headers = { "user-agent": "Mozilla/5.0", "accept-language": "en-US,en;q=0.9" };
const colorWords = (color) => normalize(color).split(" ").map((w) => ({ den: "black", trang: "white", bac: "silver", xam: "gray", do: "red", tim: "purple", hong: "pink", vang: "yellow", xanh: "blue", nau: "brown" })[w] ?? w).filter((w) => /^(black|white|silver|gray|grey|red|purple|pink|yellow|blue|green|orange|magenta|walnut)$/.test(w));
const fetchTimed = (url, extra = {}) => fetch(url, { headers, signal: AbortSignal.timeout(18000), ...extra });
async function search(query) {
  const page = await fetchTimed(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
  const cookies = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const html = await page.text();
  const vqd = html.match(/vqd="([^"]+)"/)?.[1] ?? html.match(/vqd=([\d-]+)/)?.[1];
  if (!vqd) throw new Error(`No search token (${page.status})`);
  const response = await fetchTimed(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`, { headers: { ...headers, cookie: cookies, referer: "https://duckduckgo.com/" } });
  if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
  return (await response.json()).results ?? [];
}
const noise = new Set("ban phim co tu tinh gaming nhom cao cap sieu mong nhe khong day va cho cong thai hoc headphone headset keyboard mouse pad desk chair ergonomic edition large small medium size xl black white magenta gray grey blue red silver purple pink yellow orange green wireless wired rgb tri mode 2 4g fullsize low profile gasket numpad optical aluminum mechanical qmk via cotton candy hong trang carbon magnesium dual motor standing heavy duty monitor arm single laptop stand space sit walnut glacier cyan magnetic hot swap switch rapid trigger compact 96 100 cnc version screen oled".split(" "));
function score(c, query, p) {
  const hay = normalize(`${c.title} ${c.page ?? ""} ${c.url}`).replace(/humanmotion/g, "human motion"), words = new Set(hay.split(" "));
  const required = normalize(query).replace(/humanmotion/g, "human motion").split(" ").filter((w) => !noise.has(w));
  const hits = required.filter((w) => words.has(w)).length;
  if (required.some((w) => /\d/.test(w) && !words.has(w))) return -100;
  if (hits < required.length) return -100;
  const title = normalize(c.title), url = c.url.toLowerCase();
  const qwords = new Set(normalize(query).split(" "));
  const twords = new Set(title.split(" "));
  for (const variant of ["mini", "max", "pro", "plus", "dex", "ultra", "honkai", "wuthering", "crazylight", "founder", "founders", "feather", "v2", "v3", "v4", "v5", "gen2", "2r", "es"]) {
    if (twords.has(variant) && !qwords.has(variant)) return -100;
  }
  if (p.category.slug === "chuot" && /keyboard|ban phim|headset|tai nghe/.test(title)) return -100;
  if (p.category.slug === "tai-nghe" && /gaming mouse|chuot|superlight/.test(title)) return -100;
  if (p.category.slug === "ban-phim" && /gaming mouse|chuot|superlight|headset|tai nghe/.test(title)) return -100;
  if (/tech specification|announces|software|user guide|instruction manual/.test(title)) return -100;
  if (/grip|skates|feet|sticker|skin|carrying|case for|replacement|keycaps|keycap|switch tester|mouse button/.test(title) && p.category.slug !== "phu-kien-cong-thai-hoc") return -100;
  let s = hits * 3;
  const wantedColors = colorWords(p.color ?? "");
  for (const color of wantedColors) {
    if (words.has(color) || (color === "gray" && words.has("grey"))) s += 12;
    else if (["black", "white", "silver", "gray", "grey", "red", "purple", "pink", "yellow", "blue", "green", "orange", "magenta", "walnut"].some((w) => twords.has(w))) s -= 16;
  }
  if (/shopify|resource.logitech|razerzone|assets.corsair|steelseries|dlcdnwebimgs|hyperx/.test(url)) s += 3;
  if (/review|unboxing|comparison|vs |wallpaper|software|driver|manual|instruction|user guide|box |packaging|skin|grip/.test(title)) s -= 9;
  if (/banner|feature|lifestyle|specification|software|driver|detail|diagram|100x|200x|300x/.test(url)) s -= 7;
  if ((c.width ?? 1000) < 800 && (c.height ?? 1000) < 800) s -= 15;
  if (/front|gallery.1|gallery-1|hero|main|primary|product/.test(url)) s += 2;
  if (/white|magenta|black|gray|grey|blue|walnut/.test(normalize(p.name))) {
    const colors = normalize(p.name).split(" ").filter((w) => /^(white|magenta|black|gray|grey|blue|walnut)$/.test(w));
    for (const color of colors) { if (words.has(color)) s += 5; else if (/white|magenta|black|gray|grey|blue|walnut/.test(title)) s -= 7; }
  }
  return s;
}
export async function collectCandidates() {
  const products = read("products.json");
  const colors = existsSync(path.join(dir, "product-colors.json")) ? read("product-colors.json") : [];
  for (const p of products) p.color = colors.find((c) => c.id === p.id)?.color;
  const catalog = JSON.parse(readFileSync("prisma/.cache/source-products.json", "utf8"));
  const oldWeb = JSON.parse(readFileSync("prisma/.cache/image-search.json", "utf8"));
  const results = existsSync(path.join(dir, "candidates.json")) ? read("candidates.json") : {};
  const only = process.argv.find((x) => x.startsWith("--ids="))?.slice(6).split(",").map(Number);
  const todo = products.filter((p) => (only ?? flags).includes(p.id) && (!results[p.id] || process.argv.includes("--refresh")));
  let count = 0;
  const worker = async () => {
    while (todo.length) {
      const p = todo.shift();
      const brandAt = p.name.toLowerCase().indexOf(p.brand.name.toLowerCase());
      const model = brandAt >= 0 ? p.name.slice(brandAt) : p.name;
      const query = (custom[p.id] ?? `${model} ${types[p.category.slug] ?? ""}`) + (process.argv.includes("--color") ? ` ${colorWords(p.color ?? "").join(" ")}` : "");
      const candidates = [], errors = [];
      try {
        for (const r of await search(query)) if (r.image?.startsWith("https://")) candidates.push({ url: r.image, title: r.title, page: r.url, width: r.width, height: r.height, origin: "fresh-search" });
      } catch (e) { errors.push(e.message); }
      for (const r of oldWeb[p.id]?.urls ?? []) candidates.push({ url: r.image, title: r.title, page: r.page, width: r.width, height: r.height, origin: "cached-search" });
      for (const c of catalog) {
        if (isAccessory(c.title) && !["phu-kien-cong-thai-hoc", "lot-chuot"].includes(p.category.slug)) continue;
        for (const url of c.srcs.slice(0, 4)) candidates.push({ url, title: c.title, page: `https://${c.store}`, origin: "catalog" });
      }
      const seen = new Set();
      const ranked = candidates.map((c) => ({ ...c, score: score(c, query, p) })).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).filter((c) => { if (seen.has(c.url)) return false; seen.add(c.url); return true; }).slice(0, 18);
      results[p.id] = { id: p.id, name: p.name, query, errors, candidates: ranked };
      save("candidates.json", results);
      console.log(`${++count} #${p.id} ${query}: ${ranked.length} ${errors.join(", ")}`);
      await new Promise((r) => setTimeout(r, 350));
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}
