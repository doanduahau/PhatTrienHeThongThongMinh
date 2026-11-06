import request from "supertest";
import { prisma } from "../../src/clients/prisma.client.js";

export const registerUser = async (app, overrides = {}) => {
  const payload = {
    username: "khach1",
    email: "khach1@test.vn",
    password: "123456",
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  return { res, payload, token: res.body?.data?.token, user: res.body?.data?.user };
};

export const createAdminToken = async (app) => {
  await registerUser(app, { username: "quanTri", email: "quantri@test.vn", password: "123456" });
  await prisma.user.update({ where: { username: "quanTri" }, data: { role: "admin" } });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ account: "quanTri", password: "123456" });

  return login.body?.data?.token;
};
