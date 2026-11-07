const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

/**
 * Khi chạy `npm test`, scripts/testRunner.js truyền DATABASE_URL trực tiếp.
 * File .env.test chỉ dùng khi chạy Jest thủ công ngoài testRunner.
 */
const testEnvPath = path.join(__dirname, "..", ".env.test");

// scripts/testRunner.js truyền DATABASE_URL trực tiếp; chỉ đọc .env.test khi chạy Jest thủ công.
if (!process.env.DATABASE_URL && fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
}
