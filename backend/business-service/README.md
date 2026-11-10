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
| POST | `/api/auth/register` | — | `{ username, email, password, address? }` — gửi email xác thực |
| POST | `/api/auth/login` | — | `{ account, password }` (username hoặc email); tài khoản bị khoá trả 403 |
| GET | `/api/auth/me` | Đăng nhập | Hồ sơ của mình (kèm `emailVerified`) |
| PUT | `/api/auth/me` | Đăng nhập | `{ email?, address? }` — đổi email sẽ phải xác thực lại |
| PUT | `/api/auth/password` | Đăng nhập | `{ currentPassword, newPassword }` |
| POST | `/api/auth/forgot-password` | — | `{ email }` — gửi mã đặt lại (15 phút); email lạ vẫn trả 200 |
| POST | `/api/auth/reset-password` | — | `{ token, newPassword }` |
| POST | `/api/auth/verify-email` | — | `{ token }` — xác thực email (24 giờ) |
| POST | `/api/auth/resend-verification` | Đăng nhập | Gửi lại email xác thực |

Token reset/verify là chuỗi ngẫu nhiên 64 ký tự, DB chỉ lưu **hash SHA-256** + hạn dùng.
Chưa cấu hình SMTP thì nội dung mail (kèm token) được in ra console server — đủ để test local.

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
| POST/PUT/DELETE | `/api/products/:id` | Admin | `brandId` bắt buộc khi tạo; body có `detail` ứng với danh mục (không chứa `brand`, không nhận `rating`) |
| GET | `/api/products/:id/rating` | — | Điểm trung bình + số lượt chấm: `{ rating, ratingCount }` |
| POST | `/api/products/:id/rating` | Đăng nhập | `{ score }` nguyên 1–5, không cần mua hàng; chấm lại = đổi điểm → `{ rating, ratingCount, myScore }` |
| DELETE | `/api/products/:id/rating` | Đăng nhập | Rút đánh giá của mình → `{ rating, ratingCount, myScore: null }` |
| GET | `/api/products/:id/reviews` | — | `?page&limit` — nhận xét kèm `username`, `score`, `content` |
| POST | `/api/products/:id/reviews` | Đăng nhập | `{ score, content }` — **chỉ người đã mua** (đơn không huỷ); viết lại = sửa |
| DELETE | `/api/products/:id/reviews` | Đăng nhập | Xoá nhận xét của mình, **giữ** phiếu sao |

`rating` của sản phẩm là **trung bình tự tính** từ các lượt chấm trong bảng `ratings`
(mỗi user 1 phiếu/sản phẩm, unique `user_id + product_id`), kèm `ratingCount` = số phiếu.
Admin không còn điền `rating` tay — gửi lên sẽ bị lặng lẽ bỏ qua. Rating mẫu từ seed hiển thị
tới lượt chấm thật đầu tiên (`ratingCount: 0` nghĩa là chưa có phiếu thật); hết phiếu thì về `0`.
Review và rating dùng chung một bảng phiếu `ratings`: POST review tự upsert phiếu sao tương ứng,
xoá review chỉ xoá phần chữ. Nhờ vậy trung bình luôn tính từ một nguồn duy nhất.

`id` của `ratings` là mã `DG-XXXX`, của `reviews` là `NX-XXXX`, do CSDL sinh (sequence + default),
client không gửi lên — hai bảng này luôn thao tác qua `:id` sản phẩm + user đang đăng nhập.
Xem quy ước chung ở `docs/express-backend.md` mục 4.7.

### Quy ước khoá chính của dự án

| Bảng | Khoá chính | Ví dụ |
| :--- | :--- | :--- |
| `ratings` | `DG-XXXX` | `DG-0001` |
| `reviews` | `NX-XXXX` | `NX-0001` |
| `shipping_methods` | `VC-XXXX` | `VC-0001` |
| 13 bảng còn lại | `Int` tự tăng | `7` |

Ba bảng trên dùng mã vì id của chúng hiện ra trước người dùng (quản trị vận chuyển, danh sách
nhận xét) và không có hệ thống nào bên ngoài lưu lại.
Mười ba bảng còn lại giữ `Int` vì `products`, `orders`, `carts`, `users` và các bảng chi tiết là
đầu vào của ML: model `.joblib` cùng CSV huấn luyện đã lưu `product_id`/`order_id`/`user_id` dạng số.
Đổi chúng sang mã sẽ khiến gợi ý và mua kèm rơi về fallback cho tới khi train lại.

Mã do sequence + `DEFAULT` ở PostgreSQL sinh, không sinh trong service. Validator nhận mã dùng
`idCode()` (`src/validators/idCode.js`), không dùng `z.coerce.number()`.

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
| POST | `/api/orders` | Đăng nhập | Checkout từ giỏ: `{ shippingMethodId, shippingAddress, shippingPhone, paymentMethod? }` (`shippingMethodId` dạng `VC-XXXX`; `cod` mặc định, hoặc `bank_transfer`) |
| GET | `/api/orders` | Đăng nhập | `?page&limit&status` |
| GET | `/api/orders/:id` | Đăng nhập | Chi tiết đơn của mình (kèm `paymentMethod`, `paymentStatus`) |
| PATCH | `/api/orders/:id/cancel` | Đăng nhập | Huỷ đơn `pending` |
| GET | `/api/admin/orders` | Admin | `?page&limit&status&userId&from&to` |
| PATCH | `/api/admin/orders/:id/status` | Admin | `{ status }` theo máy trạng thái |
| PATCH | `/api/admin/orders/:id/payment` | Admin | `{ paymentStatus: "paid" \| "unpaid" }` — xác nhận chuyển khoản; đơn đã huỷ trả 400 |
| GET | `/api/payment-info` | — | `{ methods, bank }` — thông tin chuyển khoản cho client hiển thị |
| GET | `/api/shipping-methods` | — | Phương thức đang hoạt động (admin thấy cả đã tắt) |
| POST/PUT/DELETE | `/api/shipping-methods/:id` | Admin | CRUD phí vận chuyển; `:id` dạng `VC-XXXX` |

