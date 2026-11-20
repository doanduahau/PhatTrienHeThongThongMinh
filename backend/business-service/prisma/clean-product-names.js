/**
 * Cắt các từ thuộc tính thừa khỏi products.name khi chính dòng sản phẩm đó đã có
 * cột chứa cùng giá trị (mice.connectivity, keyboards.layout, mousepads.size,
 * products.color...). Một token chỉ bị xoá khi cột của đúng sản phẩm đó nói lên
 * nó — không xoá theo mẫu tên.
 *
 * Màu: products.color đã được UI hiển thị bằng chấm màu (ColorDot) nên tên chỉ
 * cần giữ tên riêng của sản phẩm. Chỉ cắt từ màu khi nhóm màu của nó khớp với
 * giá trị products.color, hoặc từ đó xuất hiện nguyên văn trong products.color.
 *
 *   node prisma/clean-product-names.js            # dry-run, không sửa DB
 *   node prisma/clean-product-names.js --apply    # backup + ghi DB
 *   node prisma/rollback-names.js                 # khôi phục từ backup
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";

const BACKUP = path.resolve("prisma/product-name-backup.json");
const CACHE = path.resolve("prisma/.cache/name-cleanup-plan.json");

// Danh mục mà từ "wireless/2.4g/..." mô tả đúng thuộc tính kết nối của sản phẩm.
const GEAR_CATEGORIES = new Set(["chuot", "ban-phim", "tai-nghe", "soundcard"]);
const POLLING_CATEGORIES = new Set(["chuot", "ban-phim"]);

// Giá trị connectivity -> những cách viết cùng nghĩa trong tên.
const CONNECTIVITY_WORDS = {
  wireless: ["wireless", "lightspeed", "speedlight", "2.4g", "2.4 ghz", "không dây"],
  tri_mode: ["wireless", "lightspeed", "tri-mode", "tri mode", "3 mode", "3 chế độ", "2.4g", "không dây"],
  "wireless_2.4g": ["wireless", "lightspeed", "2.4g", "2.4 ghz", "không dây"],
  "wireless_2_4g": ["wireless", "lightspeed", "2.4g", "2.4 ghz", "không dây"],
  wired: ["wired", "corded", "có dây"],
  bluetooth: ["bluetooth"],
};

// RegExp có cờ g giữ lastIndex giữa các lần test() nên mọi lần dùng phải tạo mới.
const POLLING_WORDS = [
  ["\\b1000\\s?hz\\b", 1000],
  ["\\b2000\\s?hz\\b", 2000],
  ["\\b4000\\s?hz\\b", 4000],
  ["\\b8000\\s?hz\\b", 8000],
  ["\\b1k\\b", 1000],
  ["\\b2k\\b", 2000],
  ["\\b4k\\b", 4000],
  ["\\b8k\\b", 8000],
];

// Giá trị keyboards.layout -> cách viết trong tên (so khớp tuyệt đối).
const LAYOUT_WORDS = {
  TKL: ["\\btkl\\b"],
  Fullsize: ["\\bfull[\\s-]?size\\b"],
  "60%": ["\\b60\\s?%"],
  "65%": ["\\b65\\s?%"],
  "75%": ["\\b75\\s?%"],
};

// Giá trị mousepads.size -> cách viết trong tên.
const PAD_SIZE_WORDS = {
  XL: ["\\bxxl\\b", "\\bxl\\b"],
  L: ["\\blarge\\b"],
  M: ["\\bmedium\\b"],
};

// Giá trị mousepads.surface -> cách viết trong tên.
const PAD_SURFACE_WORDS = {
  cloth: ["\\bcloth\\b", "\\bfabric\\b"],
  glass: ["\\bglass\\b"],
  hybrid: ["\\bhybrid\\b"],
};

// Từ chỉ màu -> nhóm màu. "xanh" tiếng Việt vừa xanh lá vừa xanh dương nên thuộc cả hai nhóm.
const COLOR_TERM_FAMILIES = new Map();
const registerColors = (families, terms) => {
  for (const term of terms) COLOR_TERM_FAMILIES.set(term, families);
};
registerColors(["black"], ["black", "đen", "onyx", "obsidian", "basalt", "charcoal", "graphite", "carbon", "ash", "blackout", "midnight", "eclipse"]);
registerColors(["white"], ["white", "trắng", "polar", "snow", "mercury", "moonlight", "ionic", "shell", "frost", "ghost", "pearl", "ivory"]);
registerColors(["gray"], ["gray", "grey", "xám", "ghi", "gunmetal", "titanium", "titan", "slate", "cement", "space", "cool", "pale"]);
registerColors(["red"], ["red", "đỏ", "ruby", "crimson", "scarlet", "rouge"]);
registerColors(["orange"], ["orange", "cam", "sunset"]);
registerColors(["yellow"], ["yellow", "vàng", "gold", "golden"]);
registerColors(["blue", "green"], ["xanh"]);
registerColors(["green"], ["green", "mint", "matcha", "olive", "forest"]);
registerColors(["blue"], ["blue", "dương", "navy", "cobalt", "azure"]);
registerColors(["cyan"], ["cyan", "teal", "turquoise"]);
registerColors(["pink"], ["pink", "hồng", "magenta", "rose", "quartz"]);
registerColors(["purple"], ["purple", "tím", "lavender", "violet"]);
registerColors(["brown"], ["brown", "nâu", "walnut", "oak", "wood"]);
registerColors(["beige"], ["beige", "kem", "cream", "sand"]);
registerColors(["silver"], ["silver", "bạc", "anodized", "polished", "chrome", "platinum"]);
registerColors(["transparent", "blue", "white", "black"], ["transparent", "clear", "crystal"]);
registerColors(["transparent"], ["trong"]);
registerColors(["black", "white", "gray"], ["matte"]);

const COLORWAY_CONNECTORS = new Set(["on", "in", "and", "&", "và"]);
// Chất liệu, không phải màu — đừng xoá dù nó nằm trong products.color.
const NON_COLOR_TOKENS = new Set(["plastic", "aluminum", "aluminium", "metal", "steel", "glass", "mesh", "leather", "fabric"]);
// "Red Switch"/"Silent Red" là tên switch, không phải màu của sản phẩm.
const SWITCH_AFTER = /^[\s,]*(switch|switches|linear|tactile|clicky|optical|magnetic|hot-?swap)\b/i;
const SWITCH_BEFORE = /(?:silent|holy|panda)[\s-]*$/i;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Nhóm màu + từ vựng được phép cắt cho một giá trị products.color. */
function colorPlan(color) {
  const words = String(color ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const literal = new Set(words.filter((word) => !NON_COLOR_TOKENS.has(word)));
  const families = new Set();
  for (const word of literal) for (const family of COLOR_TERM_FAMILIES.get(word) ?? []) families.add(family);

  const allowed = new Set(literal);
  for (const [term, termFamilies] of COLOR_TERM_FAMILIES) {
    if (termFamilies.some((family) => families.has(family))) allowed.add(term);
  }

  const matches = (word) =>
    literal.has(word) || Boolean(COLOR_TERM_FAMILIES.get(word)?.some((family) => families.has(family)));

  return { allowed, matches };
}

/** Bỏ màu khỏi tên: cụm colorway trước ("Blue on White"), rồi từ màu đơn lẻ. */
function stripColor(name, color) {
  const plan = colorPlan(color);
  if (!plan.allowed.size) return { name, removed: [] };
  const removed = [];

  // "Blue on White", "Black & Pink": bỏ cả cụm để không còn "on"/"&" treo lại.
  const connector = /(?<!\S)([\p{L}]+(?:\s+(?:on|in|and|&|và)\s+[\p{L}]+)+)(?!\S)/giu;
  let out = name.replace(connector, (phrase) => {
    const words = phrase.toLowerCase().split(/\s+/).filter((word) => word && !COLORWAY_CONNECTORS.has(word));
    if (words.length < 2) return phrase;
    if (!words.every((word) => COLOR_TERM_FAMILIES.has(word))) return phrase;
    if (!words.some((word) => plan.matches(word))) return phrase;
    removed.push(`colorway:${words.join(" ")}`);
    return " ";
  });

  const source = [...plan.allowed]
    .sort((a, b) => b.length - a.length)
    .map((term) => escapeRegExp(term).replace(/\s+/g, "\\s+"))
    .join("|");
  // (?<!\S)/(?!\S) chỉ khớp từ đứng riêng: bảo vệ "BlackWidow", "Zero:RED", "G-SR-SE".
  const word = new RegExp(`(?<!\\S)(${source})(\\s+edition)?(?!\\S)`, "giu");
  out = out.replace(word, (match, term, edition, offset, whole) => {
    if (SWITCH_AFTER.test(whole.slice(offset + match.length))) return match;
    if (SWITCH_BEFORE.test(whole.slice(0, offset))) return match;
    removed.push(`color:${term.toLowerCase()}${edition ? "+edition" : ""}`);
    return " ";
  });

  return { name: out, removed };
}

const collapse = (value) =>
  value
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,;:])/g, "$1")
    .replace(/^[\s,;/-]+|[\s,;/-]+$/g, "")
    .trim();

