import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct, createShippingMethod } from "./helpers/db.js";
import { registerUser, createAdminToken } from "./helpers/api.js";

let userToken;
let adminToken;
let product;
let shipping;

beforeEach(async () => {
  await resetDatabase();
  const category = await createCategory();
  product = await createProduct({ categoryId: category.id, price: 500000, stockQuantity: 10 });
  shipping = await createShippingMethod({ fee: 30000 });
  ({ token: userToken } = await registerUser(app));
  adminToken = await createAdminToken(app);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const createOrder = async () => {
  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ productId: product.id, quantity: 2 });

  const res = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ shippingMethodId: shipping.id, shippingAddress: "123 Nguyễn Trãi, TP.HCM", shippingPhone: "0901234567" });

  return res.body.data;
};

const setStatus = (orderId, status) =>
  request(app)
    .patch(`/api/admin/orders/${orderId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status });

describe("Bước 8 - Vòng đời trạng thái đơn", () => {
  test("không cho nhảy trạng thái pending -> delivered", async () => {
    const order = await createOrder();

    const res = await setStatus(order.id, "delivered");

    expect(res.status).toBe(400);
    expect(res.body.data.allowedStatuses).toEqual(["confirmed", "cancelled"]);
  });

  test("huỷ đơn hoàn kho đúng một lần, huỷ lần hai bị chặn", async () => {
    const order = await createOrder();
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity).toBe(8);

    const first = await setStatus(order.id, "cancelled");
    expect(first.status).toBe(200);
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity).toBe(10);

    const second = await setStatus(order.id, "cancelled");
    expect(second.status).toBe(400);
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity).toBe(10);
  });

  test("luồng hợp lệ pending -> confirmed -> shipping -> delivered", async () => {
    const order = await createOrder();

    expect((await setStatus(order.id, "confirmed")).status).toBe(200);
    expect((await setStatus(order.id, "shipping")).status).toBe(200);
    expect((await setStatus(order.id, "delivered")).status).toBe(200);

    const saved = await prisma.order.findUnique({ where: { id: order.id } });
    expect(saved.status).toBe("delivered");
  });

  test("đơn đã giao không thể huỷ", async () => {
    const order = await createOrder();
    await setStatus(order.id, "confirmed");
    await setStatus(order.id, "shipping");
    await setStatus(order.id, "delivered");

    const res = await setStatus(order.id, "cancelled");
    expect(res.status).toBe(400);
  });

  test("khách chỉ được huỷ đơn đang pending", async () => {
    const order = await createOrder();
    await setStatus(order.id, "confirmed");

    const res = await request(app)
      .patch(`/api/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  test("customer không gọi được API quản trị đơn", async () => {
    const order = await createOrder();

    const res = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(403);
  });
});
