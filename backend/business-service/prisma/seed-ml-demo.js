/**
 * Seed dữ liệu đánh giá cho bảng xếp hạng "sản phẩm nổi bật" (Bayesian Weighted Rating).
 *
 * Tạo 5 tài khoản demo (mật khẩu 123456, chỉ để demo) rồi phân phối lượt đánh giá
 * theo kiểu long-tail, cuối cùng tính lại products.rating / products.rating_count
 * đúng theo công thức của rating.service.js. Không đụng tới orders/order_items.
 *
 *   node prisma/seed-ml-demo.js            # dry-run, chỉ in kế hoạch
 *   node prisma/seed-ml-demo.js --apply    # ghi thật + backup giá trị cũ
 *   node prisma/rollback-ml-demo.js        # khôi phục nguyên trạng
 */
import bcrypt from "bcryptjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/clients/prisma.client.js";
import { ROLES } from "../src/utils/constants.js";

const DEMO_COUNT = 5;
const DEMO_PASSWORD = "123456";
const DEMO_PREFIX = "mldemo";
const BACKUP_FILE = path.resolve("prisma/ml-demo-backup.json");

/** Phân phối xác suất số lượt đánh giá cho 1 sản phẩm, index = số lượt (0..5). */
const RATER_COUNT_WEIGHTS = [0.04, 0.1, 0.18, 0.26, 0.26, 0.16];
const REVIEW_RATE = 0.3;

const REVIEW_POOL = [
  "Dùng ổn, form vừa tay, không bị mỏi khi chơi lâu.",
  "Sensor bắt tốt, flick gọn, giá hợp lý trong phân khúc.",
  "Hoàn thiện chắc chắn, lên máy nhận ngay, không cần driver.",
  "Pin dùng được vài ngày, sạc nhanh, đóng gói cẩn thận.",
  "Gõ êm, keycap chắc, không có hiện tượng rung phím.",
  "Định vị bước chân rõ, đeo lâu vẫn thoáng tai.",
  "Bề mặt mượt, control tốt, giặt xong không bị đổi cảm giác.",
  "Ngồi lâu không mỏi lưng, chỉnh được nhiều vị trí.",
  "Lắp đặt đơn giản, tài liệu hướng dẫn dễ hiểu.",
  "Có lỗi nhỏ về hoàn thiện ở cạnh, nhưng dùng không cấn tay.",
];

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x66514751) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const rand = mulberry32(20261119);

const pickRaterCount = () => {
  const roll = rand();
  let acc = 0;
  for (const [count, weight] of RATER_COUNT_WEIGHTS.entries()) {
    acc += weight;
    if (roll < acc) return count;
  }
  return RATER_COUNT_WEIGHTS.length - 1;
};

const clampScore = (base) => {
  const noise = (rand() + rand() - 1) * 1.8;
  return Math.min(5, Math.max(1, Math.round(base + noise)));
};

const demoUsers = Array.from({ length: DEMO_COUNT }, (_, i) => ({
  username: `${DEMO_PREFIX}${i + 1}`,
  email: `${DEMO_PREFIX}${i + 1}@demo.local`,
  address: "Địa chỉ tài khoản demo dữ liệu ML",
}));

