-- Thêm trường họ và tên (full_name) cho người dùng
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(100);
