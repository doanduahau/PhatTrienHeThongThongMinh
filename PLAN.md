# KẾ HOẠCH TRIỂN KHAI BACKEND — SHOP GEAR GAMING

**Nguồn tham chiếu bắt buộc**

| File | Vai trò |
| :--- | :--- |
| `DBHeThongThongMinh.txt` | Nguồn sự thật duy nhất (single source of truth) về cấu trúc bảng & quan hệ |
| `express-backend.md` | Quy chuẩn kiến trúc, phân tầng, cách trả response, danh sách anti-pattern |

**Stack đã chốt**

| Thành phần | Lựa chọn | Ghi chú |
| :--- | :--- | :--- |
| Runtime | Node.js 20 LTS, ESM (`"type": "module"`) | Theo `express-backend.md` dùng `import` |
| Framework | Express 4 | |
| ORM | Prisma | `prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.js` |
| Database | PostgreSQL 16 (Docker) | Nếu bắt buộc SQL Server: chỉ đổi `provider`, giữ nguyên schema logic |
| Validate | Zod | `src/validators/*.validator.js` |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Access token, không refresh token (giữ KISS) |
| Test | Jest + Supertest | `tests/` |

**Phân tầng & luồng chuẩn (áp dụng cho MỌI bước)**

```text
Route  →  Controller (validate → gọi service → sendSuccess/sendError)  →  Service (Prisma, không có req/res)  →  Prisma  →  DB
```

Quy ước chung, không được vi phạm ở bất kỳ bước nào:

1. Service **không** nhận `req`, `res`, **không** gọi `sendSuccess`/`sendError`. Service chỉ nhận tham số thuần và trả Promise.
2. Controller **không** viết truy vấn Prisma trực tiếp.
3. Mọi response đi qua `sendSuccess` / `sendError` trong `src/utils/response.js` — không tự `res.json()` ở nơi khác.
4. Validate 100% input (`body`, `params`, `query`) bằng Zod trước khi chạm DB. Sai → trả lỗi ngay, không cho dữ liệu rác xuống DB.
5. Không tạo thêm tầng trung gian (repository, mapper, dto, index route) nếu chưa có nhu cầu thật — theo mục 5 của `express-backend.md`.
6. Mỗi bước phải chạy được độc lập (`npm run dev` không crash) và có test/kiểm thử tương ứng trước khi chuyển bước.

---

## 1. Tổng quan các bước & thứ tự phụ thuộc

| Bước | Nội dung | Phụ thuộc | Kết quả bàn giao |
| :--- | :--- | :--- | :--- |
| 0 | Khởi tạo project & bộ khung | — | Server chạy, `/api/health` trả 200 |
| 1 | Prisma schema + migration + seed nền | 0 | DB có đủ 13 bảng như DBML |
| 2 | Auth (register / login / me) + middleware phân quyền | 1 | Đăng ký, đăng nhập, token dùng được |
| 3 | Category & Product (CRUD nền) | 2 | Danh mục + sản phẩm cơ bản |
| 4 | Bảng chi tiết sản phẩm (1-1 theo loại) | 3 | Tạo/lấy sản phẩm kèm thông số kỹ thuật |
| 5 | Cart | 3, 4 | Thêm/sửa/xoá giỏ, tính tiền tạm tính |
| 6 | Shipping methods | 1 | CRUD phí & phương thức vận chuyển |
| 7 | Checkout → Orders | 5, 6 | Đặt hàng trọn vẹn trong transaction |
| 8 | Quản trị đơn hàng (vòng đời trạng thái) | 7 | Admin duyệt/huỷ, tồn kho hoàn đúng |
| 9 | Kiểm thử, tài liệu API, seed demo | tất cả | Test pass, Postman/Swagger, README |
| 10 | Rà soát & bàn giao | 9 | Checklist mục 6 của quy chuẩn đạt 100% |

Thời lượng gợi ý (1 dev, vừa làm vừa học): B0 0.5 ngày · B1 1 ngày · B2 1 ngày · B3 1.5 ngày · B4 1.5 ngày · B5 1 ngày · B6 0.5 ngày · B7 2 ngày · B8 1 ngày · B9 1.5 ngày · B10 0.5 ngày. **Tổng ~12 ngày làm việc.**

