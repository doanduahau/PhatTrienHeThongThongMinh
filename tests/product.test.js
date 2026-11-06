import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase, createCategory } from "./helpers/db.js";
import { createAdminToken } from "./helpers/api.js";

let adminToken;
let category;

beforeEach(async () => {
  await resetDatabase();
  adminToken = await createAdminToken(app);
  category = await createCategory("chuot", "Chuột");
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validMouseProduct = () => ({
  categoryId: category.id,
  name: "Chuột test",
  price: 500000,
  stockQuantity: 5,
  imageUrl: "https://example.com/mouse.png",
  detail: {
    brand: "TestBrand",
    connectivity: "wireless",
    handOrientation: "symmetrical",
    weightG: 60,
  },
});

describe("Bước 3 + 4 - Product", () => {
  test("admin tạo sản phẩm kèm thông số chi tiết", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validMouseProduct());

    expect(res.status).toBe(200);
    expect(res.body.data.detail.brand).toBe("TestBrand");
    expect(res.body.data.detail.pollingRateHz).toBe(1000);
  });

  test("thiếu thông số chi tiết thì rollback, không tạo sản phẩm rác", async () => {
    const payload = validMouseProduct();
    delete payload.detail.brand;

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });

  test("getById trả kèm detail đúng loại", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validMouseProduct());

    const res = await request(app).get(`/api/products/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.detail.sensor).toBeNull();
    expect(res.body.data.category.slug).toBe("chuot");
  });

  test("danh sách có lọc, tìm kiếm và phân trang", async () => {
    await request(app).post("/api/products").set("Authorization", `Bearer ${adminToken}`).send(validMouseProduct());
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validMouseProduct(), name: "Bàn phím test", categoryId: (await createCategory("ban-phim", "Bàn phím")).id, detail: { brand: "X", connectivity: "wired", layout: "TKL" } });

    const filtered = await request(app).get("/api/products").query({ search: "chuột", page: 1, limit: 10 });
    const all = await request(app).get("/api/products").query({ page: 1, limit: 10 });
    const paged = await request(app).get("/api/products").query({ page: 2, limit: 1 });

    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items).toHaveLength(1);
    // total luôn tính trên tập đã lọc
    expect(filtered.body.data.pagination.total).toBe(1);
    expect(all.body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.data.pagination.page).toBe(2);
  });

  test("page không hợp lệ trả 400", async () => {
    const res = await request(app).get("/api/products").query({ page: 0 });
    expect(res.status).toBe(400);
  });

  test("không cho đổi danh mục khi đã có thông số chi tiết", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validMouseProduct());
    const keyboardCategory = await createCategory("ban-phim", "Bàn phím");

    const res = await request(app)
      .put(`/api/products/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ categoryId: keyboardCategory.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Không thể đổi danh mục");
  });

  test("cập nhật thông số chi tiết giữ nguyên sản phẩm", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validMouseProduct());

    const res = await request(app)
      .put(`/api/products/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 450000, detail: { ...validMouseProduct().detail, weightG: 55 } });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.price)).toBe(450000);
    expect(Number(res.body.data.detail.weightG)).toBe(55);
  });
});
