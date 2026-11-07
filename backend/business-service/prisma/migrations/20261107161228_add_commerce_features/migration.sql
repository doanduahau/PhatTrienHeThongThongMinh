-- AlterTable: thanh toán
ALTER TABLE "orders" ADD COLUMN "payment_method" VARCHAR(20) NOT NULL DEFAULT 'cod';
ALTER TABLE "orders" ADD COLUMN "payment_status" VARCHAR(20) NOT NULL DEFAULT 'unpaid';

-- AlterTable: tài khoản (xác thực email, khoá, token quên mật khẩu / xác thực)
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "reset_token_hash" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "reset_token_expires" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "verify_token_hash" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "verify_token_expires" TIMESTAMP(3);

-- CreateTable: nhận xét của người đã mua
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");
CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;