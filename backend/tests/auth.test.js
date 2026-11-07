import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";
import { resetDatabase } from "./helpers/db.js";
import { registerUser } from "./helpers/api.js";

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("Bước 2 - Auth", () => {
  test("đăng ký thành công, không trả password và tự tạo giỏ hàng", async () => {
    const { res, user } = await registerUser(app);

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(user.username).toBe("khach1");
    expect(user.password).toBeUndefined();
    expect(user.role).toBe("customer");

    const cartCount = await prisma.cart.count({ where: { userId: user.id } });
    expect(cartCount).toBe(1);
  });

  test("đăng ký trùng username trả 400", async () => {
    await registerUser(app);
    const { res } = await registerUser(app, { email: "khac@test.vn" });

    expect(res.status).toBe(400);
    expect(res.body.data.field).toBe("username");
  });

  test("sai mật khẩu trả 401 với thông báo chung", async () => {
    await registerUser(app);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ account: "khach1", password: "sai-mat-khau" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Tài khoản hoặc mật khẩu không đúng!");
  });

  test("GET /api/auth/me cần token", async () => {
    const unauth = await request(app).get("/api/auth/me");
    expect(unauth.status).toBe(401);

    const { token } = await registerUser(app);
    const ok = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.username).toBe("khach1");
  });

  test("customer không được tạo sản phẩm (403)", async () => {
    const { token } = await registerUser(app);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: 1, name: "Hàng lậu", imageUrl: "https://example.com/a.png" });

    expect(res.status).toBe(403);
  });
});
