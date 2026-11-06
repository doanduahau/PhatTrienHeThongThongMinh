import bcrypt from "bcryptjs";
import { prisma } from "../../src/clients/prisma.client.js";

/** Xoá sạch dữ liệu theo đúng thứ tự khoá ngoại */
export const resetDatabase = async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.mouse.deleteMany();
  await prisma.keyboard.deleteMany();
  await prisma.headphone.deleteMany();
  await prisma.mousepad.deleteMany();
  await prisma.setup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.user.deleteMany();
};

export const createCategory = (slug = "chuot", name = "Chuột") =>
  prisma.category.create({ data: { slug, name } });

export const createShippingMethod = (overrides = {}) =>
  prisma.shippingMethod.create({
    data: { name: "Giao hàng tiêu chuẩn", fee: 30000, estimatedDays: "3-5 ngày", ...overrides },
  });

export const createProduct = ({ categoryId, name = "Sản phẩm test", price = 500000, stockQuantity = 10 } = {}) =>
  prisma.product.create({
    data: {
      categoryId,
      name,
      price,
      stockQuantity,
      rating: 4.5,
      imageUrl: "https://example.com/product.png",
    },
  });

export const createUser = async ({ username, email, password = "123456", role = "customer", address } = {}) =>
  prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 4),
      role,
      address,
    },
  });
