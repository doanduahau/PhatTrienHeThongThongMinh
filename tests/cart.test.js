import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct } from "./helpers/db.js";
import { registerUser } from "./helpers/api.js";

let token;
let user;
let product;

beforeEach(async () => {
  await resetDatabase();
  const category = await createCategory();
  product = await createProduct({ categoryId: category.id, price: 500000, stockQuantity: 10 });
  ({ token, user } = await registerUser(app));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (req) => req.set("Authorization", `Bearer ${token}`);

describe("Bước 5 - Cart", () => {
  test("thêm cùng sản phẩm 3 lần chỉ tạo 1 dòng với quantity = 3", async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await auth(request(app).post("/api/cart/items")).send({ productId: product.id, quantity: 1 });
      expect(res.status).toBe(200);
    }

    const cart = await auth(request(app).get("/api/cart"));

    expect(cart.status).toBe(200);
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.items[0].quantity).toBe(3);
    expect(cart.body.data.totalItems).toBe(3);
    expect(cart.body.data.subtotal).toBe(1500000);
  });

  test("thêm vượt tồn kho trả 400 và giỏ không đổi", async () => {
    const res = await auth(request(app).post("/api/cart/items")).send({ productId: product.id, quantity: 20 });

    expect(res.status).toBe(400);
    expect(res.body.data.available).toBe(10);
    expect(await prisma.cartItem.count()).toBe(0);
  });

  test("mỗi user chỉ thấy giỏ của mình", async () => {
    await auth(request(app).post("/api/cart/items")).send({ productId: product.id, quantity: 2 });

    const other = await registerUser(app, { username: "khach2", email: "khach2@test.vn" });
    const cart = await request(app).get("/api/cart").set("Authorization", `Bearer ${other.token}`);

    expect(cart.body.data.items).toHaveLength(0);
    expect(cart.body.data.subtotal).toBe(0);
  });

  test("cập nhật quantity = 0 thì xoá dòng khỏi giỏ", async () => {
    await auth(request(app).post("/api/cart/items")).send({ productId: product.id, quantity: 2 });

    const res = await auth(request(app).put(`/api/cart/items/${product.id}`)).send({ quantity: 0 });

    expect(res.status).toBe(200);
    expect(await prisma.cartItem.count()).toBe(0);
  });

  test("cần đăng nhập mới xem được giỏ", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });

  test("tự tạo lại giỏ nếu user chưa có cart", async () => {
    await prisma.cart.deleteMany({ where: { userId: user.id } });

    const res = await auth(request(app).post("/api/cart/items")).send({
      productId: product.id,
      quantity: 1,
    });

    expect(res.status).toBe(200);
    expect(await prisma.cart.count({ where: { userId: user.id } })).toBe(1);
  });
});
