const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

/**
 * Nạp DATABASE_URL của database test do scripts/prepareTestDb.js sinh ra (.env.test).
 * override: true để chắc chắn test không chạy nhầm vào database dev.
 */
const testEnvPath = path.join(__dirname, "..", ".env.test");

if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
}
