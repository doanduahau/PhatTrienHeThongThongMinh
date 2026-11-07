import bcrypt from "bcryptjs";
import { prisma } from "../src/clients/prisma.client.js";
import { env } from "../src/config/env.js";
import { ROLES } from "../src/utils/constants.js";

const categories = [
  { name: "Chuột", slug: "chuot" },
  { name: "Tai nghe", slug: "tai-nghe" },
  { name: "Soundcard", slug: "soundcard" },
  { name: "Bàn phím", slug: "ban-phim" },
  { name: "Ghế", slug: "ghe" },
  { name: "Bàn", slug: "ban" },
  { name: "Arm màn hình", slug: "arm-man-hinh" },
  { name: "Phụ kiện công thái học", slug: "phu-kien-cong-thai-hoc" },
  { name: "Lót chuột", slug: "lot-chuot" },
];

const shippingMethods = [
  { name: "Giao hàng tiêu chuẩn", fee: 30000, estimatedDays: "3-5 ngày" },
  { name: "Giao hàng nhanh", fee: 60000, estimatedDays: "1-2 ngày" },
  { name: "Giao hàng hoả tốc", fee: 120000, estimatedDays: "Trong ngày" },
];

const adminUser = {
  username: process.env.SEED_ADMIN_USERNAME || "admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@gearshop.vn",
  password: process.env.SEED_ADMIN_PASSWORD || "admin123",
  role: ROLES.ADMIN,
};

const customers = [
  { username: "khachhang1", email: "khach1@gearshop.vn", password: "123456", address: "12 Nguyễn Huệ, Q.1, TP.HCM" },
  { username: "khachhang2", email: "khach2@gearshop.vn", password: "123456", address: "45 Lê Lợi, Hải Châu, Đà Nẵng" },
];

/** Sản phẩm mẫu dự phòng khi database hoàn toàn trống */
const fallbackProducts = [
  {
    slug: "chuot",
    brand: "Logitech",
    name: "Logitech G Pro X Superlight 2",
    color: "Đen",
    price: 3490000,
    stockQuantity: 15,
    rating: 4.8,
    detail: {
      mouse: {
        connectivity: "wireless",
        handOrientation: "symmetrical",
        weightG: 60,
        pollingRateHz: 2000,
        switchType: "Omron optical",
        sensor: "Hero 2",
      },
    },
  },
  {
    slug: "ban-phim",
    brand: "Wooting",
    name: "Wooting 60HE+",
    color: "Đen",
    price: 4590000,
    stockQuantity: 4,
    rating: 4.9,
    detail: {
      keyboard: {
        connectivity: "wired",
        layout: "60%",
        hasRapidTrigger: true,
        hasHotswap: false,
        supportMacos: true,
        pollingRateHz: 1000,
        switch: "Lekker L60",
      },
    },
  },
  {
    slug: "tai-nghe",
    brand: "HyperX",
    name: "HyperX Cloud III",
    color: "Đen đỏ",
    price: 1990000,
    stockQuantity: 12,
    rating: 4.6,
    detail: {
      headphone: {
        connectivity: "wired_3.5mm",
        headphoneType: "over_ear",
        hasMic: true,
        hasAnc: false,
      },
    },
  },
  {
    slug: "lot-chuot",
    brand: "Artisan",
    name: "Artisan Hien XL",
    color: "Đỏ",
    price: 1290000,
    stockQuantity: 14,
    rating: 4.7,
    detail: {
      mousepad: {
        padType: "cloth",
        mouseControl: "speed",
        speed: "nhanh",
        surface: "hybrid",
        base: "cao su",
        size: "XL",
      },
    },
  },
  {
    slug: "ghe",
    brand: "Sihoo",
    name: "Sihoo M57",
    color: "Đen",
    price: 3290000,
    stockQuantity: 5,
    rating: 4.6,
    detail: {
      setup: { setupCategory: "chair", maxLoadKg: 150 },
    },
  },
];

const upsertUser = async ({ username, email, password, role = ROLES.CUSTOMER, address }) => {
  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await prisma.user.upsert({
    where: { username },
    update: { email, role, address },
    create: { username, email, password: hashedPassword, role, address },
  });

  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  if (!cart) await prisma.cart.create({ data: { userId: user.id } });

  return user;
};

const main = async () => {
  console.log("[SEED] Bắt đầu đồng bộ dữ liệu nền...");

  for (const category of categories) {
    const existingByName = await prisma.category.findFirst({ where: { name: category.name } });
    if (existingByName) {
      await prisma.category.update({
        where: { id: existingByName.id },
        data: { slug: category.slug, name: category.name },
      });
    } else {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      });
    }
  }
  console.log(`[SEED] ${categories.length} danh mục`);

  for (const method of shippingMethods) {
    const existing = await prisma.shippingMethod.findFirst({ where: { name: method.name } });
    if (!existing) await prisma.shippingMethod.create({ data: method });
  }
  console.log(`[SEED] ${shippingMethods.length} phương thức vận chuyển`);

  await upsertUser(adminUser);
  for (const customer of customers) await upsertUser(customer);
  console.log(`[SEED] ${1 + customers.length} người dùng`);

  const existingProductCount = await prisma.product.count();
  if (existingProductCount > 0) {
    console.log(
      `[SEED] Database đã có sẵn ${existingProductCount} sản phẩm (Supabase), giữ nguyên toàn bộ sản phẩm!`,
    );
  } else {
    let createdProducts = 0;
    for (const product of fallbackProducts) {
      const category = await prisma.category.findUnique({ where: { slug: product.slug } });
      if (!category) throw new Error(`Không tìm thấy danh mục cho sản phẩm: ${product.name}`);

      const brand = await prisma.brand.upsert({
        where: { name: product.brand },
        update: {},
        create: { name: product.brand },
      });

      const [relation, detailData] = Object.entries(product.detail)[0];
      const seedKey = `${product.slug}-${product.brand}`;
      const imageUrl = `https://picsum.photos/seed/gear-${seedKey}/600/400`;

      await prisma.product.create({
        data: {
          categoryId: category.id,
          brandId: brand.id,
          name: product.name,
          color: product.color,
          price: product.price,
          stockQuantity: product.stockQuantity,
          rating: product.rating,
          imageUrl,
          [relation]: { create: detailData },
        },
      });
      createdProducts += 1;
    }
    console.log(`[SEED] ${createdProducts} sản phẩm mẫu mới`);
  }

  console.log("[SEED] Hoàn tất!");
  console.log(`[SEED] Admin: ${adminUser.username} / ${adminUser.password}`);
};

main()
  .catch((error) => {
    console.error("[SEED] Thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
