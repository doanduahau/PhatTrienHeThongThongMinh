import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const dir = path.resolve("prisma/.cache/image-repair");
const read = (file) => JSON.parse(readFileSync(path.join(dir, file), "utf8"));
export function addManualImages() {
  const products = read("products.json"), plan = read("plan.json");
  const catalog = JSON.parse(readFileSync("prisma/.cache/source-products.json", "utf8"));
  const hw = read("source-hyperwork.vn.json").products;
  const ep = read("source-epione.vn.json").products;
  const rows = [];
  const add = (id, url, source, sourceTitle, reason = "Official product image; matched model and color.") => {
    const p = products.find((p) => p.id === id);
    rows.push({ id, name: p.name, old: p.imageUrl, url, source, sourceTitle, reason });
  };
  const official = (id, list, handle, index = 0, variant) => {
    const p = list.find((p) => p.handle === handle);
    if (!p) throw new Error(`Missing official catalog entry ${handle}`);
    const image = variant ? p.variants.find((v) => variant.test(v.title))?.featured_image?.src : p.images[index]?.src;
    if (!image) throw new Error(`Missing official variant ${handle}`);
    add(id, image, `https://${list === hw ? "hyperwork.vn" : "epione.vn"}/products/${handle}`, p.title);
  };
  add(6, "https://resource.logitechg.com/d_transparent.gif/content/dam/gaming/en/products/g502x-corded/gallery/g502x-corded-gallery-1-black.png", "https://www.logitechg.com/en-us/products/gaming-mice/g502-x-wired-lightforce.html", "Logitech G502 X corded Black");
  for (const [id, key, suffix] of [[22, "razerViperWhitePdp", "240423-viper-v3-pro-white-1500x1000-1.jpg"], [29, "razerCobraPdp", "230629-cobra-pro-1500x1000-1.jpg"], [31, "razerBasiliskPdp", "220823-basilisk-v3-pro-1500x1000-1.jpg"]]) {
    const page = read(`page-${key}.json`);
    const resized = page.images.find((url) => url.endsWith(encodeURIComponent(suffix)));
    if (!resized) throw new Error(`Missing manufacturer gallery ${key}`);
    const raw = decodeURIComponent(resized.slice(resized.indexOf("https%3A")));
    add(id, raw, page.url, suffix);
  }
  for (const [id, title, index] of [[38, "X2H Medium Gaming Mouse", 0], [40, "Xlite v3 Medium Gaming Mouse", 0]]) {
    const c = catalog.find((c) => c.title === title);
    add(id, c.srcs[index], "https://pulsar.gg", title);
  }
  add(210, "https://kz-audio.com/images/kz-castor-02-1.webp", "https://kz-audio.com/kz-castor.html", "KZ Castor Harman target version");
  add(218, "https://img.creative.com/images/products/large/pdt_23239.png", "https://us.creative.com/p/sound-blaster/sound-blasterx-g6", "Creative Sound BlasterX G6");
  official(350, hw, "ke-tay-hybrid", 1);
  official(356, hw, "gia-do-laptop-khung-nhom-hyperwork-l1", 0, /^Xám$/);
  official(359, hw, "gia-do-man-hinh-hyperwork-t6-pro-2025", 0, /^Đen$/);
  official(364, hw, "gia-do-man-hinh-hyperwork-core-arm-sa01");
  official(380, ep, "ban-nang-ha-epione-smartdesk-lite-2", 0, /^OAK \/ 1.2m/);
  official(381, hw, "ban-hyperwork-atlas", 0, /^Đen \/ Đen.*120x60cm$/);
  for (const row of rows) {
    const index = plan.findIndex((p) => p.id === row.id);
    if (index >= 0) plan[index] = row; else plan.push(row);
  }
  writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan.sort((a, b) => a.id - b.id), null, 2));
  writeFileSync(path.join(dir, "manual-preview.json"), JSON.stringify(rows, null, 2));
  console.log(`Added ${rows.length} manufacturer images; total plan ${plan.length}`);
}
