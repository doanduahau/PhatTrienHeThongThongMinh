import "dotenv/config";

/**
 * Đọc biến môi trường kèm giá trị mặc định.
 * Không validate env bằng Zod/Joi (anti-pattern mục 5 của express-backend.md).
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-doi-truoc-khi-len-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  databaseUrl: process.env.DATABASE_URL || "",
};
