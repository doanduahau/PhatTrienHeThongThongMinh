import { prisma } from "../src/clients/prisma.client.js";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const requireFrontend = createRequire(path.resolve("../../frontend/package.json"));
const sharp = requireFrontend("sharp");
const dir = path.resolve("prisma/.cache/image-repair");
mkdirSync(dir, { recursive: true });
const json = (name) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
const save = (name, value) => writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
const inspect = async (id, url, prefix = "current") => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(18000), headers: { "user-agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    await sharp(bytes).rotate().resize(230, 145, { fit: "contain", background: "white" }).flatten({ background: "white" }).jpeg({ quality: 88 }).toFile(path.join(dir, `${prefix}-${id}.jpg`));
    return { id, url, width: meta.width, height: meta.height, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) { return { id, url, error: error.message }; }
};
async function parallel(items, fn, concurrency = 10) {
  const queue = [...items], results = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) { const item = queue.shift(); results.push(await fn(item)); if (results.length % 50 === 0) console.log(`Checked ${results.length}/${items.length}`); }
  }));
  return results.sort((a, b) => a.id - b.id);
}
async function sheets(products, results, prefix) {
  for (let start = 0; start < products.length; start += 40) {
    const batch = products.slice(start, start + 40), layers = [];
    for (let i = 0; i < batch.length; i++) {
      const p = batch[i], m = results.find((r) => r.id === p.id), x = (i % 5) * 250, y = Math.floor(i / 5) * 205;
      const file = path.join(dir, `${prefix}-${p.id}.jpg`);
      if (existsSync(file)) layers.push({ input: file, left: x + 10, top: y });
      const label = `<svg width="250" height="60"><rect width="250" height="60" fill="white"/><text x="7" y="14" font-size="13" font-family="Arial">#${p.id} ${escape(p.name.slice(0, 29))}</text><text x="7" y="30" font-size="12" font-family="Arial">${escape(p.name.slice(29, 63))}</text><text x="7" y="47" font-size="11" font-family="Arial" fill="${m?.error || Math.max(m?.width ?? 0, m?.height ?? 0) < 800 ? "red" : "#555"}">${escape(m?.error ?? `${m?.width} x ${m?.height}`)}</text></svg>`;
      layers.push({ input: Buffer.from(label), left: x, top: y + 145 });
    }
    await sharp({ create: { width: 1250, height: Math.ceil(batch.length / 5) * 205, channels: 3, background: "#ddd" } }).composite(layers).jpeg({ quality: 90 }).toFile(path.join(dir, `${prefix}-sheet-${Math.floor(start / 40) + 1}.jpg`));
  }
}
const main = async () => {
  const mode = process.argv[2];
  if (mode === "extras") {
    const plan = json("plan.json"), products = json("products.json");
    const upsert = (id, url, source, title) => {
      const p = products.find((p) => p.id === id);
      const row = { id, name: p.name, old: p.imageUrl, url, source, sourceTitle: title, reason: "Matched product model, layout and color; use native product image resolution." };
      const index = plan.findIndex((p) => p.id === id);
      if (index >= 0) plan[index] = row; else plan.push(row);
    };
    upsert(262, "https://hnau.imgix.net/media/catalog/product/9/2/920-012426-logitech-g-pro-x-tkl-gaming-keyboard-7.jpg?q=90", "https://www.harveynorman.com.au/logitech-g-pro-x-2-tkl-lightspeed-gaming-keyboard-magenta.html", "Logitech PRO X TKL Magenta, SKU 920-012426");
    const photo = plan.find((p) => p.id === 99);
    if (photo) { const u = new URL(photo.url); u.searchParams.set("q", "90"); photo.url = u.href; }
    save("plan.json", plan.sort((a, b) => a.id - b.id));
    const moftUrl = "https://www.moft.us/products/moft-z-5-in-1-sit-stand-desk.js";
    try {
      const response = await fetch(moftUrl, { signal: AbortSignal.timeout(15000) });
      const product = await response.json();
      save("moft-product.json", product);
      console.log("MOFT", JSON.stringify({ title: product.title, images: product.images?.slice(0, 6) }));
      for (let i = 0; i < 3; i++) if (product.images?.[i]) console.log("MOFT_IMAGE", JSON.stringify(await inspect(35700 + i, new URL(product.images[i], moftUrl).href, "extra")));
    } catch (error) { console.log("MOFT", error.message); }
    const url = "https://www.razer.com/gaming-keyboards/Razer-DeathStalker-V2-Pro-Tenkeyless/RZ03-04373500-R3M1";
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const html = (await response.text()).replace(/\\u002[Ff]/g, "/");
      const urls = [...new Set((html.match(/https?:[^\s<>"']+/g) ?? []).filter((u) => /1500x1000/.test(u) && /white/i.test(u)).map((u) => u.includes("https%3A") ? decodeURIComponent(u.slice(u.indexOf("https%3A"))) : u))];
      save("deathstalker-white-gallery.json", { url, images: urls });
      console.log("DEATHSTALKER", JSON.stringify(urls.slice(0, 8)));
      for (let i = 0; i < 3; i++) if (urls[i]) console.log("RAZER_IMAGE", JSON.stringify(await inspect(24400 + i, urls[i], "extra")));
    } catch (error) { console.log("DEATHSTALKER", error.message); }
  } else if (mode === "manual") {
    const { addManualImages } = await import("./image-repair-manual.js");
    addManualImages();
  } else if (mode === "pages") {
    const pages = {
      razerViper: "https://www.razer.com/gaming-mice/razer-viper-v3-pro",
      razerCobra: "https://www.razer.com/gaming-mice/razer-cobra-pro",
      razerDeathadder: "https://www.razer.com/gaming-mice/razer-deathadder-v3-pro",
      razerBasilisk: "https://www.razer.com/gaming-mice/razer-basilisk-v3-pro",
      razerViperWhitePdp: "https://www.razer.com/p/RZ01-05120200-R3U1",
      razerCobraPdp: "https://www.razer.com/p/RZ01-04660100-R3U1",
      razerBasiliskPdp: "https://www.razer.com/p/RZ01-04620100-R3U1",
      castor: "https://kz-audio.com/kz-castor.html",
      vaxeeOutset: "https://www.vaxee.co/en/product.php?act=view&id=186",
    };
    for (const [key, url] of Object.entries(pages)) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0" } });
        const html = (await response.text()).replace(/\\u002[Ff]/g, "/").replace(/\\u0026/g, "&");
        writeFileSync(path.join(dir, `page-${key}.html`), html);
        const absolute = (html.match(/https?:[^\s<>"']+/g) ?? []);
        const relative = [...html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:png|jpg|webp)(?:\?[^"']*)?)["']/g)].map((m) => new URL(m[1], url).href);
        const urls = [...new Set([...absolute, ...relative].map((s) => s.replace(/&amp;/g, "&")).filter((s) => /\.(png|jpg|webp)(\?|$)/i.test(s)))];
        save(`page-${key}.json`, { url, status: response.status, images: urls });
        console.log(key, response.status, urls.length);
      } catch (error) { console.log(key, error.message); }
    }
  } else if (mode === "details") {
    const products = await prisma.product.findMany({ select: { id: true, color: true, name: true, keyboard: { select: { layout: true } }, mouse: { select: { connectivity: true } }, headphone: { select: { connectivity: true } } }, orderBy: { id: "asc" } });
    save("product-colors.json", products);
    console.log(products.map((p) => `${p.id} ${p.color} ${p.name}`).join("\n"));
  } else if (mode === "sources") {
    for (const host of ["hyperwork.vn", "epione.vn", "upgen.vn", "drapow.com"]) {
      try {
        const response = await fetch(`https://${host}/products.json?limit=250`, { signal: AbortSignal.timeout(20000) });
        const body = await response.json();
        save(`source-${host}.json`, body);
        console.log(host, (body.products ?? []).length);
      } catch (error) { console.log(host, error.message); }
    }
  } else if (mode === "search") {
    const { collectCandidates } = await import("./image-repair-search.js");
    await collectCandidates();
  } else if (mode === "select") {
    const selectionFile = process.argv.find((a) => a.startsWith("--selection="))?.slice(12) ?? "prisma/image-repair-reviewed.json";
    const selections = JSON.parse(readFileSync(selectionFile, "utf8"));
    const audited = json("candidate-audit.json"), products = json("products.json");
    const plan = existsSync(path.join(dir, "plan.json")) ? json("plan.json") : [];
    for (const [id, index] of Object.entries(selections)) {
      const choice = audited.find((p) => p.id === Number(id))?.choices[index];
      const product = products.find((p) => p.id === Number(id));
      if (!choice || !product) throw new Error(`Missing selection #${id}`);
      const row = { id: product.id, name: product.name, old: product.imageUrl, url: choice.url, source: choice.page || choice.url, sourceTitle: choice.title, reason: "Visually reviewed: actual product/model; replace incorrect variant, placeholder, packaging, diagram or low-quality image." };
      const previous = plan.findIndex((p) => p.id === product.id);
      if (previous >= 0) plan[previous] = row; else plan.push(row);
    }
    save("plan.json", plan.sort((a, b) => a.id - b.id));
    save(`reviewed-candidates-${Date.now()}.json`, audited);
    console.log(`Saved ${plan.length} reviewed replacements`);
  } else if (mode === "previews") {
    const only = process.argv.find((x) => x.startsWith("--ids="))?.slice(6).split(",").map(Number);
    const planIds = new Set(existsSync(path.join(dir, "plan.json")) ? json("plan.json").map((p) => p.id) : []);
    const candidates = Object.values(json("candidates.json")).filter((p) => only ? only.includes(p.id) : !planIds.has(p.id)).sort((a, b) => a.id - b.id);
    const previous = existsSync(path.join(dir, "candidate-audit.json")) ? json("candidate-audit.json") : [];
    const inspected = await parallel(candidates, async (p) => {
      const choices = [];
      for (let i = 0; i < p.candidates.length && choices.length < 3; i++) {
        const c = p.candidates[i], id = `u-${createHash("sha256").update(c.url).digest("hex").slice(0, 20)}`;
        const meta = previous.find((x) => x.id === p.id)?.choices.find((x) => x.url === c.url && x.imageId === id) ?? await inspect(id, c.url, "candidate");
        if (!meta.error && Math.max(meta.width, meta.height) >= 800) choices.push({ ...c, ...meta, imageId: id });
      }
      return { id: p.id, name: p.name, query: p.query, choices };
    });
    save("candidate-audit.json", inspected);
    const compact = [];
    for (const p of inspected) {
      const c = p.choices[0];
      if (c) await sharp(path.join(dir, `candidate-${c.imageId}.jpg`)).toFile(path.join(dir, `round2-${p.id}.jpg`));
      compact.push({ ...(c ?? { error: "NO IMAGE" }), id: p.id });
    }
    await sheets(inspected, compact, "round2");
    for (let start = 0; start < inspected.length; start += 10) {
      const batch = inspected.slice(start, start + 10), layers = [];
      for (let row = 0; row < batch.length; row++) {
        const p = batch[row], top = row * 215;
        layers.push({ input: Buffer.from(`<svg width="1200" height="25"><rect width="1200" height="25" fill="#eee"/><text x="8" y="18" font-family="Arial" font-size="15">#${p.id} ${escape(p.name)} ${p.choices.length ? "" : "NO IMAGE"}</text></svg>`), left: 0, top });
        for (let i = 0; i < p.choices.length; i++) {
          const c = p.choices[i], left = i * 400;
          layers.push({ input: path.join(dir, `candidate-${c.imageId}.jpg`), left: left + 80, top: top + 25 });
          layers.push({ input: Buffer.from(`<svg width="400" height="45"><text x="5" y="13" font-family="Arial" font-size="12">[${i}] ${escape(c.title.slice(0, 56))}</text><text x="5" y="28" font-family="Arial" font-size="11">${escape(c.title.slice(56, 103))}</text><text x="5" y="42" font-family="Arial" font-size="10">${c.width}x${c.height} ${escape(new URL(c.url).hostname)}</text></svg>`), left, top: top + 170 });
        }
      }
      await sharp({ create: { width: 1200, height: batch.length * 215, channels: 3, background: "white" } }).composite(layers).jpeg({ quality: 90 }).toFile(path.join(dir, `choices-${Math.floor(start / 10) + 1}.jpg`));
    }
    console.log(JSON.stringify({ products: inspected.length, missing: inspected.filter((p) => !p.choices.length).map((p) => ({ id: p.id, name: p.name })) }));
  } else if (mode === "audit") {
    const products = await prisma.product.findMany({ select: { id: true, name: true, imageUrl: true, brand: { select: { name: true } }, category: { select: { slug: true } } }, orderBy: { id: "asc" } });
    save(`snapshot-${Date.now()}.json`, products);
    save("products.json", products);
    const results = await parallel(products, (p) => inspect(p.id, p.imageUrl));
    save("current-audit.json", results);
    await sheets(products, results, "current");
    console.log(JSON.stringify({ total: products.length, broken: results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error })), small: results.filter((r) => !r.error && Math.max(r.width, r.height) < 800).map((r) => ({ id: r.id, width: r.width, height: r.height })) }));
  } else if (mode === "seal") {
    const plan = json("plan.json"), moft = json("moft-product.json"), razer = json("deathstalker-white-gallery.json");
    const desk = plan.find((p) => p.id === 357);
    desk.url = new URL(moft.variants.find((v) => v.title === "Black").featured_image.src, "https://www.moft.us").href;
    desk.source = "https://www.moft.us/products/moft-z-5-in-1-sit-stand-desk";
    desk.sourceTitle = "MOFT Z Sit-stand Laptop Desk - Black";
    const keyboard = plan.find((p) => p.id === 244);
    keyboard.url = razer.images.find((u) => u.endsWith("white-1500x1000-2.jpg"));
    keyboard.source = razer.url;
    keyboard.sourceTitle = "Razer DeathStalker V2 Pro Tenkeyless - White, RZ03-04373500-R3M1";
    if (!keyboard.url || !desk.url) throw new Error("Missing exact manufacturer images");
    save("plan.json", plan);
    console.log("Final manufacturer images selected");
  } else if (mode === "finalize") {
    const products = json("products.json"), plan = json("plan.json");
    const unresolvedIds = [95,143,144,145,149,236,296,302,308,351,355,361,362,363,365,366,382,383,384,399,400];
    const unresolved = unresolvedIds.map((id) => {
      const p = products.find((p) => p.id === id);
      return { id, name: p.name, old: p.imageUrl, url: "", source: "Search results and manufacturer catalog reviewed; no verified matching model/color photo", reason: "Remove known incorrect image. Use the existing frontend category icon until a matching product photo is available." };
    });
    for (const p of unresolved) {
      const at = plan.findIndex((r) => r.id === p.id);
      if (at >= 0) plan[at] = p; else plan.push(p);
    }
    save("unresolved.json", unresolved);
    save("plan.json", plan.filter((p) => p.url !== p.old).sort((a, b) => a.id - b.id));
    console.log(JSON.stringify({ replacements: plan.filter((p) => p.url && p.url !== p.old).length, removedWrongImages: unresolved.length }));
  } else if (mode === "check-plan") {
    const plan = json("plan.json");
    const previous = existsSync(path.join(dir, "replacement-audit.json")) ? json("replacement-audit.json") : [];
    const results = await parallel(plan.filter((p) => p.url), (p) => previous.find((r) => r.id === p.id && r.url === p.url && !r.error) ?? inspect(p.id, p.url, "replacement"));
    save("replacement-audit.json", results);
    await sheets(plan, results, "replacement");
    console.log(JSON.stringify({ total: plan.length, failed: results.filter((r) => r.error || Math.max(r.width, r.height) < 800) }));
  } else if (mode === "apply") {
    const plan = json("plan.json"), checked = json("replacement-audit.json");
    if (new Set(plan.map((p) => p.id)).size !== plan.length) throw new Error("Duplicate product IDs");
    for (const p of plan) {
      if (p.url === "" && p.reason && p.source) continue;
      const m = checked.find((r) => r.id === p.id && r.url === p.url);
      if (!m || m.error || Math.max(m.width, m.height) < 800 || !p.source || !p.reason) throw new Error(`Unverified image #${p.id}`);
    }
    const before = await prisma.product.findMany({ select: { id: true, name: true, imageUrl: true }, orderBy: { id: "asc" } });
    save(`before-apply-${Date.now()}.json`, before);
    await prisma.$transaction(async (tx) => {
      for (const p of plan) {
        const result = await tx.product.updateMany({ where: { id: p.id, imageUrl: p.old }, data: { imageUrl: p.url } });
        if (result.count !== 1) throw new Error(`Image changed concurrently #${p.id}; transaction rolled back`);
      }
    }, { timeout: 60000 });
    const after = await prisma.product.findMany({ select: { id: true, name: true, imageUrl: true }, orderBy: { id: "asc" } });
    save("after-apply.json", after);
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const report = plan.map((p) => ({ ...p, width: checked.find((m) => m.id === p.id)?.width, height: checked.find((m) => m.id === p.id)?.height }));
    writeFileSync(path.join(dir, "applied-report.csv"), "\uFEFF" + ["id,name,action,width,height,source,image_url,previous_image_url", ...report.map((p) => [p.id,p.name,p.url ? "replaced" : "removed_unverified",p.width,p.height,p.source,p.url,p.old].map(quote).join(","))].join("\n"));
    save("applied-summary.json", { appliedAt: new Date().toISOString(), products: after.length, replaced: plan.filter((p) => p.url).length, removedUnverified: plan.filter((p) => !p.url).length, verified: plan.every((p) => after.find((a) => a.id === p.id)?.imageUrl === p.url), remainingLandscape: after.filter((p) => /picsum|unsplash/.test(p.imageUrl ?? "")).length, changedNamesDuringApply: before.filter((b) => after.find((a) => a.id === b.id)?.name !== b.name).length });
    console.log(JSON.stringify({ updated: plan.length, verified: plan.every((p) => after.find((r) => r.id === p.id)?.imageUrl === p.url), remainingLandscape: after.filter((p) => /picsum|unsplash/.test(p.imageUrl ?? "")).map((p) => p.id), nameDifferencesDuringApply: before.filter((b) => after.find((a) => a.id === b.id)?.name !== b.name).length }));
  } else throw new Error("Use audit, check-plan, or apply");
};
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
