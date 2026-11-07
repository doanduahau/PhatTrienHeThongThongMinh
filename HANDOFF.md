# Bàn giao — Backend Gear Shop

Tài liệu này để một agent khác review và test **độc lập**, không cần hỏi lại người viết.

- Repo: backend Express + Prisma cho shop gear gaming.
- Nhánh: `master`, **11 commit** (chia theo 11 bước của `PLAN.md`), chưa push.
- Trạng thái: working tree sạch, `npm test` xanh 61/61, DB chạy bằng Docker.
- Nguồn yêu cầu: `DBHeThongThongMinh.txt` (DBML), `express-backend.md` (quy chuẩn code), `PLAN.md` (kế hoạch 11 bước).

---

## 1. Đã làm gì

| Bước | Nội dung | Commit |
| :--- | :--- | :--- |
| 0 | Khung dự án ESM, `config/env`, Prisma client singleton, `utils/response` + `AppError` + `money`, Docker Compose, health/404/error handler | `0cdf16a` |
| 1 | `prisma/schema.prisma` 13 bảng, migration `20261106040037_init`, seed idempotent | `4d42f76` |
| 2 | Auth: register/login JWT, `/me`, `authenticate`, `requireAdmin` | `93bd860` |
| 3 | CRUD danh mục + sản phẩm, lọc/tìm/phân trang/sort | `2b08fb5` |
| 4 | Thông số chi tiết theo danh mục (`utils/productDetail.js`) | `92ddd7d` |
| 5 | Giỏ hàng (cộng dồn, chặn vượt tồn, quantity 0 = xoá) | `eef11ae` |
| 6 | Phương thức vận chuyển (khách xem, admin CRUD) | `e374e97` |
| 7 | Checkout transaction, snapshot giá, quản trị đơn | `4a189ba` |
| 8 | API admin đổi trạng thái + vòng đời đơn + hoàn kho | `7699121` |
| 9 | Test Jest/Supertest, script DB test, Postman collection | `18a58cd` |
| 10 | README hướng dẫn chạy, API, làm việc nhóm | `8487202` |

**Cấu trúc thư mục**

```text
prisma/            schema.prisma, migrations/, seed.js
scripts/           prepareTestDb.js (tạo/xoá DB test), testRunner.js (chạy Jest với DB riêng)
src/
  clients/         prisma.client.js
  config/          env.js
  controllers/     6 file (auth, category, product, cart, order, shipping)
  middlewares/     auth.middleware.js
  routes/          7 file
  services/        6 file (không nhận req/res)
  utils/           response, AppError, constants, money, productDetail
  validators/      6 schema Zod + validate.js
  app.js
server.js
tests/             11 file test + helpers/
docs/              postman_collection.json
```

**CSDL (13 model)**: `User, Cart, CartItem, ShippingMethod, Order, OrderItem, Category, Product, Mouse, Keyboard, Headphone, Setup, Mousepad`.

**API (27 endpoint + health)**

| Nhóm | Endpoint | Quyền |
| :--- | :--- | :--- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` | công khai |
| Auth | `GET /api/auth/me` | đăng nhập |
| Category | `GET /api/categories` | công khai |
| Category | `POST /api/categories`, `PUT/DELETE /api/categories/:id` | admin |
| Product | `GET /api/products`, `GET /api/products/:id` | công khai |
| Product | `POST /api/products`, `PUT/DELETE /api/products/:id` | admin |
| Cart | `GET /api/cart`, `DELETE /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/:productId` | đăng nhập |
| Order | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/cancel` | đăng nhập |
| Admin order | `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` | admin |
| Shipping | `GET /api/shipping-methods` | công khai (kèm token admin thì thấy cả mục đã tắt) |
| Shipping | `POST /api/shipping-methods`, `PUT/DELETE /api/shipping-methods/:id` | admin |
| Health | `GET /api/health` | công khai |

---

## 2. Những gì đã verify thật (kết quả thực tế)

