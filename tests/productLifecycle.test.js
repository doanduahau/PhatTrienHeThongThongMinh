import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import {
  resetDatabase,
  createCategory,
  createProduct,
  createShippingMethod,
} from "./helpers/db.js";
import { registerUser, createAdminToken } from "./helpers/api.js";

let adminToken;

const auth = (req, token = adminToken) => req.set("Authorization", `Bearer ${token}`);

const legacyProduct = (categoryId, name = "Sản phẩm không có detail") =>
  prisma.product.create({
    data: {
      categoryId,
      name,
      price: 100000,
      stockQuantity: 5,
      imageUrl: "https://example.com/legacy.png",
    },
  });

beforeEach(async () => {
  await resetDatabase();
  adminToken = await createAdminToken(app);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Vòng đời sản phẩm", () => {
  test("không xoá được sản phẩm đã nằm trong đơn hàng", async () => {
    const category = await createCategory();
    const product = await createProduct({ categoryId: category.id, stockQuantity: 5 });
    const shipping = await createShippingMethod();
    const { token } = await registerUser(app);

    await auth(request(app).post("/api/cart/items"), token).send({
      productId: product.id,
      quantity: 1,
    });
    const checkout = await auth(request(app).post("/api/orders"), token).send({
      shippingMethodId: shipping.id,
      shippingAddress: "123 Nguyễn Trãi, TP.HCM",
      shippingPhone: "0901234567",
    });
    expect(checkout.status).toBe(200);

    const res = await auth(request(app).delete(`/api/products/${product.id}`));

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("đang được sử dụng");
    expect(await prisma.product.findUnique({ where: { id: product.id } })).not.toBeNull();
  });

  test("đổi sang danh mục có detail mà thiếu detail trả 400 và giữ nguyên danh mục", async () => {
    const mouse = await createCategory("chuot", "Chuột");
    const keyboard = await createCategory("ban-phim", "Bàn phím");
    const product = await legacyProduct(mouse.id);

    const res = await auth(request(app).put(`/api/products/${product.id}`)).send({
      categoryId: keyboard.id,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("yêu cầu thông số chi tiết");

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved.categoryId).toBe(mouse.id);
  });

  test("đổi sang danh mục có detail kèm detail hợp lệ thì tạo detail mới", async () => {
    const mouse = await createCategory("chuot", "Chuột");
    const keyboard = await createCategory("ban-phim", "Bàn phím");
    const product = await legacyProduct(mouse.id);

    const res = await auth(request(app).put(`/api/products/${product.id}`)).send({
      categoryId: keyboard.id,
      detail: { brand: "Akko", connectivity: "wired", layout: "TKL" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.detail.brand).toBe("Akko");

    const detail = await request(app).get(`/api/products/${product.id}`);
    expect(detail.body.data.category.slug).toBe("ban-phim");
    expect(detail.body.data.detail.layout).toBe("TKL");
  });

  test("đổi sang danh mục không có detail vẫn cho phép", async () => {
    const mouse = await createCategory("chuot", "Chuột");
    const other = await createCategory("khac", "Khác");
    const product = await legacyProduct(mouse.id);

    const res = await auth(request(app).put(`/api/products/${product.id}`)).send({
      categoryId: other.id,
    });
    const detail = await request(app).get(`/api/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(detail.body.data.category.slug).toBe("khac");
    expect(detail.body.data.detail).toBeNull();
  });
});