---

## 2. Điều chỉnh schema so với DBML (chốt TRƯỚC khi migrate)

DBML hiện tại thiếu vài thứ mà nghiệp vụ bắt buộc phải có. Ghi nhận rõ để không phải sửa DB giữa đường:

| # | Vấn đề | Quyết định | Lý do |
| :--- | :--- | :--- | :--- |
| A1 | `users` không có cột phân quyền → không thể tách khách/admin | Thêm `role varchar(20) not null default 'customer'` (`customer` \| `admin`) | Cần cho bước 8 |
| A2 | `categories` chỉ có `name` → không map ổn định sang bảng chi tiết | Thêm `slug varchar(50) unique not null` | Mapping loại sản phẩm → bảng `mice`/`keyboards`/... không phụ thuộc tiếng Việt có dấu |
| A3 | `cart_items` có thể trùng `(cart_id, product_id)` | Thêm unique index `(cart_id, product_id)` | Chống 2 dòng cùng 1 sản phẩm trong giỏ |
| A4 | `order_items.price` phải là giá **tại thời điểm mua** | Giữ nguyên cột, ghi snapshot khi checkout, **không** join giá từ `products` | Giá sản phẩm đổi về sau không được làm sai đơn cũ |
| A5 | Không khai báo hành vi xoá | `carts/cart_items/orders/order_items/products.*` → `onDelete: Cascade` cho dữ liệu con của cart/order; `products` → `Restrict` khi còn `order_items` | Tránh xoá sản phẩm làm mất lịch sử đơn |
| A6 | `orders.status` là chuỗi tự do | Giới hạn tập giá trị: `pending` → `confirmed` → `shipping` → `delivered`, nhánh `cancelled` | Dùng hằng số trong `src/utils/constants.js`, không enum DB để dễ mở rộng |
| A7 | DBML không có bảng đánh giá nhưng `products.rating` tồn tại | Bước này **không** làm review; `rating` là số nhập tay/seed | Tránh phình scope |

> Nguyên tắc: DBML là gốc, các mục trên là **bổ sung tối thiểu**. Nếu giảng viên/khách chốt khác, sửa bảng này trước rồi mới làm bước 1.

---

## 3. Chi tiết từng bước

### Bước 0 — Khởi tạo project & bộ khung

**Mục tiêu:** có repo chạy được, cấu trúc thư mục đúng mục 2 của quy chuẩn, có sẵn tiện ích response.

**Quy trình nghiệp vụ:** chưa có nghiệp vụ. Đây là bước hạ tầng: bảo đảm mọi dev (hoặc máy khác) clone về chỉ cần `npm i` + `docker compose up` + `npm run dev` là chạy.

**Quy trình dev (theo thứ tự):**

1. `git init`, tạo `.gitignore` (`node_modules`, `.env`, `dist`, `coverage`).
2. `npm init -y`, sửa `package.json`: `"type": "module"`, scripts `dev` (nodemon), `start`, `test`, `prisma:*`, `seed`.
3. Cài dependency: `express cors morgan dotenv @prisma/client zod bcryptjs jsonwebtoken`; dev: `nodemon prisma jest supertest`.
4. Tạo `docker-compose.yml` (PostgreSQL 16, volume bền, healthcheck, port 5432).
5. Tạo `.env.example` (`PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`) và `.env` thật (không commit).
6. Tạo `src/config/env.js` đọc `process.env` **kèm giá trị mặc định** — tuyệt đối không validate env bằng Zod (anti-pattern mục 5).
7. Tạo `src/utils/response.js` chép đúng `sendSuccess`, `sendError`, `removeUndefined` từ quy chuẩn.
8. Tạo `src/app.js` (cors, express.json, morgan trừ môi trường test, route health, 404, global error handler) và `server.js` (`app.listen`).
9. Thêm `GET /api/health` trả `{ status, uptime }` để kiểm tra sống/chết.

**File:** `package.json`, `.gitignore`, `.env.example`, `docker-compose.yml`, `server.js`, `src/app.js`, `src/config/env.js`, `src/utils/response.js`.

