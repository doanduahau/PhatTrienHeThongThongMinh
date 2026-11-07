import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildTestDbName,
  dropTestDb,
  getTestDbUrls,
  prepareTestDb,
} from "./prepareTestDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbName = buildTestDbName();

let prepared;
try {
  prepared = prepareTestDb(dbName);
} catch {
  dropTestDb(getTestDbUrls(dbName).adminUrl, dbName);
  process.exit(1);
}

let status = 1;
try {
  const jestBin = path.join(__dirname, "..", "node_modules", "jest", "bin", "jest.js");
  const result = spawnSync(process.execPath, [jestBin, "--runInBand", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --experimental-vm-modules`.trim(),
      DATABASE_URL: prepared.testUrl,
    },
  });

  if (result.error) {
    console.error("[TEST] Không chạy được Jest:", result.error);
  }
  status = result.status ?? 1;
} finally {
  dropTestDb(prepared.adminUrl, prepared.dbName);
}

process.exit(status);
