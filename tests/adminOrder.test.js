import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct, createShippingMethod } from "./helpers/db.js";
import { registerUser, createAdminToken } from "./helpers/api.js";

let adminToken;
let user1;
let user2;
let product;
let shipping;

const auth = (req, token) => req.set("Authorization", `Bearer ${token}`);

const placeOrder = async (token) => {
  await auth(request(app).post("/api/cart/items"), token).send({
    productId: product.id,
    quantity: 1,
  });
  return auth(request(app).post("/api/orders"), token).send({
    shippingMethodId: shipping.id,
    shippingAddress: "123 Nguyễn Trãi, TP.HCM",
    shippingPhone: "0901234567",
  });
};

beforeEach(async () => {
  await resetDatabase();
  const category = await createCategory();
  product = await createProduct({ categoryId: category.id, stockQuantity: 20 });
  shipping = await createShippingMethod({ fee: 30000 });
  adminToken = await createAdminToken(app);
  user1 = await registerUser(app, { username: "filter1", email: "filter1@test.vn" });
  user2 = await registerUser(app, { username: "filter2", email: "filter2@test.vn" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Admin xem danh sách đơn hàng", () => {
  test("lọc theo userId, status và khoảng ngày", async () => {
    await placeOrder(user1.token);
    await placeOrder(user2.token);

    const all = await auth(request(app).get("/api/admin/orders"), adminToken);
    const byUser = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      userId: user1.user.id,
    });
    const future = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      from: "2099-01-01",
    });
    const past = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      to: "2000-01-01",
    });
    const today = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      from: "2000-01-01",
      to: "2099-01-01",
    });

    expect(all.status).toBe(200);
    expect(all.body.data.pagination.total).toBe(2);
    expect(byUser.body.data.pagination.total).toBe(1);
    expect(byUser.body.data.items[0].userId).toBe(user1.user.id);
    expect(future.body.data.pagination.total).toBe(0);
    expect(past.body.data.pagination.total).toBe(0);
    expect(today.body.data.pagination.total).toBe(2);
  });

  test("lọc theo status sau khi admin đổi trạng thái", async () => {
    const order = await placeOrder(user1.token);

    await auth(
      request(app).patch(`/api/admin/orders/${order.body.data.id}/status`),
      adminToken,
    ).send({ status: "confirmed" });

    const pending = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      status: "pending",
    });
    const confirmed = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      status: "confirmed",
    });

    expect(pending.body.data.pagination.total).toBe(0);
    expect(confirmed.body.data.pagination.total).toBe(1);
  });

  test("status không hợp lệ trả 400", async () => {
    const res = await auth(request(app).get("/api/admin/orders"), adminToken).query({
      status: "khong-ton-tai",
    });

    expect(res.status).toBe(400);
  });

  test("customer không gọi được danh sách đơn admin", async () => {
    const res = await auth(request(app).get("/api/admin/orders"), user1.token);
    expect(res.status).toBe(403);
  });
});