/** Tráo đổi mảng bằng Fisher–Yates với PRNG đã hạt giống, để kết quả tái lập được. */
const shuffled = (source) => {
  const items = [...source];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/** Dựng kế hoạch đánh giá từ danh sách sản phẩm — không ghi gì xuống DB. */
const buildPlan = (products) => {
  const ratings = [];
  const reviews = [];
  for (const product of products) {
    const n = pickRaterCount();
    if (n === 0) continue;
    const slots = shuffled(demoUsers.keys()).slice(0, n);
    for (const slot of slots) {
      const score = clampScore(Number(product.rating));
      ratings.push({ product_id: product.id, slot, score });
      if (rand() < REVIEW_RATE) {
        reviews.push({
          slot,
          product_id: product.id,
          content: `${REVIEW_POOL[Math.floor(rand() * REVIEW_POOL.length)]} (${product.name})`,
        });
      }
    }
  }
  return { ratings, reviews };
};

const main = async ({ apply }) => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, rating: true, ratingCount: true },
    orderBy: { id: "asc" },
  });
  const existing = await prisma.user.findMany({
    where: { username: { in: demoUsers.map((u) => u.username) } },
    select: { username: true },
  });
  const plan = buildPlan(products);
  const touched = new Set(plan.ratings.map((r) => r.product_id)).size;

  console.log("KẾ HOẠCH SEED DỮ LIỆU ĐÁNH GIÁ (ML featured ranking)");
  console.log(`  Sản phẩm trong catalog      : ${products.length}`);
  console.log(`  Tài khoản demo sẽ tạo mới   : ${DEMO_COUNT - existing.length} (đã có ${existing.length})`);
  console.log(`  Dòng ratings                : ${plan.ratings.length}`);
  console.log(`  Dòng reviews                : ${plan.reviews.length}`);
  console.log(`  Sản phẩm được cập nhật lại rating/rating_count : ${touched}`);
  console.log(`  Đơn hàng / order_items      : KHÔNG thay đổi`);

  if (!apply) {
    console.log("\nDry-run: chưa ghi gì. Thêm --apply để ghi thật.");
    return;
  }

  if (!existsSync(BACKUP_FILE)) {
    writeFileSync(
      BACKUP_FILE,
      JSON.stringify(
        products.map((p) => ({
          id: p.id,
          rating: Number(p.rating),
          ratingCount: p.ratingCount,
        })),
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nĐã backup ${products.length} sản phẩm -> ${path.relative(process.cwd(), BACKUP_FILE)}`);
  } else {
    console.log(`\nDùng backup có sẵn: ${path.relative(process.cwd(), BACKUP_FILE)}`);
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const byUsername = new Map();
  for (const user of demoUsers) {
    const row = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: { ...user, password: hashed, role: ROLES.CUSTOMER },
    });
    byUsername.set(user.username, row.id);
    await prisma.cart.upsert({
      where: { userId: row.id },
      update: {},
      create: { userId: row.id },
    });
  }
  const userIds = demoUsers.map((u) => byUsername.get(u.username));
  console.log(`Đã tạo ${userIds.length} tài khoản demo, mật khẩu ${DEMO_PASSWORD}`);

  await prisma.rating.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.review.deleteMany({ where: { userId: { in: userIds } } });

  await prisma.rating.createMany({
    data: plan.ratings.map((r) => ({
      userId: userIds[r.slot],
      productId: r.product_id,
      score: r.score,
    })),
    skipDuplicates: true,
  });
  console.log(`Đã ghi ${plan.ratings.length} dòng ratings`);

  await prisma.review.createMany({
    data: plan.reviews.map((r) => ({
      userId: userIds[r.slot],
      productId: r.product_id,
      content: r.content,
    })),
    skipDuplicates: true,
  });
  console.log(`Đã ghi ${plan.reviews.length} dòng reviews`);

  await prisma.$executeRawUnsafe(
    `UPDATE products p
        SET rating = agg.avg_score, rating_count = agg.cnt
       FROM (
         SELECT product_id, ROUND(AVG(score)::numeric, 2) AS avg_score, COUNT(*)::int AS cnt
           FROM ratings GROUP BY product_id
       ) agg
      WHERE agg.product_id = p.id`,
  );
  console.log("Đã tính lại products.rating / products.rating_count từ bảng ratings");

  const check = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS products_with_reviews, MAX(rating_count)::int AS max_reviews,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rating_count)::numeric, 1) AS median_reviews
       FROM products WHERE rating_count > 0`,
  );
  console.log("Thực tế sau seed:", check[0]);
};

main({ apply: process.argv.includes("--apply") })
  .catch((error) => {
    console.error("SEED THẤT BẠI:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
