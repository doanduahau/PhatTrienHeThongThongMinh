/**
 * Undo seed-ml-demo.js: xoá tài khoản demo cùng ratings/reviews của nó,
 * rồi khôi phục products.rating / products.rating_count từ file backup.
 *
 *   node prisma/rollback-ml-demo.js
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";

const DEMO_PREFIX = "mldemo";
const BACKUP_FILE = path.resolve("prisma/ml-demo-backup.json");

const main = async () => {
  const demoUsers = await prisma.user.findMany({
    where: { username: { startsWith: DEMO_PREFIX } },
    select: { id: true, username: true },
  });
  const ids = demoUsers.map((u) => u.id);

  console.log("TRƯỚC KHI ROLLBACK");
  const before = await prisma.$queryRawUnsafe(
    "SELECT (SELECT COUNT(*) FROM ratings)::int AS ratings, (SELECT COUNT(*) FROM reviews)::int AS reviews, (SELECT COUNT(*) FROM products WHERE rating_count > 0)::int AS products_with_reviews",
  );
  console.log("  ", before[0]);

  if (ids.length > 0) {
    const reviews = await prisma.review.deleteMany({ where: { userId: { in: ids } } });
    const ratings = await prisma.rating.deleteMany({ where: { userId: { in: ids } } });
    const carts = await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
    const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(
      `  Đã xoá ${users.count} user demo, ${ratings.count} ratings, ${reviews.count} reviews, ${carts.count} cart`,
    );
  } else {
    console.log("  Không tìm thấy user demo nào để xoá.");
  }

  if (!existsSync(BACKUP_FILE)) {
    console.log(`\n⚠ Không có ${path.basename(BACKUP_FILE)} — products giữ nguyên rating/rating_count hiện tại.`);
  } else {
    const backup = JSON.parse(readFileSync(BACKUP_FILE, "utf8"));
    const rows = backup.filter(
      (row) => Number.isFinite(row.rating) && Number.isInteger(row.ratingCount),
    );
    if (rows.length !== backup.length) {
      console.log(`\n⠘ Backup có ${backup.length - rows.length} dòng lỗi, chỉ khôi phục ${rows.length} dòng.`);
    }
    const values = rows.map((row) => `(${Number(row.id)}, ${Number(row.rating)}, ${Number(row.ratingCount)})`).join(", ");
    await prisma.$executeRawUnsafe(
      `UPDATE products p
          SET rating = src.rating, rating_count = src.rating_count
         FROM (VALUES ${values}) AS src(id, rating, rating_count)
        WHERE p.id = src.id`,
    );
    console.log(`  Đã khôi phục rating/rating_count cho ${rows.length} sản phẩm từ backup.`);
  }

  const after = await prisma.$queryRawUnsafe(
    "SELECT (SELECT COUNT(*) FROM ratings)::int AS ratings, (SELECT COUNT(*) FROM reviews)::int AS reviews, (SELECT COUNT(*) FROM products WHERE rating_count > 0)::int AS products_with_reviews",
  );
  console.log("SAU KHI ROLLBACK");
  console.log("  ", after[0]);
};

main()
  .catch((error) => {
    console.error("ROLLBACK THẤT BẠI:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
