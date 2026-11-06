module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/env.cjs"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  transform: {},
  testTimeout: 30000,
  verbose: true,
};
