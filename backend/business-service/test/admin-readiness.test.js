import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prisma } from "../src/clients/prisma.client.js";
import { updateProductSchema } from "../src/validators/product.validator.js";
import { adminOrdersQuerySchema } from "../src/validators/order.validator.js";
import { revenueQuerySchema } from "../src/validators/stats.validator.js";
import { update as updateCategory } from "../src/services/category.service.js";
import { hashPassword, login } from "../src/services/auth.service.js";

after(async () => prisma.$disconnect());

// Prisma delegates are proxies, so replace and restore their functions explicitly.
const stub = (t, target, method, implementation) => {
  const original = target[method];
  const replacement = t.mock.fn(implementation);
  target[method] = replacement;
  t.after(() => { target[method] = original; });
  return replacement;
};

test("product form distinguishes omitted fields, explicit zero, and blank inputs", () => {
  assert.deepEqual(updateProductSchema.parse({ name: "Updated" }), { name: "Updated" });
  assert.deepEqual(updateProductSchema.parse({ price: "0", stockQuantity: 0 }), { price: 0, stockQuantity: 0 });
  for (const value of ["", "  ", null, false, []]) {
    assert.equal(updateProductSchema.safeParse({ price: value }).success, false);
    assert.equal(updateProductSchema.safeParse({ stockQuantity: value }).success, false);
  }
  assert.equal(updateProductSchema.safeParse({ stockQuantity: 2147483648 }).success, false);
});

for (const [name, schema] of [["orders", adminOrdersQuerySchema], ["revenue", revenueQuerySchema]]) {
  test(`${name} rejects impossible dates and reversed ranges, accepts leap days and same-day ranges`, () => {
    for (const input of [{ from: "2026-02-30" }, { to: "2025-02-29" }, { from: "20/11/2026" },
      { from: "2026-12-01", to: "2026-01-01" }]) {
      assert.equal(schema.safeParse(input).success, false, JSON.stringify(input));
    }
    assert.equal(schema.safeParse({ from: "2024-02-29", to: "2024-02-29" }).success, true);
    assert.equal(schema.safeParse({ from: "2026-11-20" }).success, true);
    assert.equal(schema.safeParse({}).success, true);
  });
}

test("category slug cannot break the detail mapping; display name remains editable", async (t) => {
  stub(t, prisma.category, "findUnique", async () => ({ id: 1, slug: "chuot", name: "Mouse" }));
  const update = stub(t, prisma.category, "update", async ({ data }) => ({ id: 1, ...data }));
  await assert.rejects(updateCategory(1, { slug: "mouse" }), (error) => error.httpStatus === 400);
  assert.equal(update.mock.callCount(), 0);
  const result = await updateCategory(1, { slug: "chuot", name: "Updated" });
  assert.equal(result.name, "Updated");
  assert.equal(update.mock.callCount(), 1);
});

test("login returns public fields while retaining role and token for the admin UI", async (t) => {
  const password = await hashPassword("test-password");
  stub(t, prisma.user, "findFirst", async () => ({
    id: 1, username: "fixture", email: "fixture@example.test", address: null,
    role: "admin", emailVerified: true, createdAt: new Date(), password, isLocked: false,
    resetTokenHash: "private", verifyTokenHash: "private", resetTokenExpires: new Date(), verifyTokenExpires: new Date(),
  }));
  const result = await login({ account: "fixture", password: "test-password" });
  assert.deepEqual(Object.keys(result.user).sort(), ["id", "username", "email", "address", "role", "emailVerified", "createdAt"].sort());
  assert.equal(result.user.role, "admin");
  assert.equal(typeof result.token, "string");
  await assert.rejects(login({ account: "fixture", password: "wrong-password" }), (error) => error.httpStatus === 401);
});
