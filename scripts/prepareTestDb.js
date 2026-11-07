import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const TEST_DB = "gear_shop_test";
const baseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/gear_shop?schema=public";

const run = (command, options = {}) =>
  execSync(command, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });

/** Tên DB duy nhất cho mỗi lần chạy để hai người/CI không đụng nhau */
export const buildTestDbName = () =>
  process.env.TEST_DB_NAME || `${TEST_DB}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

export const getTestDbUrls = (dbName) => {
  const testUrl = new URL(baseUrl);
  testUrl.pathname = `/${dbName}`;

  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";

  return { testUrl: testUrl.toString(), adminUrl: adminUrl.toString() };
};

const executeAdminSql = (adminUrl, sql) =>
  run(`npx prisma db execute --url "${adminUrl}" --stdin`, { input: sql });

/** Tạo database test và chạy migration. Trả về URL để truyền cho Jest. */
export const prepareTestDb = (dbName = buildTestDbName()) => {
  const { testUrl, adminUrl } = getTestDbUrls(dbName);

  try {
    executeAdminSql(adminUrl, `CREATE DATABASE "${dbName}"`);
    console.log(`[TEST] Đã tạo database ${dbName}`);
  } catch (error) {
    const message = `${error.stdout || ""}${error.stderr || ""}`;
    if (!message.includes("already exists")) {
      console.error("[TEST] Không tạo được database test:", message.trim());
      throw error;
    }
  }

  try {
    run("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: testUrl },
    });
  } catch (error) {
    console.error(
      "[TEST] migrate deploy thất bại:",
      `${error.stdout || ""}${error.stderr || ""}`.trim(),
    );
    throw error;
  }

  console.log(`[TEST] Database test sẵn sàng: ${dbName} @ ${new URL(testUrl).host}`);
  return { dbName, testUrl, adminUrl };
};

/** Xoá database test sau khi chạy xong (kể cả khi test fail) */
export const dropTestDb = (adminUrl, dbName) => {
  try {
    executeAdminSql(adminUrl, `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    console.log(`[TEST] Đã xoá database ${dbName}`);
  } catch (error) {
    console.warn(
      `[TEST] Không xoá được database ${dbName}:`,
      `${error.stdout || ""}${error.stderr || ""}`.trim(),
    );
  }
};
