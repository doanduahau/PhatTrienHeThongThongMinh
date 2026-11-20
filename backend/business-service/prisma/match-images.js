/**
 * Ghép ảnh thật cho products.image_url từ hai nguồn đã tải:
 *   - prisma/.cache/source-products.json  (catalog Shopify của hãng + phongcachxanh)
 *   - prisma/.cache/image-search.json     (ảnh DuckDuckGo đã kiểm tra hotlink)
 *
 *   node prisma/match-images.js            # báo cáo + image-report.csv, không sửa DB
 *   node prisma/match-images.js --apply    # backup + ghi image_url vào DB
 *
 * Thứ tự ưu tiên:
 *   catalog        ảnh từ store đúng hãng, tên khớp gần như hoàn toàn
 *   web            ảnh chính thức/reseller đúng model tìm qua DuckDuckGo
 *   catalog-similar cùng hãng cùng loại nhưng khác model (chỉ khi không có gì khác)
 *   placeholder    picsum theo seed riêng (không bao giờ trùng)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";
import { normalize, classify, isAccessory } from "./image-catalog.js";

const CACHE = path.resolve("prisma/.cache/source-products.json");
const WEB = path.resolve("prisma/.cache/image-search.json");
const OUT_DIR = path.resolve("prisma/.cache");
const REPORT = path.join(OUT_DIR, "image-match.json");
const CSV = path.join(OUT_DIR, "image-report.csv");
const BACKUP = path.resolve("prisma/image-url-backup.json");

const CAT_TYPE = {
  chuot: "mouse",
  "ban-phim": "keyboard",
  "lot-chuot": "mousepad",
  "tai-nghe": "headset",
  ghe: "chair",
  "arm-man-hinh": "monitor_arm",
  soundcard: "soundcard",
  ban: "desk",
  "phu-kien-cong-thai-hoc": "other",
};

const NOISE = new Set([
  "va", "voi", "cho", "cua", "la", "co", "khong", "day", "dai", "ngan", "the", "nay",
  "doi", "don", "nhieu", "lam", "ban", "phim", "chuot", "lot", "tai", "nghe", "ghe",
  "so", "do", "tu", "ky", "nhan", "chin", "hang", "loai", "kieu", "them", "vang",
  "edition", "version", "gen", "series", "new", "hot", "wireless", "wired", "bluetooth",
  "rgb", "gaming", "office", "white", "black", "blue", "red", "green", "pink", "gray",
  "grey", "silver", "gold", "sieu", "nhe", "tinh", "minh", "trong", "size", "with",
  "and", "for", "type", "model", "set", "pack", "combo", "box", "mau", "den", "trang",
]);

const tokens = (value) => normalize(value).split(" ").filter((t) => t && !NOISE.has(t));
const unique = (list) => [...new Set(list)];

const BRAND_ALIAS = {
  zowie: ["benq", "zowie"],
  "epos sennheiser": ["epos", "sennheiser"],
  "cherry xtrfy": ["xtrfy", "cherry"],
  asus: ["asus", "rog"],
};

const loadIndex = () => {
  if (!existsSync(CACHE)) {
    console.error("Chưa có cache catalog — chạy `node prisma/image-catalog.js` trước.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(CACHE, "utf8"))
    .filter((row) => row.srcs?.length)
    .map((row) => ({
      ...row,
      head: String(row.title).split(/[–—|]/)[0].trim(),
      headTokenSet: new Set(tokens(String(row.title).split(/[–—|]/)[0])),
      vendorTokenSet: new Set(normalize(row.vendor).split(" ").filter(Boolean)),
      type: classify(row.title),
      accessory: isAccessory(row.title),
    }));
};

const catalogScore = (entry, our) => {
  if (!our.length || entry.headTokenSet.size === 0) return { s: 0, r: 0, p: 0 };
  const hit = our.filter((t) => entry.headTokenSet.has(t)).length;
  const r = hit / our.length;
  const p = hit / entry.headTokenSet.size;
  const modelOk = our.filter((t) => /\d/.test(t)).every((t) => entry.headTokenSet.has(t));
  if (!modelOk) return { s: 0, r, p };
  return { s: 0.62 * r + 0.38 * p - (entry.accessory ? 0.5 : 0), r, p };
};

const csv = (row) =>
  [row.id, row.slug, row.brand, row.name, row.tier, row.src, row.title]
    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
    .join(",");

const main = async () => {
  const apply = process.argv.includes("--apply");
  const similarOff = process.argv.includes("--no-similar");

  const index = loadIndex();
  const web = existsSync(WEB) ? JSON.parse(readFileSync(WEB, "utf8")) : {};
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true, brand: { select: { name: true } }, category: { select: { slug: true } } },
    orderBy: { id: "asc" },
  });
  console.log(
    `catalog ${index.length} sp | web ${Object.keys(web).length} sp có kết quả tìm | cần ghép ${products.length}`,
  );

  const ranked = products.map((p) => {
    const brandSet = new Set(tokens(p.brand?.name ?? ""));
    const allowedBrand = new Set(BRAND_ALIAS[normalize(p.brand?.name ?? "")] ?? [...brandSet]);
    const our = unique(tokens(p.name).filter((t) => !brandSet.has(t)));
    const want = CAT_TYPE[p.category?.slug] ?? "other";
    const pool = index
      .filter((e) => !e.accessory && [...allowedBrand].some((t) => e.vendorTokenSet.has(t) || e.headTokenSet.has(t)))
      .filter((e) => want === "other" || e.type === "other" || e.type === want)
      .map((e) => ({ e, ...catalogScore(e, our) }))
      .sort((a, b) => b.s - a.s);
    return {
      ...p,
      slug: p.category?.slug,
      brand: p.brand?.name ?? "",
      exact: pool.filter((x) => x.s >= 0.7 && x.r >= 0.75).slice(0, 6),
      similar: pool.filter((x) => x.s >= 0.42).slice(0, 6),
      web: (web[p.id]?.urls ?? []),
    };
  });

  const used = new Set();
  const tier = new Map();

  const takeCatalog = (row, list) => {
    for (const cand of list) {
      const src = cand.e.srcs.find((s) => !used.has(s));
      if (src) return { src, title: cand.e.title, store: cand.e.store, s: cand.s };
    }
    return null;
  };
  const fromWeb = (row) => {
    const hit = row.web.find((u) => !used.has(u.image));
    return hit ? { src: hit.image, title: hit.title, store: new URL(hit.image).hostname, s: hit.s } : null;
  };

  const order = (listFn) => [...ranked].sort((a, b) => (listFn(b)[0]?.s ?? 0) - (listFn(a)[0]?.s ?? 0));

  // Điểm cao nhất trước để sản phẩm khớp chắc không bị lấy mất ảnh.
  const catalogExactRows = order((r) => r.exact);
  let n = 0;
  for (const row of catalogExactRows) {
    if (tier.has(row.id)) continue;
    const found = takeCatalog(row, row.exact);
    if (found && !used.has(found.src)) { used.add(found.src); tier.set(row.id, { ...found, tier: "catalog" }); n += 1; }
  }
  const webRows = [...ranked].sort((a, b) => (b.web[0]?.s ?? 0) - (a.web[0]?.s ?? 0));
  let w = 0;
  for (const row of webRows) {
    if (tier.has(row.id)) continue;
    const found = fromWeb(row);
    if (found) { used.add(found.src); tier.set(row.id, { ...found, tier: "web" }); w += 1; }
  }
  let sim = 0;
  if (!similarOff) {
    for (const row of order((r) => r.similar)) {
      if (tier.has(row.id)) continue;
      const found = takeCatalog(row, row.similar);
      if (found && !used.has(found.src)) { used.add(found.src); tier.set(row.id, { ...found, tier: "catalog-similar" }); sim += 1; }
    }
  }
  let ph = 0;
  for (const row of ranked) {
    if (tier.has(row.id)) continue;
    ph += 1;
    tier.set(row.id, {
      src: `https://picsum.photos/seed/gear-${row.slug}-${row.id}/600/400`,
      title: "(picsum placeholder)",
      store: "picsum.photos",
      tier: "placeholder",
    });
  }

  const rows = ranked.map((r) => ({ id: r.id, slug: r.slug, brand: r.brand, name: r.name, old: r.imageUrl, ...tier.get(r.id) }));
  const by = (name) => rows.filter((r) => r.tier === name);
  const perCat = (list) => list.reduce((acc, r) => ({ ...acc, [r.slug]: (acc[r.slug] ?? 0) + 1 }), {});
  console.log(`\ncatalog đúng model : ${by("catalog").length}  ${JSON.stringify(perCat(by("catalog")))}`);
  console.log(`web đúng model     : ${by("web").length}  ${JSON.stringify(perCat(by("web")))}`);
  console.log(`catalog similar    : ${by("catalog-similar").length}  ${JSON.stringify(perCat(by("catalog-similar")))}`);
  console.log(`placeholder        : ${by("placeholder").length}  ${JSON.stringify(perCat(by("placeholder")))}`);
  console.log(`URL distinct       : ${new Set(rows.map((r) => r.src)).size}/${rows.length}`);
  const hosts = rows.reduce((acc, r) => ({ ...acc, [r.store]: (acc[r.store] ?? 0) + 1 }), {});
  console.log(`\nnguồn ảnh: ${Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([h, c]) => `${h}:${c}`).join(" ")}`);

  const show = (label, list, n2 = 12) => {
    console.log(`\n${label}`);
    for (const c of [...list].sort((a, b) => (a.s ?? 9) - (b.s ?? 9)).slice(0, n2)) {
      console.log(`  #${c.id} [${c.slug}] ${c.brand} ${c.name}\n      -> [${c.store}] ${String(c.title).slice(0, 92)}`);
    }
  };
  show("catalog đúng model (điểm thấp nhất):", by("catalog"));
  show("web (12 mẫu):", by("web"));
  show("catalog-similar — CẦN NGƯỜI KIỂM TRA:", by("catalog-similar"), 10);
  show("placeholder:", by("placeholder"), 10);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT, JSON.stringify({ rows }, null, 1));
  writeFileSync(CSV, ["id,danh_muc,hang,ten,tang,nguon,url,anh_goc", ...rows.map(csv)].join("\n"));
  console.log(`\nBáo cáo: ${REPORT}\nReview:  ${CSV}`);

  if (!apply) {
    console.log("\n(không sửa DB — thêm --apply để ghi)");
    return;
  }

  // Backup lần đầu là ảnh Unsplash gốc; các lần --apply sau không được ghi đè.
  const target = existsSync(BACKUP) ? path.join(OUT_DIR, "image-url-previous.json") : BACKUP;
  writeFileSync(target, JSON.stringify(products.map((p) => ({ id: p.id, imageUrl: p.imageUrl })), null, 0));
  console.log(`Backup ${products.length} image_url cũ -> ${target}`);

  const params = rows.flatMap((r) => [Number(r.id), r.src]);
  const values = rows.map((_, i) => `($${i * 2 + 1}::bigint, $${i * 2 + 2}::text)`).join(", ");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE products p SET image_url = src.image_url
        FROM (VALUES ${values}) AS src(id, image_url)
      WHERE p.id = src.id`,
    ...params,
  );
  console.log(`Đã ghi ${updated} dòng image_url.`);

  const check = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS products, COUNT(DISTINCT image_url)::int AS distinct_urls,
            COUNT(*) FILTER (WHERE image_url IS NULL OR btrim(image_url) = '')::int AS empty,
            COUNT(*) FILTER (WHERE image_url LIKE '%picsum%')::int AS placeholder,
            COUNT(*) FILTER (WHERE image_url LIKE '%unsplash%')::int AS unsplash
       FROM products`,
  );
  console.log("SAU KHI GHI:", JSON.stringify(check[0]));
};

main()
  .catch((e) => { console.error("MATCH THẤT BẠI:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
