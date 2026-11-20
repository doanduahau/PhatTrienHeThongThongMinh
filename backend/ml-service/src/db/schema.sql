-- =============================================================================
-- SCHEMA DDL: HỆ THỐNG THÔNG MINH BÁN PHỤ KIỆN MÁY TÍNH (SUPABASE POSTGRESQL)
-- =============================================================================

-- 1. BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE
);

-- 1b. BẢNG THƯƠNG HIỆU SẢN PHẨM (BRANDS)
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    address TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT now()
);

-- Hàm sinh mã khoá chính dạng PREFIX-XXXX (đệm tối thiểu 4 số, không cắt khi vượt 9999).
-- Chỉ dùng cho các bảng KHÔNG phải đầu vào thuật toán ML.
CREATE OR REPLACE FUNCTION next_code(seq regclass, prefix text) RETURNS text
LANGUAGE sql VOLATILE AS $$
    SELECT prefix || lpad(v::text, GREATEST(4, length(v::text)), '0')
    FROM nextval(seq) AS v
$$;

-- 3. BẢNG PHƯƠNG THỨC VẬN CHUYỂN (SHIPPING_METHODS)
CREATE SEQUENCE IF NOT EXISTS shipping_methods_code_seq;
CREATE TABLE IF NOT EXISTS shipping_methods (
    id VARCHAR(20) PRIMARY KEY DEFAULT next_code('shipping_methods_code_seq', 'VC-'),
    name VARCHAR(100) NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0,
    estimated_days VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- 4. BẢNG SẢN PHẨM CHUNG (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

-- 5. BẢNG CHI TIẾT CHUỘT (MICE)
CREATE TABLE IF NOT EXISTS mice (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    connectivity VARCHAR(50) NOT NULL,
    hand_orientation VARCHAR(20) NOT NULL,
    weight_g NUMERIC NOT NULL,
    polling_rate_hz INTEGER NOT NULL DEFAULT 1000,
    switch_type VARCHAR(100),
    sensor VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

-- 6. BẢNG CHI TIẾT BÀN PHÍM (KEYBOARDS)
CREATE TABLE IF NOT EXISTS keyboards (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    connectivity VARCHAR(50) NOT NULL,
    layout VARCHAR(50) NOT NULL,
    has_rapid_trigger BOOLEAN DEFAULT false,
    has_hotswap BOOLEAN DEFAULT true,
    support_macos BOOLEAN DEFAULT false,
    polling_rate_hz INTEGER NOT NULL DEFAULT 1000,
    switch VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

-- 7. BẢNG CHI TIẾT TAI NGHE & SOUNDCARD (HEADPHONES)
CREATE TABLE IF NOT EXISTS headphones (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    connectivity VARCHAR(50) NOT NULL,
    headphone_type VARCHAR(50) NOT NULL,
    has_mic BOOLEAN DEFAULT true,
    has_anc BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- 8. BẢNG CHI TIẾT LÓT CHUỘT (MOUSEPADS)
CREATE TABLE IF NOT EXISTS mousepads (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    pad_type VARCHAR(50),
    mouse_control VARCHAR(50),
    speed VARCHAR(50),
    surface VARCHAR(100),
    base VARCHAR(100),
    size VARCHAR(50),
    created_at TIMESTAMP DEFAULT now()
);

-- 9. BẢNG CHI TIẾT SETUP (GHẾ, BÀN, ARM, PHỤ KIỆN) (SETUPS)
CREATE TABLE IF NOT EXISTS setups (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    setup_category VARCHAR(50) NOT NULL,
    max_load_kg INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

-- 10. BẢNG GIỎ HÀNG (CARTS)
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now()
);

-- 11. BẢNG CHI TIẾT GIỎ HÀNG (CART_ITEMS)
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT now()
);

-- 12. BẢNG ĐƠN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shipping_method_id VARCHAR(20) NOT NULL REFERENCES shipping_methods(id),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- 13. BẢNG CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- =============================================================================
-- INDEXES ĐỂ TỐI ƯU TRUY VẤN
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_id_product_id_key ON cart_items(cart_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
