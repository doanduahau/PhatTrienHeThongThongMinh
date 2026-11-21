-- Mã đơn hiển thị được (DH-XXXX) cho đơn hàng, theo đúng quy ước các bảng DG/NX/VC:
-- Int PK giữ nguyên vì orders/order_items là đầu vào của ML và model đã train.
-- `code` chỉ là khoá phụ phục vụ con người (admin tra, khách đối chiếu khi nhận hàng).

CREATE SEQUENCE "orders_code_seq";

ALTER TABLE "orders" ADD COLUMN "code" VARCHAR(20);

-- Ánh xạ tất định từ id cũ: 1 -> DH-0001 (cùng công thức với 3 bảng ở migration trước)
UPDATE "orders"
SET "code" = 'DH-' || lpad("id"::text, GREATEST(4, length("id"::text)), '0')
WHERE "code" IS NULL;

SELECT setval('"orders_code_seq"',
    COALESCE((SELECT MAX(split_part("code", '-', 2)::bigint) FROM "orders"), 0) + 1, false);

ALTER TABLE "orders" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "code"
    SET DEFAULT "next_code"('"orders_code_seq"', 'DH-');
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- Ngưng bán: ẩn khỏi storefront, tìm kiếm và dữ liệu ML; admin vẫn thấy để bật lại.
ALTER TABLE "products" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
