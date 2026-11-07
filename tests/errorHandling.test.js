import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/clients/prisma.client.js";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Xử lý lỗi và bảo mật thông báo", () => {
  test("JSON hỏng trả 400 đúng format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      status: "400",
      message: "Dữ liệu JSON không hợp lệ!",
      data: null,
    });
  });

  test("body quá lớn trả 413, không lộ message nội bộ của body-parser", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ account: "admin", password: "x".repeat(150 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body.status).toBe("413");
    expect(res.body.message).toBe("Dữ liệu gửi lên quá lớn!");
    expect(res.body.data).toBeNull();
  });

  test("id vượt giới hạn int4 bị chặn ở validator, không lộ lỗi Prisma", async () => {
    const res = await request(app).get("/api/products/999999999999999999999");
    const raw = JSON.stringify(res.body).toLowerCase();

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("400");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(raw).not.toContain("prisma");
    expect(raw).not.toContain("unable to fit");
  });

  test("page quá lớn bị chặn ở validator", async () => {
    const res = await request(app).get("/api/products").query({ page: "999999999999999999999" });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("prisma");
  });

  test("route không tồn tại trả 404 đúng format", async () => {
    const res = await request(app).get("/api/khong-ton-tai");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("404");
    expect(res.body.data).toBeNull();
  });
});