| Hạng mục | Lệnh | Kết quả |
| :--- | :--- | :--- |
| Container DB | `docker compose ps` | `gear-shop-db  Up (healthy)  0.0.0.0:5433->5432/tcp` |
| Migration | `npx prisma migrate deploy` | `All migrations have been successfully applied.` |
| Seed | `npm run seed` | 5 danh mục, 3 shipping, 3 user, 15 sản phẩm |
| Seed lặp lại | `npm run seed` (lần 2) | `0 sản phẩm mới` — không sinh trùng |
| Test | `npm test` | **11 suites / 61 tests passed** |
| DB test | log `testRunner` | Tạo database test tên duy nhất, migrate, chạy Jest rồi tự xoá |
| Test song song | 2 lần `npm test` cùng lúc | **Cả hai 61/61**, dùng 2 database riêng, không đụng nhau |
| Smoke API | `curl /api/health` | 200 `{"status":"200",...}` |
| Smoke 404 | `curl /api/khong-ton-tai` | 404 đúng format `sendError` |
| Smoke JSON hỏng | `POST /api/auth/login` body `{bad` | 400 `"Dữ liệu JSON không hợp lệ!"` |
| Smoke dữ liệu | `curl '/api/products?limit=2&sort=price_desc'` | trả sản phẩm từ DB Docker |

Phân bổ test: `auth` 5, `product` 9, `productLifecycle` 4, `cart` 6, `order` 7, `orderStatus` 6, `category` 5, `shipping` 5, `adminOrder` 4, `concurrency` 5, `errorHandling` 5.

---

## 3. Dựng lại môi trường từ đầu

```bash
npm install
cp .env.example .env
docker compose up -d          # chờ healthy
npx prisma migrate deploy
npm run seed
npm test                      # tự tạo database test riêng, chạy xong tự xoá
npm run dev                   # hoặc npm start
```

Biến môi trường cần: `DATABASE_URL` (cổng **5433** cho Docker), `JWT_SECRET`, `PORT`.

Tài khoản demo do seed tạo: `admin/admin123`, `khachhang1/123456`, `khachhang2/123456`.

---

## 4. Quyết định thiết kế & sai lệch so với DBML

| # | Thay đổi | Lý do |
| :--- | :--- | :--- |
| A1 | Thêm `users.role` (`customer`/`admin`) | DBML không có cách phân quyền; seed cần admin |
| A2 | `categories.slug` unique | Dùng slug để chọn bảng chi tiết sản phẩm |
| A3 | Unique `(cart_id, product_id)` | Mỗi sản phẩm chỉ 1 dòng/giỏ, tránh trùng khi thêm nhiều lần |
| A4 | `order_items.price` là snapshot | Sửa giá sản phẩm không làm sai đơn cũ |
| A5 | Quy tắc `onDelete` rõ ràng (Cascade cho cart item/order item, Restrict cho sản phẩm đã bán) | Không mất lịch sử đơn hàng |
| A6 | Trạng thái đơn là `String` + hằng số trong code, không dùng enum DB | Đổi trạng thái không cần migration |
| A7 | Không làm bảng review/đánh giá | Ngoài phạm vi đợt này |

Quy ước response mọi endpoint: `{ "status": "200", "message": "...", "data": ... }`; lỗi dùng cùng shape với `status` là mã lỗi (`"400"`, `"401"`...). HTTP status thật đặt đúng (200/400/401/403/404/500).

---

## 5. Rủi ro đã rà soát & trạng thái