// Tiền từ chỉ LOẠI sản phẩm ("Bàn phím cơ ..."). Trang đã có danh mục + breadcrumb nên nó thừa.
// Mỗi danh mục chỉ nhận tiền từ của chính nó để không cắt nhầm tên sản phẩm khác loại.
// Không dùng \b: trong JS \b chỉ tính ký tự ASCII nên nó không bao giờ khớp sau "đỡ", "Ghế", "kiện".
const END = "(?=\\s|$)";
const TYPE_PREFIX_BY_SLUG = {
  "ban-phim": new RegExp(`^Bàn phím${END}`),
  "phu-kien-cong-thai-hoc": new RegExp(`^(?:Kê tay|Kê chân|Đệm|Gối|Giá đỡ|Chân đế|Phụ kiện|Nắp)${END}`),
  "lot-chuot": new RegExp(`^Lót chuột${END}`),
  chuot: new RegExp(`^Chuột${END}`),
  "tai-nghe": new RegExp(`^Tai nghe${END}`),
  ghe: new RegExp(`^Ghế${END}`),
  ban: new RegExp(`^Bàn(?: làm việc)?${END}`),
  "arm-man-hinh": new RegExp(`^Arm${END}`),
};

/** Bỏ tiền từ loại + chuỗi mô tả chữ thường đi ngay sau nó, dừng ở token viết hoa/số đầu tiên (tên model). */
function stripTypePrefix(name, slug) {
  const pattern = TYPE_PREFIX_BY_SLUG[slug];
  if (!pattern || !pattern.test(name)) return { name, prefix: null };
  const matched = name.match(pattern)[0];
  const tokens = name.slice(matched.length).split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && !/^[A-Z0-9]/.test(tokens[i])) i += 1;
  const rest = tokens.slice(i).join(" ");
  // Rỗng hoặc bắt đầu bằng chữ thường = phần còn lại không phải tên riêng, thà giữ nguyên.
  if (!rest || /^[a-z]/.test(rest)) return { name, prefix: null };
  return { name: rest, prefix: matched };
}

