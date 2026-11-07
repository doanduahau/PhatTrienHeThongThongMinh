import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory, createProduct, createShippingMethod } from "./helpers/db.js";
import { registerUser, createAdminToken } from "./helpers/api.js";

let adminToken;
let userToken;
let product;
let shipping;

const auth = (req, token) => req.set("Authorization", `Bearer ${token}`);

const addToCart = (token, quantity = 1, productId = product.id) =>
  auth(request(app).post("/api/cart/items"), token).send({ productId, quantity });

const checkout = (token) =>
  auth(request(app).post("/api/orders"), token).send({
    shippingMethodId: shipping.id,
    shippingAddress: "123 Nguyễn Trãi, TP.HCM",
    shippingPhone: "0901234567",
  });

const createOrder = async (quantity = 2) => {
  await addToCart(userToken, quantity);
  const res = await checkout(userToken);
  expect(res.status).toBe(200);
  return res.body.data;
};

beforeEach(async () => {
  await resetDatabase();
  const category = await createCategory();
  product = await createProduct({ categoryId: category.id, stockQuantity: 100 });
  shipping = await createShippingMethod({ fee: 30000 });
  adminToken = await createAdminToken(app);
  ({ token: userToken } = await registerUser(app));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("An toàn khi chạy đồng thời", () => {
  test("hai request admin huỷ cùng lúc chỉ hoàn kho một lần", async () => {
    const order = await createOrder(2);
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity).toBe(98);

    const [first, second] = await Promise.all([
      auth(request(app).patch(`/api/admin/orders/${order.id}/status`), adminToken).send({
        status: "cancelled",
      }),
      auth(request(app).patch(`/api/admin/orders/${order.id}/status`), adminToken).send({
        status: "cancelled",
      }),
    ]);

    const successCount = [first, second].filter((res) => res.status === 200).length;
    const stock = (await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity;
    const saved = await prisma.order.findUnique({ where: { id: order.id } });

    expect(successCount).toBe(1);
    expect(stock).toBe(100);
    expect(saved.status).toBe("cancelled");
  });

  test("hai request khách huỷ cùng lúc chỉ hoàn kho một lần", async () => {
    const order = await createOrder(2);

    const [first, second] = await Promise.all([
      auth(request(app).patch(`/api/orders/${order.id}/cancel`), userToken),
      auth(request(app).patch(`/api/orders/${order.id}/cancel`), userToken),
    ]);

    const successCount = [first, second].filter((res) => res.status === 200).length;
    const stock = (await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity;

    expect(successCount).toBe(1);
    expect(stock).toBe(100);
  });

  test("nhiều request thêm giỏ cùng lúc không mất cập nhật", async () => {
    await addToCart(userToken, 1);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => addToCart(userToken, 1)),
    );
    const row = await prisma.cartItem.findFirst({ where: { productId: product.id } });

    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(row.quantity).toBe(6);
  });

  test("hai request thêm mới cùng lúc vẫn chỉ tạo một dòng giỏ", async () => {
    const [first, second] = await Promise.all([
      addToCart(userToken, 1),
      addToCart(userToken, 1),
    ]);

    const rows = await prisma.cartItem.findMany({ where: { productId: product.id } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);
  });

  test("hai khách checkout cùng lúc không bán vượt tồn kho", async () => {
    const other = await registerUser(app, { username: "khach2", email: "khach2@test.vn" });
    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } });

    await addToCart(userToken, 1);
    await addToCart(other.token, 1);

    const [first, second] = await Promise.all([checkout(userToken), checkout(other.token)]);

    const successCount = [first, second].filter((res) => res.status === 200).length;
    const stock = (await prisma.product.findUnique({ where: { id: product.id } })).stockQuantity;

    expect(successCount).toBe(1);
    expect(stock).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });
});
