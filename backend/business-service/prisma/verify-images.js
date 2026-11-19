/**
 * Kiểm mọi products.image_url hiển thị thật qua image optimizer của frontend —
 * cùng đường dẫn mà trình duyệt dùng, nên đây là bằng chứng ảnh không vỡ.
 *
 *   node prisma/verify-images.js
 *   node prisma/verify-images.js --base=http://localhost:3000 --only=broken
 */
import { prisma } from "../src/clients/prisma.client.js";

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;

const BASE = arg("base", "http://localhost:3000");
const CONCURRENCY = 8;

const check = async (url) => {
  const res = await fetch(`${BASE}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
  return { ok: res.ok && bytes > 1000, status: res.status, bytes };
};

const main = async () => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true, category: { select: { slug: true } } },
    orderBy: { id: "asc" },
  });
  console.log(`Kiểm ${products.length} ảnh qua ${BASE} (đồng thời ${CONCURRENCY})...`);

  const queue = [...products];
  const broken = [];
  const worker = async () => {
    for (;;) {
      const p = queue.shift();
      if (!p) return;
      try {
        const r = await check(p.imageUrl ?? "");
        if (!r.ok) broken.push({ id: p.id, slug: p.category?.slug, name: p.name, ...r, url: p.imageUrl });
      } catch {
        broken.push({ id: p.id, slug: p.category?.slug, name: p.name, status: "ERR", bytes: 0, url: p.imageUrl });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const urls = new Set(products.map((p) => p.imageUrl));
  const empty = products.filter((p) => !p.imageUrl?.trim()).length;
  console.log(`\nproducts ${products.length} | URL distinct ${urls.size} | trống ${empty} | vỡ ${broken.length}`);
  for (const b of broken.slice(0, 40)) {
    console.log(`  #${b.id} [${b.slug}] ${b.name} -> HTTP ${b.status} ${b.bytes}B  ${String(b.url).slice(0, 90)}`);
  }
  if (broken.length > 40) console.log(`  … còn lại ${broken.length - 40}`);
};

main()
  .catch((e) => { console.error("VERIFY THẤT BẠI:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
