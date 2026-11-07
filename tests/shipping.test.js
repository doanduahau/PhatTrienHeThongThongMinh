import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct } from "./helpers/db.js";
import { registerUser, createAdminToken } from "./helpers/api.js";

let adminToken;
let customerToken;

beforeEach(async () => {
  await resetDatabase();
  adminToken = await createAdminToken(app);
  ({ token: customerToken } = await registerUser(app));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (req, token) => req.set("Authorization", `Bearer ${token}`);

const createShipping = (overrides = {}) =>
  auth(request(app).post("/api/shipping-methods"), adminToken).send({
    name: "Phương thức test",
    fee: 25000,
    estimatedDays: "2-3 ngày",
    ...overrides,
  });

describe("CRUD phương thức vận chuyển", () => {
  test("khách chỉ thấy phương thức đang hoạt động, admin thấy tất cả", async () => {
    const active = await createShipping({ name: "Đang hoạt động", isActive: true });
    const hidden = await createShipping({ name: "Đã tắt", isActive: false });

    const guest = await request(app).get("/api/shipping-methods");
    const admin = await auth(request(app).get("/api/shipping-methods"), adminToken);

    expect(guest.status).toBe(200);
    expect(guest.body.data.some((item) => item.id === active.body.data.id)).toBe(true);
    expect(guest.body.data.some((item) => item.id === hidden.body.data.id)).toBe(false);
    expect(admin.body.data.some((item) => item.id === hidden.body.data.id)).toBe(true);
  });

  test("token không hợp lệ trên endpoint công khai trả 401", async () => {
    const res = await request(app)
      .get("/api/shipping-methods")
      .set("Authorization", "Bearer token-sai");

    expect(res.status).toBe(401);
  });

  test("admin tạo, sửa, xoá phương thức vận chuyển", async () => {
    const created = await createShipping();
    expect(created.status).toBe(200);

    const updated = await auth(
      request(app).put(`/api/shipping-methods/${created.body.data.id}`),
      adminToken,
    ).send({ fee: 50000 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.fee).toBe(50000);

    const removed = await auth(
      request(app).delete(`/api/shipping-methods/${created.body.data.id}`),
      adminToken,
    );
    expect(removed.status).toBe(200);
  });

  test("xoá phương thức đã dùng trong đơn trả 400", async () => {
    const category = await createCategory();
    const product = await createProduct({ categoryId: category.id, stockQuantity: 5 });
    const shipping = await createShipping();

    await auth(request(app).post("/api/cart/items"), customerToken).send({
      productId: product.id,
      quantity: 1,
    });
    const checkout = await auth(request(app).post("/api/orders"), customerToken).send({
      shippingMethodId: shipping.body.data.id,
      shippingAddress: "123 Nguyễn Trãi, TP.HCM",
      shippingPhone: "0901234567",
    });
    expect(checkout.status).toBe(200);

    const res = await auth(
      request(app).delete(`/api/shipping-methods/${shipping.body.data.id}`),
      adminToken,
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("đang được sử dụng");
  });

  test("customer không được CRUD phương thức vận chuyển", async () => {
    const res = await auth(request(app).post("/api/shipping-methods"), customerToken).send({
      name: "Không được",
      fee: 1000,
    });

    expect(res.status).toBe(403);
  });
});
