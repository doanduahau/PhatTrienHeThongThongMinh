# Backend Shop Gear Gaming

API Express + Prisma cho shop bán chuột, bàn phím, tai nghe, lót chuột và setup.
Kiến trúc và quy ước code theo `express-backend.md`; thiết kế CSDL theo `DBHeThongThongMinh.txt`; kế hoạch thực hiện ở `PLAN.md`.

## 1. Yêu cầu

- Node.js 20+
- PostgreSQL 16 (Docker hoặc cài sẵn)

## 2. Chạy lần đầu

```bash
npm install
cp .env.example .env        # mặc định trỏ PostgreSQL trong Docker ở cổng 5433
docker compose up -d        # dựng DB, chờ STATUS = healthy
npx prisma migrate deploy   # tạo bảng
npm run seed                # dữ liệu mẫu
npm run dev                 # http://localhost:3000
```

Kiểm tra DB đã sẵn sàng: `docker compose ps` (cột STATUS phải là `healthy`, không phải `starting`).

Kiểm tra server sống: `GET /api/health`.

**Tài khoản demo:** admin `admin` / `admin123` · khách `khachhang1` / `123456`.

### Làm việc nhóm

- Chỉ commit `.env.example`, **không** commit `.env` và `.env.test` (đã có trong `.gitignore`).
- Cả nhóm dùng chung một `DATABASE_URL` như trong `.env.example` (`localhost:5433`) nên không ai phải sửa cấu hình riêng.
- Cổng 5433 được chọn để không đụng PostgreSQL cài sẵn trên máy ở cổng 5432.
- Xoá sạch dữ liệu Docker rồi làm lại: `docker compose down -v && docker compose up -d`.
- Vẫn có thể dùng PostgreSQL cài sẵn (không cần Docker): sửa `DATABASE_URL` sang `localhost:5432` rồi chạy migrate + seed như trên.
- Luồng làm việc gợi ý: mỗi người một nhánh `feat/<việc>`, chạy `npm test` trước khi mở PR.

## 3. Lệnh thường dùng

| Lệnh | Việc |
| :--- | :--- |
| `npm run dev` | Chạy server với nodemon |
| `npm start` | Chạy server production |
| `npm test` | Tự tạo database `gear_shop_test` trên CÙNG server DB trong `.env` (URL test ghi vào `.env.test`) rồi chạy Jest |
| `npm run prisma:migrate` | Tạo migration mới khi sửa schema |
| `npm run prisma:studio` | Xem dữ liệu bằng Prisma Studio |
| `npm run prisma:reset` | Xoá và seed lại toàn bộ dữ liệu dev |
| `docker compose ps` | Xem trạng thái container DB |
| `docker compose logs -f db` | Theo dõi log PostgreSQL |

## 4. Cấu trúc

```text
prisma/            schema.prisma, migrations, seed.js
src/
  clients/         prisma.client.js (singleton)
  config/          env.js
  controllers/     nhận req, validate, gọi service, trả res
  middlewares/     auth.middleware.js (authenticate, requireAdmin)
  routes/          khai báo method + path
  services/        nghiệp vụ + truy vấn Prisma (không đụng req/res)
  utils/           response.js, AppError.js, constants.js, money.js, productDetail.js
  validators/      schema Zod
  app.js           cấu hình Express
server.js          app.listen
tests/             Jest + Supertest
```

## 5. API

Quy ước response:

```json
{ "status": "200", "message": "Thành công!", "data": {} }
```

Mọi API cần đăng nhập dùng header `Authorization: Bearer <token>`.

### Auth

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | — | `{ username, email, password, address? }` |
| POST | `/api/auth/login` | — | `{ account, password }` (username hoặc email) |
| GET | `/api/auth/me` | Đăng nhập | Hồ sơ của mình |

### Danh mục & sản phẩm

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/categories` | — | Danh sách danh mục |
| POST/PUT/DELETE | `/api/categories/:id` | Admin | Thêm/sửa/xoá danh mục (`name`, `slug`) |
| GET | `/api/products` | — | `?page&limit&categoryId&slug&search&sort` (`sort`: newest, price_asc, price_desc, name_asc) |
| GET | `/api/products/:id` | — | Chi tiết + `detail` theo loại |
| POST/PUT/DELETE | `/api/products/:id` | Admin | Body có `detail` ứng với danh mục |

### Giỏ hàng (đăng nhập)

| Method | Path | Mô tả |
| :--- | :--- | :--- |
| GET | `/api/cart` | Giỏ + `subtotal`, `totalItems` |
| POST | `/api/cart/items` | `{ productId, quantity }` — cộng dồn nếu đã có |
| PUT | `/api/cart/items/:productId` | `{ quantity }` — 0 là xoá |
| DELETE | `/api/cart/items/:productId` | Xoá 1 dòng |
| DELETE | `/api/cart` | Xoá toàn bộ giỏ |

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

## 6. Ghi chú thiết kế

- Giá trong `order_items` là **snapshot** lúc đặt, không đổi khi sửa giá sản phẩm.
- Tồn kho trừ bằng `updateMany` có điều kiện `stockQuantity >= quantity` trong transaction để tránh bán âm kho.
- Bảng chi tiết sản phẩm map theo `categories.slug` (`chuot`, `ban-phim`, `tai-nghe`, `lot-chuot`, `setup`).
- Huỷ đơn chỉ hoàn kho một lần nhờ kiểm tra transition trong transaction.
