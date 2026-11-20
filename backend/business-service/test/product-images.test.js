import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/clients/prisma.client.js";
import { signToken } from "../src/services/auth.service.js";
import { updateProductSchema } from "../src/validators/product.validator.js";
import { UPLOAD_MAX_BYTES } from "../src/utils/constants.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkZkAAAAASUVORK5CYII=", "base64");
const adminToken = signToken({ id: 91, role: "admin" });
const customerToken = signToken({ id: 92, role: "customer" });
const authenticateFixture = (t) => {
  const original = prisma.user.findUnique;
  prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: where.id === 91 ? "admin" : "customer", isLocked: false });
  t.after(() => { prisma.user.findUnique = original; });
};
const post = () => request(app).post("/api/admin/uploads").auth(adminToken, { type: "bearer" });
after(async () => prisma.$disconnect());

test("link input returns a trimmed URL usable in product JSON without Storage", async (t) => {
  authenticateFixture(t);
  const original = env.supabaseServiceKey;
  env.supabaseServiceKey = "";
  t.after(() => { env.supabaseServiceKey = original; });
  const response = await post().send({ imageUrl: " https://example.test/product.png " });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { url: "https://example.test/product.png", source: "url" });
  assert.equal(updateProductSchema.safeParse({ imageUrl: response.body.data.url }).success, true);
  for (const imageUrl of ["", "not a url", "ftp://example.test/a.png", "data:image/png;base64,AAAA", "javascript:alert(1)"]) {
    assert.equal((await post().send({ imageUrl })).status, 400, imageUrl);
    assert.equal(updateProductSchema.safeParse({ imageUrl }).success, false, imageUrl);
  }
});

test("both image input methods require admin access", async (t) => {
  authenticateFixture(t);
  assert.equal((await request(app).post("/api/admin/uploads").send({ imageUrl: "https://example.test/a.png" })).status, 401);
  assert.equal((await request(app).post("/api/admin/uploads").auth(customerToken, { type: "bearer" }).attach("image", png, "a.png")).status, 403);
});

test("file input validates missing, ambiguous, unsupported and oversized files", async (t) => {
  authenticateFixture(t);
  assert.equal((await post().send({})).status, 400);
  assert.equal((await post().field("imageUrl", "https://example.test/a.png").attach("image", png, "a.png")).status, 400);
  assert.equal((await post().attach("image", Buffer.from("text"), "a.txt")).status, 400);
  assert.equal((await post().attach("image", Buffer.alloc(UPLOAD_MAX_BYTES + 1), "large.png")).status, 400);
  const original = env.supabaseServiceKey;
  env.supabaseServiceKey = "";
  t.after(() => { env.supabaseServiceKey = original; });
  assert.equal((await post().attach("image", png, "a.png")).status, 503);
});

test("file input uploads to Storage and returns a public URL usable as imageUrl", async (t) => {
  authenticateFixture(t);
  let uploaded;
  // Local fake Storage server: no external upload or database writes.
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    uploaded = { method: req.method, path: req.url, body: Buffer.concat(chunks) };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ Key: "product-images/test.png" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const original = { supabaseUrl: env.supabaseUrl, supabaseServiceKey: env.supabaseServiceKey, supabaseBucket: env.supabaseBucket };
  Object.assign(env, { supabaseUrl: `http://127.0.0.1:${server.address().port}`, supabaseServiceKey: "test-key", supabaseBucket: "product-images" });
  t.after(() => Object.assign(env, original));
  const response = await post().attach("image", png, { filename: "photo.png", contentType: "image/png" });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const { data } = response.body;
  assert.equal(data.source, "upload");
  assert.equal(data.contentType, "image/png");
  assert.equal(data.size, png.length);
  assert.match(data.path, /^products\/.+\.png$/);
  assert.equal(data.url, `${env.supabaseUrl}/storage/v1/object/public/product-images/${data.path}`);
  assert.equal(uploaded.method, "POST");
  assert.equal(uploaded.path, `/storage/v1/object/product-images/${data.path}`);
  assert(uploaded.body.includes(png));
  assert.equal(updateProductSchema.safeParse({ imageUrl: data.url }).success, true);
});
