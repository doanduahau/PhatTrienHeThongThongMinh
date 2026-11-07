import bcrypt from "bcryptjs";
import { prisma } from "../src/clients/prisma.client.js";
import { env } from "../src/config/env.js";
import { ROLES } from "../src/utils/constants.js";

const categories = [
  { name: "Chuột", slug: "chuot" },
  { name: "Bàn phím", slug: "ban-phim" },
  { name: "Tai nghe", slug: "tai-nghe" },
  { name: "Lót chuột", slug: "lot-chuot" },
  { name: "Setup", slug: "setup" },
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

/** Sản phẩm mẫu: mỗi sản phẩm kèm đúng bảng thông số chi tiết theo danh mục */
const products = [
  {
    slug: "chuot",
    name: "Logitech G Pro X Superlight 2",
    color: "Đen",
    price: 3490000,
    stockQuantity: 15,
    rating: 4.8,
    detail: {
      mouse: {
        brand: "Logitech",
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
    slug: "chuot",
    name: "Razer Viper V3 Pro",
    color: "Trắng",
    price: 3990000,
    stockQuantity: 8,
    rating: 4.7,
    detail: {
      mouse: {
        brand: "Razer",
        connectivity: "wireless",
        handOrientation: "symmetrical",
        weightG: 54,
        pollingRateHz: 8000,
        switchType: "Optical Gen-3",
        sensor: "Focus Pro 35K",
      },
    },
  },
  {
    slug: "chuot",
    name: "Zowie EC2-CW",
    color: "Đen",
    price: 2890000,
    stockQuantity: 10,
    rating: 4.5,
    detail: {
      mouse: {
        brand: "Zowie",
        connectivity: "wireless",
        handOrientation: "ergonomic",
        weightG: 77,
        pollingRateHz: 1000,
        switchType: "Huano",
        sensor: "PixArt 3370",
      },
    },
  },
  {
    slug: "ban-phim",
    name: "Akko 5075B Plus",
    color: "Hồng",
    price: 1590000,
    stockQuantity: 20,
    rating: 4.6,
    detail: {
      keyboard: {
        brand: "Akko",
        connectivity: "tri_mode",
        layout: "75%",
        hasRapidTrigger: false,
        hasHotswap: true,
        supportMacos: true,
        pollingRateHz: 1000,
        switch: "Akko V3 Cream Yellow",
      },
    },
  },
  {
    slug: "ban-phim",
    name: "Keychron Q1 Pro",
    color: "Xám",
    price: 4290000,
    stockQuantity: 6,
    rating: 4.8,
    detail: {
      keyboard: {
        brand: "Keychron",
        connectivity: "wireless",
        layout: "75%",
        hasHotswap: true,
        supportMacos: true,
        pollingRateHz: 1000,
        switch: "Gateron Jupiter Banana",
      },
    },
  },
  {
    slug: "ban-phim",
    name: "Wooting 60HE+",
    color: "Đen",
    price: 4590000,
    stockQuantity: 4,
    rating: 4.9,
    detail: {
      keyboard: {
        brand: "Wooting",
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
    name: "HyperX Cloud III",
    color: "Đen đỏ",
    price: 1990000,
    stockQuantity: 12,
    rating: 4.6,
    detail: {
      headphone: {
        brand: "HyperX",
        connectivity: "wired_3.5mm",
        headphoneType: "over_ear",
        hasMic: true,
        hasAnc: false,
      },
    },
  },
  {
    slug: "tai-nghe",
    name: "SteelSeries Arctis Nova 7",
    color: "Đen",
    price: 3290000,
    stockQuantity: 7,
    rating: 4.5,
    detail: {
      headphone: {
        brand: "SteelSeries",
        connectivity: "wireless_2.4g",
        headphoneType: "over_ear",
        hasMic: true,
        hasAnc: true,
      },
    },
  },
  {
    slug: "tai-nghe",
    name: "Moondrop Chu II",
    color: "Bạc",
    price: 490000,
    stockQuantity: 30,
    rating: 4.4,
    detail: {
      headphone: {
        brand: "Moondrop",
        connectivity: "wired_3.5mm",
        headphoneType: "in_ear",
        hasMic: false,
        hasAnc: false,
      },
    },
  },
  {
    slug: "lot-chuot",
    name: "Artisan Hien XL",
    color: "Đỏ",
    price: 1290000,
    stockQuantity: 14,
    rating: 4.7,
    detail: {
      mousepad: {
        brand: "Artisan",
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
    slug: "lot-chuot",
    name: "Logitech G640 Large",
    color: "Đen",
    price: 690000,
    stockQuantity: 25,
    rating: 4.3,
    detail: {
      mousepad: {
        brand: "Logitech",
        padType: "cloth",
        mouseControl: "control",
        surface: "cloth",
        base: "cao su",
        size: "L",
      },
    },
  },
  {
    slug: "lot-chuot",
    name: "Razer Strider",
    color: "Đen",
    price: 890000,
    stockQuantity: 9,
    rating: 4.5,
    detail: {
      mousepad: {
        brand: "Razer",
        padType: "hybrid",
        mouseControl: "speed",
        surface: "hybrid",
        base: "cao su",
        size: "XL",
      },
    },
  },
  {
    slug: "setup",
    name: "Sihoo M57",
    color: "Đen",
    price: 3290000,
    stockQuantity: 5,
    rating: 4.6,
    detail: {
      setup: { brand: "Sihoo", setupCategory: "chair", maxLoadKg: 150 },
    },
  },
  {
    slug: "setup",
    name: "North Bayou F80",
    color: "Đen",
    price: 790000,
    stockQuantity: 18,
    rating: 4.7,
    detail: {
      setup: { brand: "North Bayou", setupCategory: "arm", maxLoadKg: 9 },
    },
  },
  {
    slug: "setup",
    name: "E-Dra EGT1",
    color: "Đen",
    price: 2490000,
    stockQuantity: 6,
    rating: 4.2,
    detail: {
      setup: { brand: "E-Dra", setupCategory: "desk", maxLoadKg: 100 },
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
  console.log("[SEED] Bắt đầu tạo dữ liệu mẫu...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
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

  let createdProducts = 0;
  const seenSeedKeys = new Set();

  for (const product of products) {
    const category = await prisma.category.findUnique({ where: { slug: product.slug } });
    if (!category) throw new Error(`Không tìm thấy danh mục cho sản phẩm: ${product.name}`);

    const [relation, detailData] = Object.entries(product.detail)[0];
    // Khóa ổn định theo loại + thương hiệu: đổi tên hiển thị trong seed không sinh bản ghi mới.
    const seedKey = `${product.slug}-${detailData.brand}`;
    if (seenSeedKeys.has(seedKey)) throw new Error(`Seed key bị trùng: ${seedKey}`);
    seenSeedKeys.add(seedKey);

    const imageUrl = `https://picsum.photos/seed/gear-${seedKey}/600/400`;
    const existing = await prisma.product.findFirst({
      where: { OR: [{ imageUrl }, { name: product.name }] },
    });

    if (existing) {
      // Cập nhật thông tin mô tả, giữ nguyên tồn kho thực tế sau khi đã bán hàng.
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          name: product.name,
          color: product.color,
          price: product.price,
          rating: product.rating,
          imageUrl,
        },
      });
      await prisma[relation].upsert({
        where: { productId: existing.id },
        create: { ...detailData, productId: existing.id },
        update: detailData,
      });
      continue;
    }

    // product.detail dùng { mouse: {...} } -> cần bọc { create: {...} } cho nested write
    const detailRelations = { [relation]: { create: detailData } };

    await prisma.product.create({
      data: {
        categoryId: category.id,
        name: product.name,
        color: product.color,
        price: product.price,
        stockQuantity: product.stockQuantity,
        rating: product.rating,
        imageUrl,
        ...detailRelations,
      },
    });
    createdProducts += 1;
  }
  console.log(`[SEED] ${createdProducts} sản phẩm mới (bỏ qua sản phẩm đã có)`);

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