/**
 * Các phương án tên mới, ưu tiên mạnh nhất trước: [cắt tiền từ + cắt thuộc tính, chỉ cắt tiền từ].
 * main() chọn phương án đầu tiên không gây trùng tên — "Apex Pro TKL Wireless" và
 * "Apex Pro Fullsize" cùng rút về "Apex Pro" nên phải giữ lại phần phân biệt chúng.
 */
function cleanName(row) {
  const prefixed = stripTypePrefix(row.name, row.slug);
  const prefixLabel = prefixed.prefix ? `tiền từ: "${prefixed.prefix}"` : null;

  const cutAttributes = (start, removed, stripAttributes = true) => {
    let out = start;
    // Lookaround tự áp cho mọi token: "4K/8K" là một cụm polling kép, cắt "4K" sẽ ra "/8K".
    const cut = (source, label, flags = "gi") => {
      const pattern = new RegExp(`(?<![\\w/])(?:${source})(?![\\w/%])`, flags);
      if (!pattern.test(out)) return;
      out = out.replace(new RegExp(pattern.source, flags), " ");
      removed.push(`${source}=${label}`);
    };

    if (stripAttributes) {
      if (GEAR_CATEGORIES.has(row.slug)) {
        for (const token of CONNECTIVITY_WORDS[row.conn] ?? []) {
          cut(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), row.conn);
        }
      }

      if (POLLING_CATEGORIES.has(row.slug) && row.polling) {
        for (const [source, hz] of POLLING_WORDS) if (hz === row.polling) cut(source, `${hz}Hz`);
      }

      if (row.slug === "ban-phim") {
        for (const source of LAYOUT_WORDS[row.layout] ?? []) cut(source, row.layout);
        if (row.rapid) cut("\\s*\\brapid[\\s-]?trigger\\b", "rapid-trigger=true");
        if (row.hotswap) cut("\\s*\\bhot[\\s-]?(swap ready|swap|swappable)\\b", "hotswap=true");
      }

      // "Ergonomic" chỉ là thuộc tính ở chuột; ở ghế nó là kind-of sản phẩm.
      if (row.slug === "chuot" && row.hand === "ergonomic") cut("\\s*\\bergonomic\\b", "hand=ergonomic");

      if (row.slug === "lot-chuot") {
        for (const source of PAD_SIZE_WORDS[row.padSize] ?? []) cut(source, `size=${row.padSize}`);
        for (const source of PAD_SURFACE_WORDS[row.padSurface] ?? []) cut(source, `surface=${row.padSurface}`);
      }

      // Ghế: "Ergonomic Chair" là tên loại. Cắt cả cụm, cắt rời "Chair" sẽ để tính từ treo
      // ("Steelcase Gesture Ergonomic"). Bàn/arm/phụ kiện thì từ loại nằm trong tên model nên giữ.
      if (row.slug === "ghe") {
        cut("\\s*\\bergonomic\\s+chair\\b", "loai:ghe");
        cut("\\s*\\bchair\\b", "loai:ghe");
      }
    }

    // Màu đã có cột products.color + chấm màu trên UI -> tên chỉ giữ tên riêng.
    if (row.color) {
      const colored = stripColor(out, row.color);
      out = colored.name;
      removed.push(...colored.removed);
    }

    return collapse(out);
  };

  const fullRemoved = [];
  const fullName = cutAttributes(prefixed.name, fullRemoved, true);
  const colorRemoved = [];
  const colorName = cutAttributes(prefixed.name, colorRemoved, false);
  const candidates = [];
  if (prefixLabel) fullRemoved.unshift(prefixLabel);
  if (prefixLabel) colorRemoved.unshift(prefixLabel);
  if (fullRemoved.length && fullName) candidates.push({ name: fullName, removed: fullRemoved });
  // Nếu bản cắt đầy đủ đụng tên SKU khác thì chỉ cắt màu, giữ lại từ phân biệt
  // (Wireless/TKL/Fullsize...) để hai SKU không bị gộp làm một.
  if (colorRemoved.length && colorName && colorName !== fullName) {
    candidates.push({ name: colorName, removed: colorRemoved });
  }
  if (prefixLabel) candidates.push({ name: collapse(prefixed.name), removed: [prefixLabel] });
  return candidates;
}