**Điều kiện hoàn thành (DoD):**
- [ ] `npm run dev` lên server, `GET /api/health` → 200.
- [ ] `GET /api/khong-ton-tai` → 404 đúng format `sendError`.
- [ ] Body JSON hỏng → 400 "Dữ liệu JSON không hợp lệ!".
- [ ] Ép `throw` trong 1 route test → 500, **không** lộ stack trace ra client.

---

### Bước 1 — Prisma schema, migration, seed nền

**Mục tiêu:** DB thật khớp DBML (kèm điều chỉnh mục 2), có dữ liệu nền để các bước sau test được.

**Quy trình nghiệp vụ:** dữ liệu nền (master data) gồm **danh mục** và **phương thức vận chuyển** — hai thứ admin phải có trước khi đăng sản phẩm và khách phải có trước khi đặt hàng.

**Quy trình dev:**

1. `npx prisma init` → trỏ `DATABASE_URL`.
2. Viết `prisma/schema.prisma`: 13 model `User, Cart, CartItem, ShippingMethod, Order, OrderItem, Category, Product, Mouse, Keyboard, Headphone, Setup, Mousepad`; quan hệ 1-1 `Product ↔ bảng chi tiết` qua `productId @unique`; các quan hệ theo dòng `Ref:` cuối DBML; `@@map` snake_case đúng tên bảng trong DBML.
3. Áp dụng A1–A6: `role`, `slug`, unique `(cart_id, product_id)`, `onDelete`.
4. `npx prisma migrate dev --name init` → kiểm tra file SQL sinh ra có đủ FK.
5. `src/clients/prisma.client.js` export singleton `prisma`.
6. `prisma/seed.js`: 5 category (`chuot`, `ban-phim`, `tai-nghe`, `lot-chuot`, `setup`) + 3 shipping method (Standard 30.000đ/3-5 ngày, Fast 60.000đ/1-2 ngày, Hỏa tốc 120.000đ/trong ngày) + 1 admin (`admin` / mật khẩu đã hash) + 2 customer.
7. Script `prisma:reset` để xoá và seed lại nhanh khi dev.

**DoD:**
- [ ] `npx prisma studio` thấy đủ 13 bảng, đúng kiểu dữ liệu (`decimal(15,2)`, `varchar`).
- [ ] Seed chạy 2 lần liên tiếp không lỗi (dùng `upsert`, không `create` mù).
- [ ] Xoá 1 `Cart` → `CartItem` con bị xoá theo.
- [ ] Xoá `Product` đã có trong `order_items` → bị chặn (Restrict).

---

### Bước 2 — Auth: đăng ký, đăng nhập, hồ sơ + phân quyền

**Mục tiêu:** định danh người dùng, tạo 2 vai trò, cấp JWT cho các bước sau.

**Quy trình nghiệp vụ:**

1. Khách đăng ký: `username` + `email` + `password` (+ `address` tuỳ chọn).
2. Hệ thống kiểm tra trùng `username`/`email`, hash mật khẩu, lưu `role='customer'`.
3. Hệ thống tự tạo **giỏ hàng rỗng** cho user mới (quan hệ 1-1 `carts.user_id` unique).
4. Khách đăng nhập bằng `username` hoặc `email` + mật khẩu → nhận `token`.
5. Client gửi `Authorization: Bearer <token>` cho các API cần đăng nhập.
6. Sai mật khẩu/sai tài khoản → thông báo chung "Tài khoản hoặc mật khẩu không đúng" (không tiết lộ tài khoản có tồn tại hay không).

**Quy trình dev:**

1. `src/validators/auth.validator.js`: `registerSchema` (username 3–50, ký tự `[a-zA-Z0-9_]`; email hợp lệ; password ≥ 6; address ≤ 255), `loginSchema`.
2. `src/services/auth.service.js`: `register` (dùng `prisma.$transaction` tạo user + cart), `login`, `getProfile`, `hashPassword`, `verifyPassword`, `signToken`.
3. `src/controllers/auth.controller.js`: map lỗi Prisma `P2002` → 400 "Username/Email đã tồn tại" kèm `data.field`.
4. `src/middlewares/auth.middleware.js`: `authenticate` (verify token, gắn `req.user = { id, role }`), `requireAdmin` (role phải `admin` → sai trả 403).
5. `src/routes/auth.route.js` + gắn vào `app.js`.