| # | Trạng thái | Cách xử lý |
| :--- | :--- | :--- |
| 1 | **Đã sửa** | `changeStatus` đọc đơn **trong** transaction, `updateMany` có điều kiện `status = trạng thái cũ`; request thua không hoàn kho. Có test đồng thời cho cả admin và khách |
| 2 | **Đã sửa** | `cart.addItem` dùng `cartItem.upsert` với `quantity: { increment }` nguyên tử, rollback nếu vượt tồn/kho. Có test 5 request song song |
| 3 | **Đã bổ sung test** | `category`, `shipping`, `adminOrder`, `productLifecycle` phủ CRUD, filter `from/to/userId`, đổi `categoryId`, xoá sản phẩm đã bán |
| 4 | **Đã sửa** | 500 trả message chung, không lộ `err.message`/Prisma; body quá lớn trả 413; id/page vượt int4 bị Zod chặn. Có test `errorHandling` |
| 5 | **Giữ nguyên có chủ ý** | Token sai trên endpoint công khai trả 401 (đúng hành vi xác thực); không token vẫn xem bình thường |
| 6 | **Đã sửa** | `sendSuccess` tự chuyển toàn bộ Decimal sang number (kể cả trong `detail`) |
| 7 | **Đã sửa** | `pagination.totalPages` luôn tối thiểu `1` |
| 8 | **Giữ nguyên** | `POST`/`DELETE` trả 200 theo quy ước response chung của dự án |
| 9 | **Ngoài phạm vi** | Rate limit / refresh token / khoá tài khoản nằm trong mục 7 của `PLAN.md` |
| 10 | **Đã sửa** | `scripts/testRunner.js` tạo database test tên duy nhất, migrate, chạy Jest rồi xoá DB. Đã chạy 2 lần `npm test` song song: cả hai 61/61 |
| 11 | **Đã sửa** | Seed dùng khóa ổn định `slug + thương hiệu`, tự cập nhật sản phẩm cũ; đổi tên trong seed không tạo bản ghi mới |

---

## 6. Kịch bản test độc lập (không cần đọc code)

```bash
BASE=http://localhost:3000

# 1. Đăng ký + lấy token khách
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"reviewer","email":"reviewer@test.vn","password":"123456"}'

TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"account":"reviewer","password":"123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

# 2. Thêm 2 sản phẩm vào giỏ (id 1 lấy từ GET /api/products)
curl -s -X POST $BASE/api/cart/items -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"productId":1,"quantity":2}'

# 3. Checkout
curl -s -X POST $BASE/api/orders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"shippingMethodId":1,"shippingAddress":"1 Lê Lợi","shippingPhone":"0900000000"}'

# 4. Admin đổi trạng thái (token lấy từ login admin)
curl -s -X PATCH $BASE/api/admin/orders/1/status -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"status":"confirmed"}'

# 5. Case phải FAIL: nhảy cóc pending -> delivered (400 + allowedStatuses)
#    khách gọi API admin (403) · khách xem đơn người khác (404) · thêm vượt tồn kho (400)
```

Checklist pass/fail gợi ý:

- [ ] Response mọi endpoint đúng shape `{ status, message, data }`.
- [ ] Không endpoint nào lộ `password` (kể cả `/api/auth/me`, order kèm user).
- [ ] Checkout khi thiếu hàng: **không** tạo order, kho và giỏ giữ nguyên.
- [ ] Huỷ đơn hoàn kho đúng 1 lần; huỷ lần 2 trả 400.
- [ ] Đổi giá sản phẩm sau khi đặt không làm đổi `order_items.price`.
- [ ] Customer không gọi được bất kỳ API admin nào (403, không phải 404).
- [ ] `npm run seed` chạy 2 lần không nhân đôi dữ liệu.
- [ ] `npm test` xanh trên máy sạch (chỉ cần Docker + Node 20+).

---

## 7. Lệnh hữu ích khi review

```bash
npm test -- tests/orderStatus.test.js   # chạy 1 suite
npm test -- -t "huỷ đơn"                # chạy test theo tên
npm run prisma:studio                   # xem dữ liệu
docker compose logs -f db               # log PostgreSQL
git log --stat                          # xem commit theo bước
```

Ngoài phạm vi (không cần báo lỗi): thanh toán, mã giảm giá, review sản phẩm, upload ảnh, refresh token, phân trang bằng cursor.