async function loadRows() {
  const rows = await prisma.$queryRaw`
    SELECT p.id,
           p.name,
           p.color,
           c.slug,
           COALESCE(m.connectivity, k.connectivity, h.connectivity) AS conn,
           m.hand_orientation AS hand,
           COALESCE(m.polling_rate_hz, k.polling_rate_hz) AS polling,
           k.layout,
           k.has_hotswap      AS hotswap,
           k.has_rapid_trigger AS rapid,
           mp.size            AS "padSize",
           mp.surface         AS "padSurface"
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN mice m ON m.product_id = p.id
      LEFT JOIN keyboards k ON k.product_id = p.id
      LEFT JOIN headphones h ON h.product_id = p.id
      LEFT JOIN mousepads mp ON mp.product_id = p.id
     ORDER BY p.id`;
  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    polling: row.polling === null ? null : Number(row.polling),
  }));
}

const main = async () => {
  const apply = process.argv.includes("--apply");
  const rows = await loadRows();
  const picks = rows.map((row) => {
    const cands = cleanName(row);
    return { row, cands, best: cands[0] ?? null };
  });

  const norm = (value) => value.toLowerCase().trim();
  // Sản phẩm cùng tên nhưng khác màu là 2 SKU hợp lệ (G304 Đen / G304 Trắng), nên
  // khoá chống trùng gồm cả màu. Cùng tên + cùng màu mới là trùng thật.
  const keyOf = (p) => `${norm(p.best ? p.best.name : p.row.name)}|${norm(p.row.color ?? "")}`;
  // Ngoặc lẻ hoặc dấu câu/giới từ treo lại là cắt hỏng tên — thà giữ tên cũ.
  const mangled = (name) =>
    (name.match(/\(/g) ?? []).length !== (name.match(/\)/g) ?? []).length ||
    /[(),;:/&-]$/.test(name) ||
    /\b(on|in|with|and|và|of)$/i.test(name);

  // Chốt chặn trùng tên: "Rival 3" bản dây và "Rival 3 Wireless" là hai SKU thật.
  // Mỗi lượt đếm lại, phương án đụng độ tụt về phương án nhẹ hơn, hết phương án thì giữ nguyên.
  for (let pass = 0; pass < 8; pass += 1) {
    const used = new Map();
    for (const p of picks) {
      const key = keyOf(p);
      used.set(key, (used.get(key) ?? 0) + 1);
    }
    const clashing = picks.filter(
      (p) => p.best && ((used.get(keyOf(p)) ?? 0) > 1 || mangled(p.best.name)),
    );
    if (!clashing.length) break;
    let moved = false;
    for (const p of clashing) {
      const next = p.cands[p.cands.indexOf(p.best) + 1] ?? null;
      if (!next) continue;
      p.best = next;
      moved = true;
    }
    // Không còn phương án nhẹ hơn cho nhóm đang đụng nhau -> giữ tên cũ cho nhóm đó.
    if (!moved) {
      for (const p of clashing) {
        // Trùng với một dòng vốn đã sạch tên + cùng màu (bản ghi sản phẩm trùng nhau)
        // thì cứ bỏ màu; chỉ chặn khi từ bị cắt là thuộc tính phân biệt SKU.
        const onlyColor = p.best.removed.every(
          (label) => label.startsWith("color:") || label.startsWith("colorway:"),
        );
        const key = keyOf(p);
        const same = picks.filter((other) => other !== p && keyOf(other) === key);
        if (!onlyColor || same.some((other) => other.best)) p.best = null;
      }
      break;
    }
  }

  const changes = picks.filter((p) => p.best && p.best.name !== p.row.name);
  const blocked = picks.filter((p) => p.cands.length && !p.best);
  const noPrefix = picks.filter((p) => TYPE_PREFIX_BY_SLUG[p.row.slug] && !p.cands.length);

  console.log(`${rows.length} sản phẩm -> sửa tên ${changes.length}, giữ nguyên ${blocked.length} vì trùng tên.`);
  const perCategory = {};
  for (const c of changes) perCategory[c.row.slug] = (perCategory[c.row.slug] ?? 0) + 1;
  console.log("Theo danh mục:", JSON.stringify(perCategory));

  for (const c of changes.slice(0, 25)) {
    console.log(`#${c.row.id}\n  cũ: ${c.row.name}\n  mới: ${c.best.name}   [${c.best.removed.join(", ")}]`);
  }
  if (blocked.length) {
    console.log("\nGiữ nguyên (mọi phương án cắt đều trùng tên):");
    for (const b of blocked) console.log(`#${b.row.id}  ${b.row.name}`);
  }
  if (process.argv.includes("--debug") && noPrefix.length) {
    console.log("\nKhong match tien tu loai nao:");
    for (const p of noPrefix) console.log(`#${p.row.id}  [${p.row.slug}]  ${p.row.name}`);
  }

  mkdirSync(path.dirname(CACHE), { recursive: true });
  writeFileSync(
    CACHE,
    JSON.stringify(
      changes.map((c) => ({
        id: c.row.id,
        old: c.row.name,
        name: c.best.name,
        removed: c.best.removed,
      })),
      null,
      2,
    ),
  );
  console.log(`\nKế hoạch: ${path.relative(process.cwd(), CACHE)} (${changes.length} dòng)`);

  if (!apply) {
    console.log("(không sửa DB — thêm --apply để ghi)");
    return;
  }

  // Backup gộp theo id và chỉ ghi tên gốc lần đầu — chạy thêm đợt khác vẫn rollback về tên thô cũ được.
  const backup = existsSync(BACKUP) ? JSON.parse(readFileSync(BACKUP, "utf8")) : {};
  const asMap = Array.isArray(backup)
    ? Object.fromEntries(backup.map((row) => [String(row.id), row.name]))
    : backup;
  let added = 0;
  for (const c of changes) {
    if (asMap[String(c.row.id)]) continue;
    asMap[String(c.row.id)] = c.row.name;
    added += 1;
  }
  writeFileSync(BACKUP, JSON.stringify(asMap, null, 2));
  console.log(`Backup ${Object.keys(asMap).length} tên gốc (+${added} mới) vào ${path.relative(process.cwd(), BACKUP)}`);

  const params = changes.flatMap((c) => [c.row.id, c.best.name]);
  const values = changes.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::text)`).join(", ");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE products p SET name = src.name
       FROM (VALUES ${values}) AS src(id, name)
      WHERE p.id = src.id`,
    ...params,
  );

  const dupes = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM (
      SELECT name FROM products GROUP BY name HAVING COUNT(*) > 1
    ) d`;
  console.log(`Đã ghi ${updated}/${changes.length} tên. Trùng tên toàn catalog: ${JSON.stringify(dupes[0])}`);
  if (updated !== changes.length) throw new Error(`Chỉ ghi được ${updated}/${changes.length} tên — dừng để kiểm tra.`);
};

main()
  .catch((error) => {
    console.error("THẤT BẠI:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