**API:**

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | — | Đăng ký, trả user (không trả password) |
| POST | `/api/auth/login` | — | Trả `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Hồ sơ của chính mình |

**Quy tắc lỗi:** 400 dữ liệu không hợp lệ / trùng · 401 sai thông tin đăng nhập · 401 token hết hạn hoặc sai · 403 không đủ quyền.

**DoD:**
- [ ] Response **không bao giờ** chứa trường `password` (kể cả hash).
- [ ] Đăng ký 2 lần cùng username → 400, message rõ ràng.
- [ ] Token hết hạn/không có → 401; token của customer gọi API admin → 403.
- [ ] User mới có đúng 1 cart.

---

### Bước 3 — Category & Product (CRUD nền)

**Mục tiêu:** danh mục và sản phẩm cơ bản (chưa có bảng chi tiết), kèm tìm kiếm/lọc/phân trang.

**Quy trình nghiệp vụ:**

1. Khách xem danh mục (chỉ đọc) và danh sách sản phẩm; lọc theo danh mục, tìm theo tên, sắp xếp theo giá/độ mới, phân trang.
2. Khách xem chi tiết 1 sản phẩm.
3. Admin tạo danh mục → tạo sản phẩm thuộc danh mục đó, cập nhật giá/tồn kho/ảnh, ẩn-hoặc-xoá sản phẩm.
4. Sản phẩm hết hàng (`stock_quantity = 0`) vẫn hiển thị nhưng đánh dấu `isInStock = false` để client không cho thêm vào giỏ.

**Quy trình dev:**

1. `category.validator.js`, `product.validator.js` (Zod: `categoryId` int dương, `price` ≥ 0, `stockQuantity` ≥ 0, `imageUrl` url, `rating` 0–5).
2. Service: `getAll` hỗ trợ `where` động (category, `search` dùng `contains` + `mode: 'insensitive'`), `orderBy` whitelist (`price_asc`, `price_desc`, `newest`), `skip/take`.
3. Service trả kèm `pagination` `{ page, limit, total, totalPages }`.
4. Controller đọc `req.query` → validate → gọi service; admin dùng `requireAdmin`.
5. Xoá sản phẩm: thử `delete`, bắt `P2003` (ràng buộc FK) → trả 400 "Sản phẩm đã phát sinh đơn hàng, không thể xoá".

**API:** `GET /api/categories` · admin `POST/PUT/DELETE /api/categories/:id` · `GET /api/products` · `GET /api/products/:id` · admin `POST/PUT/DELETE /api/products/:id`.

**DoD:**
- [ ] `GET /api/products?categoryId=1&search=logi&sort=price_asc&page=1&limit=10` chạy đúng, không N+1.
- [ ] `page`/`limit` sai (âm, chữ) → 400, không crash Prisma.
- [ ] Customer gọi `POST /api/products` → 403.
- [ ] `total` trong pagination khớp số bản ghi thực tế.

---

### Bước 4 — Bảng chi tiết sản phẩm (1-1 theo loại)

**Mục tiêu:** mỗi sản phẩm thuộc loại nào thì có đúng 1 dòng thông số ở bảng tương ứng, tạo/sửa **nguyên tử** với `products`.

**Quy trình nghiệp vụ:**

1. Admin chọn danh mục cho sản phẩm → form hiển thị đúng nhóm thông số (chuột: kiểu kết nối, tay thuận, trọng lượng, polling, switch, sensor; bàn phím: layout, rapid trigger, hotswap, macOS, polling, switch; tai nghe: kiểu, mic, ANC; lót chuột: pad type, control, speed, bề mặt, đế, size; setup: loại, tải tối đa).
2. Lưu sản phẩm = lưu `products` + lưu bảng chi tiết trong **cùng 1 transaction**. Một trong hai lỗi → không có bản ghi nào được tạo.
3. Khách xem chi tiết sản phẩm → response gộp `product` + object `detail` (null nếu chưa nhập).
4. Đổi danh mục của sản phẩm đã có chi tiết → **chặn**, yêu cầu xoá và tạo lại (tránh mồ côi dữ liệu ở bảng cũ).

**Quy trình dev:**

1. `src/utils/productDetail.js`: bảng map `slug → { model, schema }` (`chuot → prisma.mouse`, ...). Đây là **một file** dùng chung, không tách mỗi loại một service.
2. Validator riêng cho từng nhóm thông số, đặt trong `productDetail.validator.js`, gắn theo slug.
3. `product.service.js`: `createWithDetail(payload)` → `$transaction`: tạo product → lấy `category.slug` → validate detail → tạo dòng chi tiết. `updateWithDetail` → tương tự (`upsert` dòng chi tiết).
4. `getById` dùng `include` động: lấy product + category, rồi `include` đúng quan hệ theo slug (không include cả 5).
5. Controller trả `{ ...product, detail }` cho khách.

**Quy tắc nghiệp vụ cần bảo vệ:**
- `status`/`connectivity`/`layout`/`headphone_type`/`setup_category` chỉ nhận tập giá trị trong comment DBML — validate bằng `z.enum`.
- `product_id` unique ở bảng chi tiết → tạo trùng phải ra 400, không phải 500.

**DoD:**
- [ ] Tạo chuột thiếu `brand` → 400, **không** có product rác trong DB (test transaction rollback).
- [ ] Tạo sản phẩm thuộc danh mục không có bảng chi tiết (nếu có) → không tạo dòng chi tiết, vẫn 200.
- [ ] `GET /api/products/:id` trả đúng `detail` của loại tương ứng.
- [ ] Đổi `categoryId` khi đã có chi tiết → 400 kèm hướng dẫn.

---

### Bước 5 — Giỏ hàng (Cart)

**Mục tiêu:** khách quản lý giỏ, số lượng luôn trong giới hạn tồn kho, tính tiền tạm tính chuẩn.

**Quy trình nghiệp vụ:**

1. Khách thêm sản phẩm vào giỏ (mặc định 1). Đã có sản phẩm đó → **cộng dồn** số lượng, không tạo dòng mới.
2. Số lượng sau cộng dồn không được vượt `stock_quantity`; vượt → từ chối và báo tồn kho còn lại.
3. Khách đổi số lượng (đặt 0 → xoá dòng) hoặc xoá từng dòng.
4. Khách xem giỏ: danh sách dòng kèm ảnh/tên/đơn giá/thành tiền + `subtotal`, `totalItems`.
5. Sản phẩm trong giỏ bị xoá khỏi hệ thống → dòng đó tự biến mất khi xem giỏ (hoặc báo "sản phẩm không còn bán") — chọn: **lọc bỏ và ghi cảnh báo trong response**.

**Quy trình dev:**

1. `cart.validator.js`: `productId` int dương, `quantity` int 1..99.
2. `cart.service.js`: `getOrCreateCart(userId)`, `getCart(userId)` (include product, tính toán bằng JS sau khi query — không aggregate phức tạp), `addItem`, `updateItem`, `removeItem`, `clearCart`.
3. Thêm/sửa dùng `prisma.$transaction` để đọc tồn kho và ghi trong cùng thời điểm.
4. Controller chỉ lấy `req.user.id`, **không** nhận `userId` từ client (chống xem giỏ người khác).

**API:** `GET /api/cart` · `POST /api/cart/items` · `PUT /api/cart/items/:productId` · `DELETE /api/cart/items/:productId` · `DELETE /api/cart`.

**DoD:**
- [ ] Thêm cùng sản phẩm 3 lần → 1 dòng, `quantity = 3`.
- [ ] Thêm vượt tồn kho → 400, giỏ không đổi.
- [ ] User A không thấy/không sửa được giỏ user B (test bằng 2 token).
- [ ] `subtotal` = Σ(`price` × `quantity`), làm tròn 2 chữ số.

---

### Bước 6 — Phương thức vận chuyển

**Mục tiêu:** admin quản lý phí ship; khách chọn khi thanh toán.

**Quy trình nghiệp vụ:**

1. Khách xem danh sách phương thức **đang hoạt động** (`is_active = true`).
2. Admin thêm/sửa/ngừng kích hoạt phương thức. **Không xoá cứng** nếu đã có đơn dùng → chỉ `is_active = false` (giữ lịch sử hoá đơn).
3. Phí ship không âm; `is_active=false` không được chọn khi checkout.

**Quy trình dev:** validator (`fee` ≥ 0, `estimatedDays` ≤ 50 ký tự, `isActive` boolean) → service (admin thấy cả inactive, khách chỉ thấy active) → controller → route (`GET` công khai, `POST/PUT/DELETE` admin).

**API:** `GET /api/shipping-methods` · admin `POST/PUT/DELETE /api/shipping-methods/:id`.

**DoD:**
- [ ] Khách không thấy phương thức đã tắt.
- [ ] Xoá phương thức đã dùng trong đơn → 400 "Đang được sử dụng".

---

### Bước 7 — Checkout & Orders (nghiệp vụ cốt lõi)

**Mục tiêu:** biến giỏ hàng thành đơn hàng chính xác, an toàn dữ liệu, đúng tồn kho.

**Quy trình nghiệp vụ:**

1. Khách bấm đặt hàng, gửi `shippingMethodId`, `shippingAddress` (mặc định lấy `users.address`), `shippingPhone`.
2. Hệ thống kiểm tra: giỏ không rỗng; mọi sản phẩm còn tồn ≥ số lượng trong giỏ; phương thức ship tồn tại và đang active.
3. Một sản phẩm không đủ hàng → **huỷ toàn bộ** đơn, báo rõ sản phẩm nào còn bao nhiêu (không đặt một phần).
4. Tính tiền: `total_amount = Σ(price_snapshot × quantity) + shipping_fee`. Giá lấy tại thời điểm đặt, lưu vào `order_items.price`.
5. Tạo `orders` (`status='pending'`) + các `order_items` + **trừ tồn kho** + **xoá giỏ** — tất cả trong 1 transaction.
6. Khách xem danh sách đơn của mình (mới nhất trước) và chi tiết 1 đơn.
7. Khách chỉ được huỷ khi đơn còn `pending` (quy tắc chi tiết ở bước 8).

**Quy trình dev:**

1. `order.validator.js`: `createOrderSchema`, `orderIdParamSchema`, `listOrderQuerySchema` (page/limit/status).
2. `order.service.js`:
   - `checkout(userId, payload)` → `$transaction(async (tx) => { ... })`:
     a. `tx.cart.findUnique` include items+product; rỗng → throw `AppError` 400.
     b. Với từng dòng: `tx.product.updateMany({ where: { id, stockQuantity: { gte: qty } }, data: { stockQuantity: { decrement: qty } } })` — nếu `count === 0` → throw (chống race condition, không đọc-rồi-ghi).
     c. `tx.order.create` với `items: { create: [...] }` (price snapshot).
     d. `tx.cartItem.deleteMany({ cartId })`.
     e. Trả order đầy đủ.
3. `getMyOrders`, `getMyOrderById` (luôn kèm điều kiện `userId = req.user.id` — không cho đoán id đơn người khác).
4. Controller map lỗi nghiệp vụ (`INSUFFICIENT_STOCK`, `EMPTY_CART`, ...) → `sendError` với message tiếng Việt + `data` chi tiết.
5. Lỗi nghiệp vụ dùng `AppError` nội bộ (mã + message), **không** trả stack trace.

**API:** `POST /api/orders` · `GET /api/orders` · `GET /api/orders/:id`.

**DoD:**
- [ ] Đặt hàng thành công: tồn kho giảm đúng, giỏ rỗng, `total_amount` = subtotal + phí ship (đối chiếu tay).
- [ ] Đặt khi 1 món không đủ hàng → **không** đơn nào được tạo, tồn kho **không** đổi, giỏ còn nguyên.
- [ ] 2 request checkout đồng thời (Postman runner) trên sản phẩm còn 1 → chỉ 1 đơn thành công.
- [ ] Giá sản phẩm đổi sau khi đặt → đơn cũ vẫn giữ giá cũ.
- [ ] User A không xem được đơn của user B (404/403, không trả dữ liệu).

---

### Bước 8 — Quản trị đơn hàng & vòng đời trạng thái

**Mục tiêu:** admin xử lý đơn theo đúng luồng, không cho nhảy trạng thái bừa, hoàn kho khi huỷ.

**Quy trình nghiệp vụ — máy trạng thái (state machine):**

```text
pending ──confirm──> confirmed ──ship──> shipping ──deliver──> delivered
   │                     │                  │
   └──cancel──> cancelled └──cancel──> cancelled (hoàn kho)