### Vòng đời đơn hàng

```text
pending ──> confirmed ──> shipping ──> delivered
   └──────────┴──> cancelled  (hoàn tồn kho)
```

Chuyển sai luồng trả 400 kèm `data.allowedStatuses`.

### Thanh toán

- `paymentMethod`: `cod` (mặc định) hoặc `bank_transfer`. `paymentStatus`: `unpaid` → `paid`.
- Chuyển khoản: client lấy thông tin ngân hàng từ `GET /api/payment-info` (đọc từ env
  `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER`; chưa cấu hình thì `bank: null`),
  khách chuyển khoản thủ công, admin xác nhận bằng `PATCH /api/admin/orders/:id/payment`.
- Đổi `paymentStatus` dùng optimistic claim (`updateMany` theo trạng thái hiện tại) trong
  transaction — hai admin bấm xác nhận cùng lúc chỉ một người thành công.

### Quản lý user (Admin)

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/users` | Admin | `?page&limit&search&role&isLocked` — không lộ password/token |
| PATCH | `/api/admin/users/:id/lock` | Admin | `{ isLocked: true/false }` — khoá/mở tài khoản |
| PATCH | `/api/admin/users/:id/role` | Admin | `{ role: "admin" \| "customer" }` |

Không thể tự khoá hoặc tự đổi role chính mình (400). User bị khoá: mọi API mang token cũ
trả 403 ngay (middleware đọc DB mỗi request), đăng nhập cũng bị chặn.

### Upload ảnh (Admin)

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | `/api/admin/uploads` | Admin | multipart `image` (jpeg/png/webp/gif, tối đa 5MB) → `{ url, path, size, contentType }` |

Ảnh đẩy lên **Supabase Storage** (bucket `SUPABASE_STORAGE_BUCKET`, mặc định `product-images`,
phải để public). Chưa cấu hình `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` thì trả 503.
Dùng `url` trả về làm `imageUrl` khi tạo/sửa sản phẩm.

### Thống kê (Admin)

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/stats/overview` | Admin | Tổng user/sản phẩm, đơn theo trạng thái, doanh thu đơn `delivered`, số đơn chờ thanh toán |
| GET | `/api/admin/stats/revenue` | Admin | `?groupBy=day\|month&from&to` — doanh thu đơn `delivered` theo kỳ |
| GET | `/api/admin/stats/top-products` | Admin | `?limit` — bán chạy theo số lượng (bỏ đơn huỷ) |
| GET | `/api/admin/stats/low-stock` | Admin | `?threshold&limit` — sản phẩm sắp hết hàng |

Kỳ doanh thu được cắt theo múi giờ `APP_TIME_ZONE` (mặc định `Asia/Ho_Chi_Minh`).
Mỗi phần tử trả về hai trường: `period` dạng ISO (`2026-11-07` hoặc `2026-11`) để client
sắp xếp/lọc, và `periodLabel` dạng `DD/MM/YYYY` (`07/11/2026`) hoặc `MM/YYYY` (`11/2026`)
để hiển thị.

### Quy ước ngày tháng

- CSDL lưu UTC; các trường `createdAt`/`updatedAt` trong response giữ nguyên ISO 8601.
- Ngày hiển thị cho người dùng luôn là `DD/MM/YYYY`, dùng helper trong `src/utils/date.js`
  (`formatDate`, `formatMonthYear`, `formatIsoDate`). Không tự nối chuỗi ngày bằng `-`.
- Múi giờ hiển thị cấu hình qua `APP_TIME_ZONE`, không phụ thuộc múi giờ máy chủ.

### Biến môi trường bổ sung

Ngoài các biến cũ (xem `.env.example`), các tính năng mới cần:

| Nhóm | Biến | Ghi chú |
| :--- | :--- | :--- |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `APP_URL` | Thiếu `SMTP_HOST` → mail in ra console (test local được ngay) |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Thiếu → upload trả 503 |
| Ngân hàng | `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER` | Hiển thị qua `/api/payment-info` |
| Múi giờ | `APP_TIME_ZONE` | Mặc định `Asia/Ho_Chi_Minh`; ảnh hưởng định dạng ngày và gom nhóm doanh thu |

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
- Chấm điểm khoá dòng sản phẩm (`SELECT ... FOR UPDATE`) trong transaction trước khi tính lại trung bình `rating`/`ratingCount`, chống ghi đè khi nhiều người chấm đồng thời.
- Review kiểm tra người mua bằng `order_items` thuộc đơn **không huỷ** của chính user đó; upsert review và upsert phiếu sao chạy chung một transaction với khoá dòng sản phẩm.
- Token quên mật khẩu / xác thực email: sinh ngẫu nhiên, chỉ lưu hash SHA-256 trong DB, một lần dùng (xoá sau khi dùng), có hạn.
- `authenticate` đọc lại user từ DB mỗi request: role luôn mới và tài khoản bị khoá mất hiệu lực token ngay lập tức.
- Doanh thu chỉ tính đơn `delivered`; top sản phẩm bỏ đơn `cancelled`.
