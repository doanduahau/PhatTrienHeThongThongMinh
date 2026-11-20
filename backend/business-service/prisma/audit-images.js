/**
 * Kiểm kê ảnh sản phẩm trong DB: thiếu, trùng, nguồn ảnh nào.
 *   node prisma/audit-images.js
 */
import { prisma } from "../src/clients/prisma.client.js";

const q = (sql) => prisma.$queryRawUnsafe(sql.replace(/\s+/g, " ").trim());

const main = async () => {
  console.log("DB:", JSON.stringify((await q("SELECT current_database() AS db, current_schema() AS sch"))[0]));

  const totals = (await q(`
    SELECT COUNT(*)::int AS products,
           COUNT(*) FILTER (WHERE image_url IS NULL OR btrim(image_url) = '')::int AS empty,
           COUNT(DISTINCT image_url) FILTER (WHERE btrim(image_url) <> '')::int AS distinct_urls
      FROM products
  `))[0];
  console.log("TỔNG:", JSON.stringify(totals));

  const hosts = await q(`
    SELECT CASE WHEN image_url IS NULL OR btrim(image_url) = '' THEN '(trống)'
                ELSE split_part(image_url, '/', 3) END AS host,
           COUNT(*)::int AS n
      FROM products GROUP BY 1 ORDER BY n DESC
  `);
  console.log("\nNGUỒN THEO HOST:");
  for (const h of hosts) console.log(`  ${String(h.n).padStart(4)}  ${h.host}`);

  const dup = await q(`
    SELECT image_url, COUNT(*)::int AS n,
           COUNT(DISTINCT category_id)::int AS categories,
           ARRAY_AGG(DISTINCT c.name) AS cat_names
      FROM products p JOIN categories c ON c.id = p.category_id
     WHERE image_url IS NOT NULL AND btrim(image_url) <> ''
     GROUP BY image_url HAVING COUNT(*) > 1
     ORDER BY n DESC, image_url
  `);
  const dupRows = dup.reduce((sum, d) => sum + d.n, 0);
  console.log(`\nẢNH TRÙNG: ${dup.length} URL dùng chung cho ${dupRows} sản phẩm`);
  for (const d of dup.slice(0, 12)) {
    console.log(`  ${String(d.n).padStart(3)}x  ${String(d.image_url).slice(0, 76)}`);
    console.log(`        ${d.categories} danh mục: ${d.cat_names.join(", ")}`);
  }
  if (dup.length > 12) console.log(`  … còn lại ${dup.length - 12} URL trùng khác`);

  const perCat = await q(`
    SELECT c.slug, c.name, COUNT(*)::int AS products,
           COUNT(*) FILTER (WHERE p.image_url IS NULL OR btrim(p.image_url) = '')::int AS empty,
           COUNT(DISTINCT p.image_url)::int AS distinct_urls
      FROM products p JOIN categories c ON c.id = p.category_id
     GROUP BY c.id ORDER BY products DESC
  `);
  console.log("\nTHEO DANH MỤC  (sản phẩm / ảnh khác nhau / trống):");
  for (const c of perCat) {
    console.log(`  ${String(c.products).padStart(4)} / ${String(c.distinct_urls).padStart(3)} / ${String(c.empty).padStart(3)}  ${c.slug}`);
  }

  const samples = await q(
    "SELECT p.id, p.name, c.slug, p.image_url FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id LIMIT 6",
  );
  console.log("\nMẪU:");
  for (const s of samples) console.log(`  #${s.id} [${s.slug}] ${s.name} -> ${s.image_url}`);
};

main()
  .catch((e) => { console.error("AUDIT THẤT BẠI:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