```

| Từ | Được chuyển sang | Ai làm | Tác động kho |
| :--- | :--- | :--- | :--- |
| `pending` | `confirmed`, `cancelled` | Admin | Huỷ → cộng lại tồn kho |
| `confirmed` | `shipping`, `cancelled` | Admin | Huỷ → cộng lại tồn kho |
| `shipping` | `delivered` | Admin | Không đổi |
| `delivered` | — | — | Không đổi (khoá) |
| `cancelled` | — | — | Không đổi |

Chuyển trạng thái không hợp lệ (vd `pending → delivered`) → 400 kèm danh sách trạng thái được phép.
Khách tự huỷ đơn: chỉ khi `pending`, gọi qua `PATCH /api/orders/:id/cancel`.

**Quy trình dev:**

1. `src/utils/constants.js`: `ORDER_STATUS`, `ALLOWED_TRANSITIONS` (map trạng thái → mảng trạng thái kế tiếp).
2. `order.service.js`: `updateStatus(orderId, nextStatus, actor)` — mở transaction, đọc đơn, kiểm tra transition, nếu huỷ thì cộng lại tồn kho từng `order_item`, ghi `status` mới.
3. `cancelMyOrder(userId, orderId)` — kiểm tra quyền sở hữu + `pending`.
4. Admin: `GET /api/admin/orders` (lọc theo `status`, `userId`, khoảng ngày) và `PATCH /api/admin/orders/:id/status` (chỉ `requireAdmin`).
5. **Không** cho phép sửa `order_items` sau khi tạo (đơn là chứng từ bất biến).

**API:** admin `GET /api/admin/orders` · `PATCH /api/admin/orders/:id/status` · khách `PATCH /api/orders/:id/cancel`.

**DoD:**
- [ ] `pending → delivered` bị chặn.
- [ ] Huỷ đơn → tồn kho cộng lại **đúng một lần**; bấm huỷ lần 2 → 400 (không cộng kho lần nữa).
- [ ] `delivered` không thể huỷ.
- [ ] Mọi thay đổi trạng thái ghi log ra console kèm `orderId`, `from → to`, `actorId`.

---

### Bước 9 — Kiểm thử, tài liệu API, dữ liệu demo

**Mục tiêu:** chứng minh các luồng trên chạy đúng và người khác dùng được API mà không cần đọc code.

**Quy trình nghiệp vụ:** nghiệm thu theo kịch bản người dùng thật: "khách mới → xem sản phẩm → thêm giỏ → đặt hàng → admin duyệt → giao → khách xem lại đơn".

**Quy trình dev:**

1. `tests/` dùng DB test riêng (`DATABASE_URL_TEST`), `beforeEach` dọn dữ liệu.
2. Unit test Service (không HTTP): tính tiền, kiểm tra transition, cộng dồn giỏ.
3. Integration test Supertest cho 5 luồng: auth, product+detail, cart, checkout (gồm case thiếu hàng), admin đổi trạng thái.
4. Test âm (bảo mật): truy cập không token, sai role, truy cập chéo dữ liệu người khác.
5. Viết bộ sưu tập Postman (hoặc Swagger nếu còn thời gian) đủ 100% endpoint, kèm biến `{{token}}`.
6. `prisma/seed.js` mở rộng: 5 danh mục × ≥3 sản phẩm/loại, đủ thông số chi tiết, để demo giao diện.
7. `README.md`: yêu cầu môi trường, 5 lệnh chạy, danh sách endpoint, tài khoản demo.

**DoD:**
- [ ] `npm test` xanh toàn bộ, chạy lại 2 lần vẫn xanh (test độc lập dữ liệu).
- [ ] Có ≥1 test cho mỗi quy tắc nghiệp vụ ở cột "Quy tắc" của các bước 2, 5, 7, 8.
- [ ] Người thứ hai clone repo, làm theo README, chạy được trong < 10 phút.

---

### Bước 10 — Rà soát & bàn giao

**Mục tiêu:** đóng dự án với chất lượng đồng đều, không nợ kỹ thuật.

**Quy trình dev (đối chiếu checklist mục 6 của `express-backend.md`):**

1. `PORT` đọc từ env; `cors()` + `express.json()` có mặt.
2. Đã bắt mã lỗi Prisma: `P2002` (trùng), `P2025` (không tìm thấy — trả 404 thay vì 500), `P2003` (FK).
3. Middleware 404 đặt cuối, global error handler đặt sau cùng.
4. Lỗi 500 chỉ log server, client nhận message chung.
5. `.env.example` đầy đủ và **khớp** biến thực dùng trong code.
6. Rà anti-pattern mục 5: không có `routes/index.js` thừa, không tách `utils` vòng vo, không truyền `res` vào service, không validate env.
7. `git log` sạch theo bước (1 commit/bước, message dạng `feat(orders): checkout transaction`).
8. Tổng rà soát: xoá `console.log` rác, xoá code chết, chạy `npm test` + smoke test Postman lần cuối.

**DoD:** toàn bộ checklist trên tick hết; không còn TODO trong `src/`.

---

## 4. Ma trận quyền (dùng chung cho mọi bước)

| Nhóm API | Khách chưa đăng nhập | Customer | Admin |
| :--- | :--- | :--- | :--- |
| `GET` products / categories / shipping-methods | ✅ | ✅ | ✅ |
| Auth register / login | ✅ | — | — |
| Cart, Orders của mình, `auth/me` | ❌ | ✅ | ✅ |
| Tạo/sửa/xoá category, product | ❌ | ❌ | ✅ |
| Quản trị đơn hàng, đổi trạng thái | ❌ | ❌ | ✅ |
| CRUD shipping-methods | ❌ | ❌ | ✅ |

Quy tắc thực thi: luôn kiểm tra **quyền sở hữu dữ liệu** ở tầng Service (`where: { id, userId }`), không chỉ dựa vào middleware.

---

## 5. Quy ước lỗi & response

Giữ đúng format của `sendSuccess` / `sendError`:

```json
{ "status": "200", "message": "Lấy dữ liệu thành công!", "data": {} }
```

| Mã nội bộ | HTTP | Dùng khi |
| :--- | :--- | :--- |
| `400` | 400 | Zod fail, trùng khoá, nghiệp vụ sai (thiếu hàng, sai transition) |
| `401` | 401 | Thiếu/sai/hết hạn token, sai mật khẩu |
| `403` | 403 | Đủ danh tính nhưng không đủ quyền |
| `404` | 404 | Không tìm thấy tài nguyên (`P2025`, id không tồn tại) |
| `500` | 500 | Lỗi không lường trước (đã log server) |

Message luôn tiếng Việt, hướng tới người dùng; chi tiết kỹ thuật đặt trong `data`.

---

## 6. Rủi ro & cách xử lý

| Rủi ro | Ảnh hưởng | Cách xử lý |
| :--- | :--- | :--- |
| Trừ tồn kho sai khi 2 người đặt cùng lúc | Bán âm kho | Dùng `updateMany` có điều kiện `stockQuantity >= qty` trong transaction (bước 7) |
| Bảng chi tiết 1-1 dễ sinh dữ liệu mồ côi | Hiển thị sai thông số | Map slug ở 1 file, transaction khi tạo/sửa, chặn đổi category (bước 4) |
| Huỷ đơn 2 lần → cộng kho 2 lần | Sai tồn kho | Kiểm tra transition trong transaction (bước 8) |
| Giá thay đổi làm sai đơn cũ | Sai kế toán | Snapshot `order_items.price` (bước 7) |
| DBML thiếu `role`/`slug` phát hiện muộn | Phải migrate lại giữa đường | Chốt mục 2 trước khi làm bước 1 |
| Scope phình (review, voucher, thanh toán online, upload ảnh) | Trễ tiến độ | Ghi vào mục 7, chỉ làm sau khi bước 10 xong |

---

## 7. Ngoài phạm vi (ghi nhận, chưa làm)

Đánh giá/bình luận sản phẩm (dù có `products.rating`) · mã giảm giá · cổng thanh toán online · upload ảnh thật (chỉ lưu URL) · refresh token · gửi email xác nhận · lịch sử trạng thái đơn (bảng `order_status_logs`) · phân trang phía admin nâng cao · Dockerfile/deploy production.

Mỗi mục chỉ được mở thành bước mới khi khách/giảng viên xác nhận, và phải viết lại mục 3 của kế hoạch này trước khi code.
