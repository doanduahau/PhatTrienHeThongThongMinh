/**
 * Undo match-images.js --apply: khôi phục products.image_url từ prisma/image-url-backup.json.
 *
 *   node prisma/rollback-images.js
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";

const BACKUP_FILE = path.resolve("prisma/image-url-backup.json");

const main = async () => {
  if (!existsSync(BACKUP_FILE)) {
    console.error(`Không có ${path.basename(BACKUP_FILE)} — không có gì để khôi phục.`);
    process.exitCode = 1;
    return;
  }
  const backup = JSON.parse(readFileSync(BACKUP_FILE, "utf8"));
  const rows = backup.filter((row) => Number.isFinite(Number(row.id)));
  console.log(`Khôi phục ${rows.length} image_url từ ${path.basename(BACKUP_FILE)}`);

  const params = rows.flatMap((row) => [Number(row.id), row.imageUrl ?? null]);
  const values = rows.map((_, i) => `($${i * 2 + 1}::bigint, $${i * 2 + 2}::text)`).join(", ");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE products p SET image_url = src.image_url
        FROM (VALUES ${values}) AS src(id, image_url)
      WHERE p.id = src.id`,
    ...params,
  );

  const check = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS products, COUNT(DISTINCT image_url)::int AS distinct_urls,
            COUNT(*) FILTER (WHERE image_url IS NULL OR btrim(image_url) = '')::int AS empty
       FROM products`,
  );
  console.log(`Đã khôi phục ${updated} dòng.`, JSON.stringify(check[0]));
};

main()
  .catch((e) => { console.error("ROLLBACK THẤT BẠI:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
