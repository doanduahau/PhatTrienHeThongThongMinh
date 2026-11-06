import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct, createShippingMethod } from "./helpers/db.js";
import { registerUser } from "./helpers/api.js";

let token;
let product;
let shipping;

const checkoutBody = (shippingMethodId) => ({
  shippingMethodId,
  shippingAddress: "123 Nguyễn Trãi, TP.HCM",
  shippingPhone: "0901234567",
});

beforeEach(async () => {
  await resetDatabase();
  const category = await createCategory();
  product = await createProduct({ categoryId: category.id, price: 500000, stockQuantity: 5 });
  shipping = await createShippingMethod({ fee: 30000 });
  ({ token } = await registerUser(app));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (req) => req.set("Authorization", `Bearer ${token}`);

const addToCart = (quantity) =>
  auth(request(app).post("/api/cart/items")).send({ productId: product.id, quantity });

describe("Bước 7 - Checkout", () => {
  test("đặt hàng thành công: trừ kho, xoá giỏ, tổng tiền đúng", async () => {
    await addToCart(2);

    const res = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));

    expect(res.status).toBe(200);
    expect(Number(res.body.data.totalAmount)).toBe(1030000);
    expect(res.body.data.status).toBe("pending");

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved.stockQuantity).toBe(3);
    expect(await prisma.cartItem.count()).toBe(0);
  });

  test("thiếu hàng thì huỷ toàn bộ đơn, kho và giỏ giữ nguyên", async () => {
    await addToCart(2);
    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } });

    const res = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));

    expect(res.status).toBe(400);
    expect(res.body.data.available).toBe(1);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.cartItem.count()).toBe(1);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved.stockQuantity).toBe(1);
  });

  test("giỏ trống thì không đặt được", async () => {
    const res = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Giỏ hàng đang trống");
  });

  test("phương thức vận chuyển đã tắt thì bị chặn", async () => {
    await addToCart(1);
    await prisma.shippingMethod.update({ where: { id: shipping.id }, data: { isActive: false } });

    const res = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));
    expect(res.status).toBe(400);
  });

  test("giá trong đơn là snapshot, đổi giá sau đó không ảnh hưởng đơn cũ", async () => {
    await addToCart(1);
    const created = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));

    await prisma.product.update({ where: { id: product.id }, data: { price: 999000 } });

    const res = await auth(request(app).get(`/api/orders/${created.body.data.id}`));

    expect(res.status).toBe(200);
    expect(Number(res.body.data.items[0].price)).toBe(500000);
  });

  test("user không xem được đơn của người khác", async () => {
    await addToCart(1);
    const created = await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));

    const other = await registerUser(app, { username: "khach2", email: "khach2@test.vn" });
    const res = await request(app)
      .get(`/api/orders/${created.body.data.id}`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(404);
  });

  test("danh sách đơn của tôi lọc theo trạng thái", async () => {
    await addToCart(1);
    await auth(request(app).post("/api/orders")).send(checkoutBody(shipping.id));

    const pending = await auth(request(app).get("/api/orders")).query({ status: "pending" });
    const cancelled = await auth(request(app).get("/api/orders")).query({ status: "cancelled" });

    expect(pending.body.data.items).toHaveLength(1);
    expect(cancelled.body.data.items).toHaveLength(0);
  });
});
