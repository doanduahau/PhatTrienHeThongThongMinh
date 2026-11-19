/**
 * Undo clean-product-names.js --apply: khôi phục products.name từ prisma/product-name-backup.json.
 *
 *   node prisma/rollback-names.js
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";

const BACKUP_FILE = path.resolve("prisma/product-name-backup.json");

const main = async () => {
  if (!existsSync(BACKUP_FILE)) {
    console.error(`Không có ${path.basename(BACKUP_FILE)} — không có gì để khôi phục.`);
    process.exitCode = 1;
    return;
  }
  const raw = JSON.parse(readFileSync(BACKUP_FILE, "utf8"));
  // Backup là map {id: tên gốc}; bản cũ dạng mảng vẫn đọc được.
  const entries = Array.isArray(raw)
    ? raw.map((row) => [row.id, row.name])
    : Object.entries(raw);
  const rows = entries
    .map(([id, name]) => ({ id: Number(id), name }))
    .filter((row) => Number.isFinite(row.id) && row.name);
  console.log(`Khôi phục ${rows.length} products.name từ ${path.basename(BACKUP_FILE)}`);

  const params = rows.flatMap((row) => [Number(row.id), row.name]);
  const values = rows.map((_, i) => `($${i * 2 + 1}::bigint, $${i * 2 + 2}::text)`).join(", ");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE products p SET name = src.name
       FROM (VALUES ${values}) AS src(id, name)
      WHERE p.id = src.id`,
    ...params,
  );

  const check = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS products,
           COUNT(*) FILTER (WHERE btrim(name) = '')::int AS empty
      FROM products`;
  console.log(`Đã khôi phục ${updated} dòng.`, JSON.stringify(check[0]));
};

main()
  .catch((error) => {
    console.error("ROLLBACK THẤT BẠI:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
