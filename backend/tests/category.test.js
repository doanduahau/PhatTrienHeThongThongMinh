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

describe("CRUD danh mục", () => {
  test("admin tạo, sửa, xoá danh mục", async () => {
    const created = await auth(request(app).post("/api/categories"), adminToken).send({
      name: "Danh mục test",
      slug: "danh-muc-test",
    });
    expect(created.status).toBe(200);
    expect(created.body.data.slug).toBe("danh-muc-test");

    const updated = await auth(
      request(app).put(`/api/categories/${created.body.data.id}`),
      adminToken,
    ).send({ name: "Đã đổi tên" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Đã đổi tên");

    const removed = await auth(
      request(app).delete(`/api/categories/${created.body.data.id}`),
      adminToken,
    );
    expect(removed.status).toBe(200);
    expect(await prisma.category.findUnique({ where: { id: created.body.data.id } })).toBeNull();
  });

  test("customer không được tạo/sửa/xoá danh mục", async () => {
    const create = await auth(request(app).post("/api/categories"), customerToken).send({
      name: "Không được",
      slug: "khong-duoc",
    });
    expect(create.status).toBe(403);
  });

  test("trùng slug trả 400", async () => {
    const created = await auth(request(app).post("/api/categories"), adminToken).send({
      name: "Trùng",
      slug: "trung-slug",
    });
    expect(created.status).toBe(200);

    const duplicate = await auth(request(app).post("/api/categories"), adminToken).send({
      name: "Trùng 2",
      slug: "trung-slug",
    });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.message).toContain("đã tồn tại");
  });

  test("xoá danh mục đang có sản phẩm trả 400", async () => {
    const category = await createCategory("co-san-pham", "Có sản phẩm");
    await createProduct({ categoryId: category.id });

    const res = await auth(request(app).delete(`/api/categories/${category.id}`), adminToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("đang được sử dụng");
  });

  test("sửa/xoá danh mục không tồn tại trả 404", async () => {
    const update = await auth(request(app).put("/api/categories/999999"), adminToken).send({
      name: "Không có",
    });
    const remove = await auth(request(app).delete("/api/categories/999999"), adminToken);

    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
