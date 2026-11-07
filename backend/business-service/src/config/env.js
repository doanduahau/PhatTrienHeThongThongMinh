import "dotenv/config";

/**
 * Đọc biến môi trường kèm giá trị mặc định.
 * Không commit credential thật; DATABASE_URL bắt buộc lấy từ file .env.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-doi-truoc-khi-len-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  databaseUrl: process.env.DATABASE_URL,

  // ML service chạy nội bộ bằng uvicorn (xem ../ml-service/README.md)
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 1200),
  mlInternalToken: process.env.ML_INTERNAL_TOKEN || "",
};
