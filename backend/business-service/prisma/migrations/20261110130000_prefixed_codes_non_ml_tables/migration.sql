-- Khoá chính dạng mã người-đọc-được cho 3 bảng mà ML KHÔNG truy vấn:
--   ratings -> DG-XXXX, reviews -> NX-XXXX, shipping_methods -> VC-XXXX
-- 12 bảng còn lại (products, categories, brands, mice, keyboards, headphones,
-- mousepads, setups, orders, order_items, carts, cart_items) GIỮ NGUYÊN Int vì
-- chúng là dữ liệu đầu vào của các thuật toán ML và model đã train.
--
-- Mã cũ N được ánh xạ tất định sang PREFIX-lpad(N): 1 -> VC-0001. Nhờ vậy khoá
-- ngoại orders.shipping_method_id remap bằng cùng công thức, không cần JOIN.

-- nextval() chỉ được gọi một lần. GREATEST giữ mã dài ra thay vì bị cắt ở 9999.
CREATE FUNCTION "next_code"("seq" regclass, "prefix" text) RETURNS text
LANGUAGE sql VOLATILE AS $$
    SELECT "prefix" || lpad("v"::text, GREATEST(4, length("v"::text)), '0')
    FROM nextval("seq") AS "v"
$$;

-- 1. ratings -> DG-XXXX
ALTER TABLE "ratings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ratings" ALTER COLUMN "id" TYPE VARCHAR(20)
    USING ('DG-' || lpad("id"::text, GREATEST(4, length("id"::text)), '0'));
CREATE SEQUENCE "ratings_code_seq";
SELECT setval('"ratings_code_seq"',
    COALESCE((SELECT MAX(split_part("id", '-', 2)::bigint) FROM "ratings"), 0) + 1, false);
ALTER TABLE "ratings" ALTER COLUMN "id"
    SET DEFAULT "next_code"('"ratings_code_seq"', 'DG-');
DROP SEQUENCE "ratings_id_seq";

-- 2. reviews -> NX-XXXX
ALTER TABLE "reviews" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "reviews" ALTER COLUMN "id" TYPE VARCHAR(20)
    USING ('NX-' || lpad("id"::text, GREATEST(4, length("id"::text)), '0'));
CREATE SEQUENCE "reviews_code_seq";
SELECT setval('"reviews_code_seq"',
    COALESCE((SELECT MAX(split_part("id", '-', 2)::bigint) FROM "reviews"), 0) + 1, false);
ALTER TABLE "reviews" ALTER COLUMN "id"
    SET DEFAULT "next_code"('"reviews_code_seq"', 'NX-');
DROP SEQUENCE "reviews_id_seq";

-- 3. shipping_methods -> VC-XXXX (khoá ngoại từ orders phải remap cùng công thức)
ALTER TABLE "orders" DROP CONSTRAINT "orders_shipping_method_id_fkey";
ALTER TABLE "shipping_methods" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shipping_methods" ALTER COLUMN "id" TYPE VARCHAR(20)
    USING ('VC-' || lpad("id"::text, GREATEST(4, length("id"::text)), '0'));
ALTER TABLE "orders" ALTER COLUMN "shipping_method_id" TYPE VARCHAR(20)
    USING ('VC-' || lpad("shipping_method_id"::text, GREATEST(4, length("shipping_method_id"::text)), '0'));
CREATE SEQUENCE "shipping_methods_code_seq";
SELECT setval('"shipping_methods_code_seq"',
    COALESCE((SELECT MAX(split_part("id", '-', 2)::bigint) FROM "shipping_methods"), 0) + 1, false);
ALTER TABLE "shipping_methods" ALTER COLUMN "id"
    SET DEFAULT "next_code"('"shipping_methods_code_seq"', 'VC-');
DROP SEQUENCE "shipping_methods_id_seq";
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_method_id_fkey"
    FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;