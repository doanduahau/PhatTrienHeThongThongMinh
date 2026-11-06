import "dotenv/config";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DB = "gear_shop_test";
const baseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/gear_shop?schema=public";

const testUrl = new URL(baseUrl);
testUrl.pathname = `/${TEST_DB}`;

const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";

const run = (command, options = {}) =>
  execSync(command, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });

// 1. Tạo database test nếu chưa có (lỗi "already exists" thì bỏ qua)
try {
  run(`npx prisma db execute --url "${adminUrl.toString()}" --stdin`, {
    input: `CREATE DATABASE "${TEST_DB}"`,
  });
  console.log(`[TEST] Đã tạo database ${TEST_DB}`);
} catch (error) {
  const message = `${error.stdout || ""}${error.stderr || ""}`;
  if (!message.includes("already exists")) {
    console.error("[TEST] Không tạo được database test:", message.trim());
    process.exit(1);
  }
}

// 2. Áp dụng migration lên database test
try {
  run("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
  });
} catch (error) {
  console.error("[TEST] migrate deploy thất bại:", `${error.stdout || ""}${error.stderr || ""}`.trim());
  process.exit(1);
}

// 3. Ghi URL test để jest setup nạp (tránh hardcode cổng trong package.json)
writeFileSync(path.join(__dirname, "..", ".env.test"), `DATABASE_URL="${testUrl.toString()}"\n`, "utf8");

console.log(`[TEST] Database test sẵn sàng: ${TEST_DB} @ ${testUrl.host}`);
