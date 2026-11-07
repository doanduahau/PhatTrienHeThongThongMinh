# Backend Shop Gear Gaming

API Express + Prisma cho shop bán chuột, bàn phím, tai nghe, lót chuột và setup.
Kiến trúc và quy ước code theo `../../docs/express-backend.md`; hướng dẫn tổng thể 2 service
(backend + ML) ở `../../docs/Agents.md`.

## 1. Yêu cầu

- Node.js 20+
- PostgreSQL 16 (Supabase hoặc PostgreSQL cài sẵn — không cần Docker)
- Python 3.11+ và `venv` nếu muốn chạy ML service (`../ml-service/`)

## 2. Chạy lần đầu

```bash
npm install
cp .env.example .env        # trỏ DATABASE_URL tới PostgreSQL/Supabase
npx prisma migrate deploy   # tạo bảng
npm run seed                # dữ liệu mẫu
npm run dev                 # http://localhost:3000
```

Kiểm tra server sống: `GET /api/health`.

**Tài khoản demo:** admin `admin` / `admin123` · khách `khachhang1` / `123456`.

### Làm việc nhóm

- Chỉ commit `.env.example`, **không** commit `.env` và `.env.test` (đã có trong `.gitignore`).
- Mỗi người tự cấu hình `DATABASE_URL` trong `.env` (Supabase hoặc PostgreSQL local).
- Không dùng Docker cho service; backend chạy trực tiếp bằng `node_modules`.
- Luồng làm việc gợi ý: mỗi người một nhánh `feat/<việc>`, tự kiểm tra API trước khi mở PR.

## 3. Lệnh thường dùng

| Lệnh | Việc |
| :--- | :--- |
| `npm run dev` | Chạy server với nodemon |
| `npm start` | Chạy server production |
| `npm run prisma:migrate` | Tạo migration mới khi sửa schema |
| `npm run prisma:studio` | Xem dữ liệu bằng Prisma Studio |
| `npm run prisma:reset` | Xoá và seed lại toàn bộ dữ liệu dev |

## 4. Cấu trúc

```text
prisma/            schema.prisma, migrations, seed.js
src/
  clients/         prisma.client.js (singleton), ml.client.js (HTTP tới ML)
  config/          env.js
  controllers/     nhận req, validate, gọi service, trả res
  middlewares/     auth.middleware.js (authenticate, requireAdmin)
  routes/          khai báo method + path
  services/        nghiệp vụ + truy vấn Prisma (không đụng req/res)
  utils/           response.js, AppError.js, constants.js, money.js, productDetail.js
  validators/      schema Zod
  app.js           cấu hình Express
server.js          app.listen
```

> Thư mục `tests/` chưa có; bộ test sẽ được viết lại sau bằng công cụ khác.

## 5. API

Quy ước response:

```json
{ "status": "200", "message": "Thành công!", "data": {} }
```

Mọi API cần đăng nhập dùng header `Authorization: Bearer <token>`.
Giá trị tiền/rating/decimal được trả về dạng **number** (ví dụ `4590000`, `4.8`), không phải string.
`pagination.totalPages` luôn tối thiểu là `1` kể cả khi không có bản ghi.

### Auth

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | — | `{ username, email, password, address? }` |
| POST | `/api/auth/login` | — | `{ account, password }` (username hoặc email) |
| GET | `/api/auth/me` | Đăng nhập | Hồ sơ của mình |

### Danh mục, thương hiệu & sản phẩm

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/categories` | — | Danh sách danh mục |
| POST/PUT/DELETE | `/api/categories/:id` | Admin | Thêm/sửa/xoá danh mục (`name`, `slug`) |
| GET | `/api/brands` | — | Danh sách thương hiệu kèm `_count.products` |
| GET | `/api/brands/:id` | — | Chi tiết thương hiệu |
| POST/PUT/DELETE | `/api/brands/:id` | Admin | Thêm/sửa/xoá thương hiệu (`name`) |
| GET | `/api/products` | — | `?page&limit&categoryId&brandId&brand&slug&search&sort` (`sort`: newest, price_asc, price_desc, name_asc, rating_desc) |
| GET | `/api/products/:id` | — | Chi tiết + `detail` theo loại; thương hiệu nằm ở `brand: { id, name }` |
| POST/PUT/DELETE | `/api/products/:id` | Admin | `brandId` bắt buộc khi tạo; body có `detail` ứng với danh mục (không chứa `brand`) |

### Gợi ý & tìm kiếm thông minh

Các endpoint dưới đây gọi ML service nội bộ (`ML_SERVICE_URL`). Nếu ML tắt/timeout,
backend tự fallback bằng Prisma và trả `data.source = "fallback"`; API vẫn 200.

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/products/search/smart` | — | `?q&page&limit` — ML parse intent/ràng buộc, backend tự query |
| GET | `/api/products/:id/similar` | — | `?limit` — sản phẩm tương tự (Cosine) |
| GET | `/api/recommendations/featured` | — | `?categoryId&limit` — sản phẩm nổi bật |
| GET | `/api/recommendations/for-you` | Đăng nhập | `?limit` — gợi ý cá nhân hóa, cold-start trả featured |
| GET | `/api/recommendations/ml-status` | Admin | Health + URL ML service |

