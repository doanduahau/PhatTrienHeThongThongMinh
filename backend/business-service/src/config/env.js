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

  // Múi giờ để hiển thị và gom nhóm thống kê. CSDL vẫn lưu UTC.
  appTimeZone: process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh",

  // ML service chạy nội bộ bằng uvicorn (xem ../ml-service/README.md)
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 1200),
  mlInternalToken: process.env.ML_INTERNAL_TOKEN || "",

  // Gửi mail (quên mật khẩu, xác thực email). Thiếu SMTP_HOST → in mail ra console.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "Gear Shop <no-reply@gearshop.vn>",
  appUrl: process.env.APP_URL || "http://localhost:3000",

  // Supabase Storage (upload ảnh sản phẩm). Thiếu → endpoint upload trả 503.
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET || "product-images",

  // Thông tin chuyển khoản hiển thị cho khách (tuỳ chọn)
  bankName: process.env.BANK_NAME || "",
  bankAccount: process.env.BANK_ACCOUNT || "",
  bankHolder: process.env.BANK_HOLDER || "",
};
