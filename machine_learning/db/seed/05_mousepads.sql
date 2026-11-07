-- =============================================================================
-- SEED DATA: LÓT CHUỘT (MOUSEPADS) (18 SẢN PHẨM)
-- =============================================================================

-- 1. Insert vào bảng products
INSERT INTO products (id, category_id, brand_id, name, color, stock_quantity, image_url, price, rating, created_at) VALUES
  (388, 9, 1, 'Logitech G640 Large Cloth Black', 'Black', 45, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 690000.00, 4.70, '2026-11-05 23:25:55.542617'),
  (389, 9, 1, 'Logitech G840 XL Cloth Black', 'Black', 30, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 990000.00, 4.70, '2026-11-05 23:25:55.542617'),
  (390, 9, 2, 'Razer Gigantus V2 Medium Black', 'Black', 60, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 390000.00, 4.00, '2026-11-05 23:25:55.542617'),
  (391, 9, 2, 'Razer Strider Hybrid Large Black', 'Black', 35, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 890000.00, 4.80, '2026-11-05 23:25:55.542617'),
  (392, 9, 7, 'SteelSeries QcK Heavy Large Black', 'Black', 55, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 590000.00, 4.50, '2026-11-05 23:25:55.542617'),
  (393, 9, 7, 'SteelSeries QcK Prism RGB XL Black', 'Black', 20, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 1190000.00, 4.90, '2026-11-05 23:25:55.542617'),
  (394, 9, 5, 'Zowie G-SR-SE Rouge Large', 'Đỏ', 25, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 890000.00, 4.80, '2026-11-05 23:25:55.542617'),
  (395, 9, 5, 'Zowie GTF-X Speed Large Black', 'Black', 30, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 790000.00, 4.90, '2026-11-05 23:25:55.542617'),
  (396, 9, 66, 'Artisan Hien Soft XL Black', 'Black', 15, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 1290000.00, 4.50, '2026-11-05 23:25:55.542617'),
  (397, 9, 66, 'Artisan Zero Soft XL Black', 'Black', 15, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 1290000.00, 4.90, '2026-11-05 23:25:55.542617'),
  (398, 9, 67, 'LGG Saturn Pro XL Black', 'Black', 12, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 1490000.00, 4.60, '2026-11-05 23:25:55.542617'),
  (399, 9, 67, 'LGG Venus Pro XL White', 'White', 10, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 1490000.00, 4.10, '2026-11-05 23:25:55.542617'),
  (400, 9, 68, 'VXE Sirius Wireless Charging Pad Black', 'Black', 35, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 690000.00, 4.50, '2026-11-05 23:25:55.542617'),
  (401, 9, 20, 'HyperX Fury S Pro XL Black', 'Black', 50, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 490000.00, 4.10, '2026-11-05 23:25:55.542617'),
  (402, 9, 19, 'Corsair MM350 Pro XL Black', 'Black', 40, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 590000.00, 4.70, '2026-11-05 23:25:55.542617'),
  (403, 9, 3, 'Pulsar Superglide Glass XL White', 'White', 18, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 1390000.00, 4.30, '2026-11-05 23:25:55.542617'),
  (404, 9, 69, 'Xraypad Aqua Control Plus XL Black', 'Black', 45, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 550000.00, 4.60, '2026-11-05 23:25:55.542617'),
  (405, 9, 69, 'Xraypad Equate Plus XL Grey', 'Grey', 40, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7', 550000.00, 4.80, '2026-11-05 23:25:55.542617')
ON CONFLICT (id) DO UPDATE SET brand_id = EXCLUDED.brand_id;

-- 2. Insert vào bảng chi tiết mousepads
INSERT INTO mousepads (id, product_id, pad_type, mouse_control, speed, surface, base, size, created_at) VALUES
  (1, 388, 'control', 'high', 'medium', 'cloth', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (2, 389, 'control', 'high', 'medium', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617'),
  (3, 390, 'control', 'medium', 'medium', 'cloth', 'rubber', 'M', '2026-11-05 23:25:55.542617'),
  (4, 391, 'hybrid', 'medium', 'fast', 'hybrid', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (5, 392, 'control', 'high', 'slow', 'cloth', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (6, 393, 'control', 'medium', 'medium', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617'),
  (7, 394, 'control', 'high', 'slow', 'cloth', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (8, 395, 'speed', 'low', 'fast', 'cloth', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (9, 396, 'speed', 'medium', 'fast', 'cloth', 'poron', 'XL', '2026-11-05 23:25:55.542617'),
  (10, 397, 'control', 'high', 'slow', 'cloth', 'poron', 'XL', '2026-11-05 23:25:55.542617'),
  (11, 398, 'control', 'high', 'slow', 'cloth', 'poron', 'XL', '2026-11-05 23:25:55.542617'),
  (12, 399, 'speed', 'low', 'fast', 'cloth', 'poron', 'XL', '2026-11-05 23:25:55.542617'),
  (13, 400, 'hybrid', 'medium', 'medium', 'hybrid', 'rubber', 'L', '2026-11-05 23:25:55.542617'),
  (14, 401, 'control', 'medium', 'medium', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617'),
  (15, 402, 'control', 'medium', 'medium', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617'),
  (16, 403, 'speed', 'low', 'fast', 'glass', 'silicone', 'XL', '2026-11-05 23:25:55.542617'),
  (17, 404, 'control', 'high', 'slow', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617'),
  (18, 405, 'control', 'high', 'slow', 'cloth', 'rubber', 'XL', '2026-11-05 23:25:55.542617')
ON CONFLICT (id) DO NOTHING;