### Giỏ hàng (đăng nhập)

| Method | Path | Mô tả |
| :--- | :--- | :--- |
| GET | `/api/cart` | Giỏ + `subtotal`, `totalItems` |
| POST | `/api/cart/items` | `{ productId, quantity }` — cộng dồn nếu đã có |
| PUT | `/api/cart/items/:productId` | `{ quantity }` — 0 là xoá |
| DELETE | `/api/cart/items/:productId` | Xoá 1 dòng |
| DELETE | `/api/cart` | Xoá toàn bộ giỏ |
| GET | `/api/cart/suggestions` | `?limit` — gợi ý mua kèm (FP-Growth), giỏ rỗng trả featured |

### Đơn hàng

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | `/api/orders` | Đăng nhập | Checkout từ giỏ: `{ shippingMethodId, shippingAddress, shippingPhone }` |
| GET | `/api/orders` | Đăng nhập | `?page&limit&status` |
| GET | `/api/orders/:id` | Đăng nhập | Chi tiết đơn của mình |
| PATCH | `/api/orders/:id/cancel` | Đăng nhập | Huỷ đơn `pending` |
| GET | `/api/admin/orders` | Admin | `?page&limit&status&userId&from&to` |
| PATCH | `/api/admin/orders/:id/status` | Admin | `{ status }` theo máy trạng thái |
| GET | `/api/shipping-methods` | — | Phương thức đang hoạt động (admin thấy cả đã tắt) |
| POST/PUT/DELETE | `/api/shipping-methods/:id` | Admin | CRUD phí vận chuyển |

### Vòng đời đơn hàng

```text
pending ──> confirmed ──> shipping ──> delivered
   └──────────┴──> cancelled  (hoàn tồn kho)
```

Chuyển sai luồng trả 400 kèm `data.allowedStatuses`.

## 6. Tích hợp ML service

Backend gọi ML service qua `src/clients/ml.client.js` với timeout ngắn (`ML_TIMEOUT_MS`,
mặc định 1200ms) và **luôn trả `null` khi lỗi**. Các service gợi ý sau đó fallback Prisma.

Biến môi trường cần thêm vào `.env`:

```env
ML_SERVICE_URL=http://127.0.0.1:8000
ML_TIMEOUT_MS=1200
# Phải trùng ML_INTERNAL_TOKEN trong ../ml-service/.env (nếu có đặt)
ML_INTERNAL_TOKEN=doi_thanh_chuoi_bi_mat_noi_bo
```

Chạy ML service (chi tiết ở `../ml-service/README.md`):

```powershell
cd ../ml-service
.\venv\Scripts\python.exe -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000
```

ML chỉ trả `product_id` + điểm số. Backend hydrate giá/tồn kho/ảnh từ DB nên dữ liệu
luôn mới. ML kết nối PostgreSQL bằng tài khoản **read-only**.

## 7. Ghi chú thiết kế

- Giá trong `order_items` là **snapshot** lúc đặt, không đổi khi sửa giá sản phẩm.
- Tồn kho trừ bằng `updateMany` có điều kiện `stockQuantity >= quantity` trong transaction để tránh bán âm kho.
- Bảng chi tiết sản phẩm map theo `categories.slug` (`chuot`, `ban-phim`, `tai-nghe`, `lot-chuot`, `setup`).
- Huỷ đơn chỉ hoàn kho một lần nhờ kiểm tra transition trong transaction.
