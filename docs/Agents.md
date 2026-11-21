# Agents.md — Hướng dẫn cho AI Agent & Lập trình viên

Tài liệu này mô tả **kiến trúc 2 service**, cách chạy local, hợp đồng API và các quy ước
bắt buộc khi chỉnh sửa repo này. Đọc hết trước khi tạo file mới hoặc sửa logic gợi ý/tìm kiếm.

Cấu trúc repo:

```text
HeThongThongMinh/
├── backend/
│   ├── business-service/   # Express + Prisma (:3000)
│   └── ml-service/         # FastAPI + scikit-learn (:8000)
├── docs/
│   ├── Agents.md
│   └── express-backend.md
└── .gitignore
```

---

## 1. Kiến trúc tổng quan

Repo gồm 2 service chạy song song, dùng chung một PostgreSQL:

```text
Client (web / mobile / Postman)
        │
        ▼
┌──────────────────────────┐        ┌─────────────────────────────┐
│ Business service         │  HTTP  │ ML service (FastAPI)         │
│ Express + Prisma :3000   │ ─────► │ :8000 (bind 127.0.0.1)       │
│                          │        │ Cosine / FP-Growth / KMeans  │
│ - Auth, sản phẩm, giỏ    │        │ SVM+Regex / Decision Tree    │
│ - Đơn hàng, tồn kho      │        │ Chỉ đọc DB                   │
│ - Hydrate dữ liệu từ DB  │        │                              │
└────────────┬─────────────┘        └──────────────┬───────────────┘
             │                                     │
             │  quyền ghi (Prisma)                 │  quyền SELECT (ml_reader)
             └──────────────► PostgreSQL ◄─────────┘
```

Nguyên tắc cốt lõi:

1. **Business service là nguồn sự thật nghiệp vụ.** Giá, tồn kho, ảnh, trạng thái đơn chỉ service này trả cho client.
2. **ML chỉ trả `product_id` + điểm số.** ML **không** trả giá/tồn kho/ảnh vì model có thể cũ.
3. **ML là dependency phụ.** ML tắt, timeout hay lỗi thì business service **luôn fallback bằng Prisma**; API nghiệp vụ không được sập.
4. **Tìm kiếm thông minh: ML chỉ parse.** ML trả intent + ràng buộc cứng + soft tags; business service tự dựng `where` Prisma và truy vấn.
5. **ML dùng tài khoản DB read-only.** Không INSERT/UPDATE/DELETE trong `backend/ml-service/`.

---

## 2. Bản đồ thư mục

```text
backend/
  business-service/              Business service (Node.js, ESM)
    prisma/
      schema.prisma              Nguồn schema CSDL chính
      migrations/                Lịch sử migration
      seed.js                    Dữ liệu mẫu
    src/
      clients/
        prisma.client.js         Prisma singleton
        ml.client.js             HTTP client nội bộ tới ML (timeout + trả null)
      config/env.js              Đọc process.env
      controllers/               Nhận req → validate → gọi service → trả res
      middlewares/               auth.middleware.js, upload.middleware.js (multer)
      routes/                    Khai báo method + path
      services/                  Nghiệp vụ + Prisma (không dùng req/res)
        brand.service.js           CRUD thương hiệu (bảng brands)
        recommendation.service.js  Similar / bundles / for-you / featured + fallback
        smartSearch.service.js     Parse của ML → where Prisma
      utils/                     response.js, AppError.js, money.js, constants.js, mailer.js
      validators/                Zod schema
      app.js                     Cấu hình Express
    server.js                    app.listen

  ml-service/                    ML service (Python, venv)
    src/
      __init__.py
      main.py                    FastAPI entrypoint, lifespan preload model
      config.py                  Settings từ .env + ROOT_DIR/DATA_DIR/MODELS_DIR
      deps.py                    Xác thực X-Internal-Token cho /admin/*
      schemas.py                 Pydantic request/response
      model_store.py             Registry load/reload 5 model .joblib
      routers/
        admin.py                 /admin/reload
        health.py                /health /ready /models
        recommend.py             /recommend/similar|bundles|personalized
        ranking.py               /ranking/featured (cần DATABASE_URL)
        search.py                /search/parse (không chạm DB)
      algorithms/
        __init__.py
        cosine/                  Cosine Similarity (sản phẩm tương tự)
        cosine_kmeans/           Cosine + K-Means (gợi ý cá nhân hóa)
        fp_growth/               FP-Growth (thường mua kèm)
        svm_regex/               SVM + Regex (tìm kiếm thông minh)
        decision_tree/           Decision Tree (sản phẩm nổi bật)
      db/
        __init__.py
        config.py                Kết nối PostgreSQL read-only
        repository.py            Truy vấn phục vụ train/ranking
    scripts/
      train.py                   Train + ghi manifest vào models/
      demo.py                    Kiểm thử trực quan tổng hợp
    models/                      Model .joblib + manifest
    data/                        CSV huấn luyện
    tests/test_api.py            Smoke test FastAPI
```

---

## 3. Chạy local (không Docker hoá service)

Chỉ cần PostgreSQL chạy sẵn (Supabase hoặc PostgreSQL cài trực tiếp).
Business service chạy bằng `node_modules`, ML chạy bằng `venv`.

### 3.1. Business service

```powershell
cd backend/business-service
npm install
Copy-Item .env.example .env      # sửa DATABASE_URL, JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run seed                     # tạo dữ liệu mẫu + tài khoản demo
npm run dev                      # http://localhost:5001
```

Kiểm tra: `GET http://localhost:5001/api/health`.

> **Cổng**: `.env` đang đặt `PORT=5001` vì macOS giữ 5000 cho ControlCenter/AirPlay Receiver
> và Next.js dev giữ 3000 (frontend fallback `http://localhost:5001`). `.env.example` vẫn ghi
> `3000`; đổi máy thì cập nhật cả `NEXT_PUBLIC_API_URL` của frontend.

Tài khoản demo: admin `admin` / `admin123` · khách `khachhang1` / `123456`.

### 3.2. ML service

```powershell
cd backend/ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env      # sửa DATABASE_URL read-only
.\venv\Scripts\python.exe -m uvicorn src.main:app --host localhost --port 8000
```

> Service **chỉ bind `localhost`**. Không mở ra Internet; business service gọi nội bộ.

Kiểm tra: `GET http://localhost:8000/health` và `GET /ready`.

Nếu chưa có file model, train trước:

```powershell
.\venv\Scripts\python.exe scripts\train.py                  # từ CSV trong data/
.\venv\Scripts\python.exe scripts\train.py --source db      # từ PostgreSQL (cần DATABASE_URL)
```

Các model hiện có sẵn:

| Khối | File |
| :--- | :--- |
| Sản phẩm tương tự | `models/similar_model.joblib` |
| Thường mua kèm | `models/rules_model.joblib` |
| Gợi ý cá nhân hóa | `models/personalized_model.joblib` |
| Tìm kiếm thông minh | `models/intent_model.joblib` |
| Sản phẩm nổi bật | `models/featured_model.joblib` |

---

## 4. Biến môi trường

### 4.1. `backend/business-service/.env`

| Biến | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `PORT` | `3000` | Cổng business service (`.env` máy dev đang để `5001`, xem 3.1) |
| `NODE_ENV` | `development` | `test` sẽ tắt morgan |
| `DATABASE_URL` | — | **Bắt buộc**, tài khoản có quyền ghi |
| `JWT_SECRET` | dev-secret | Phải đổi khi deploy |
| `JWT_EXPIRES_IN` | `7d` | Hạn token |
| `BCRYPT_SALT_ROUNDS` | `10` | Hash password |
| `ML_SERVICE_URL` | `http://localhost:8000` | Địa chỉ ML |
| `ML_TIMEOUT_MS` | `1200` | Timeout gọi ML (ngắn để không chậm API) |
| `ML_INTERNAL_TOKEN` | rỗng | Gửi kèm `X-Internal-Token`; phải trùng ML |
| `SEED_ADMIN_*` | — | Tài khoản admin do seed tạo |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | rỗng | Gửi mail reset/verify; thiếu `SMTP_HOST` → mail in ra console |
| `APP_URL` | `http://localhost:3000` | Frontend nhận link reset/verify |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | rỗng | Upload ảnh; thiếu → `/api/admin/uploads` trả 503 |
| `SUPABASE_STORAGE_BUCKET` | `product-images` | Bucket public chứa ảnh sản phẩm |
| `BANK_NAME/ACCOUNT/HOLDER` | rỗng | Thông tin chuyển khoản cho `/api/payment-info` |

### 4.2. `backend/ml-service/.env`

| Biến | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `ML_HOST` | `localhost` | Chỉ bind loopback |
| `ML_PORT` | `8000` | Cổng ML |
| `ML_INTERNAL_TOKEN` | rỗng | Nếu đặt, `/admin/*` yêu cầu `X-Internal-Token` |
| `DATABASE_URL` | rỗng | **Tài khoản read-only**; thiếu thì `/ranking/featured` trả 503 |

Tạo role read-only (ví dụ trên PostgreSQL):

```sql
CREATE ROLE ml_reader LOGIN PASSWORD 'mat_khau_manh';
GRANT CONNECT ON DATABASE gear_shop TO ml_reader;
GRANT USAGE ON SCHEMA public TO ml_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ml_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ml_reader;
```

> **Tuyệt đối không commit `.env`.** Chỉ commit `.env.example`. Repo đã từng chứa credential
> Supabase trong lịch sử git — cần rotate mật khẩu/khóa đó.

---

## 5. Hợp đồng API

### 5.1. Business service (client gọi)

Response luôn theo envelope:

```json
{ "status": "200", "message": "Thành công!", "data": {} }
```

Dữ liệu sản phẩm dùng thương hiệu chuẩn hoá: `products.brand_id` **NOT NULL** → `brands`.
Response trả `brandId` + `brand: { id, name }`; body tạo/sửa sản phẩm dùng `brandId`
(không còn `brand` free-text, bảng chi tiết không lưu thương hiệu). Quản lý thương hiệu qua
`/api/brands` (GET công khai, POST/PUT/DELETE yêu cầu admin).

Bộ lọc theo danh mục ở `GET /api/products?slug=` và `GET /api/brands?slug=` nhận **một slug**
hoặc nhiều slug cách nhau bởi dấu phẩy (`slug=chuot,ban-phim`), dịch thành `category.slug IN (…)`.
Frontend dùng cho trang nhóm `/danh-muc/gaming-gear`, `/danh-muc/office-gear`.

Đánh giá sản phẩm (khách chấm sao, không cần mua hàng):

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/products/:id/rating` | — | `{ rating, ratingCount }` đọc từ cột cache |
| POST | `/api/products/:id/rating` | Đăng nhập | `{ score }` nguyên 1–5; upsert phiếu → `{ rating, ratingCount, myScore }` |
| DELETE | `/api/products/:id/rating` | Đăng nhập | Rút phiếu của mình → `{ rating, ratingCount, myScore: null }` |

`Product.rating` là trung bình cache tự tính từ bảng `ratings` (unique `user_id + product_id`,
CHECK score 1–5); admin không còn nhận `rating` trong POST/PUT products. Model nổi bật tổng hợp
trực tiếp bảng `ratings`; dữ liệu train sản phẩm tương tự vẫn đọc `p.rating`. Mọi thao tác ghi khoá dòng product (`FOR UPDATE`) trong transaction trước
khi aggregate + update cache. Rating seed hiển thị tới phiếu thật đầu tiên; hết phiếu về 0.

Review (chỉ người đã mua — có đơn không huỷ chứa sản phẩm):

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/products/:id/reviews` | — | Phân trang, kèm `username` + `score` từ bảng ratings |
| POST | `/api/products/:id/reviews` | Đăng nhập | `{ score, content }` — upsert review **và** phiếu sao trong cùng transaction |
| DELETE | `/api/products/:id/reviews` | Đăng nhập | Xoá chữ, giữ phiếu sao |

Tài khoản & thanh toán:

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| PUT | `/api/auth/me` | Đăng nhập | Sửa `email`/`address`; đổi email → phải xác thực lại |
| PUT | `/api/auth/password` | Đăng nhập | `{ currentPassword, newPassword }` |
| POST | `/api/auth/forgot-password` · `/reset-password` | — | Mã reset 15 phút gửi qua mail (console nếu chưa SMTP) |
| POST | `/api/auth/verify-email` | — | Token 24 giờ; `/resend-verification` cần đăng nhập |
| GET | `/api/payment-info` | — | `{ methods, bank }` từ env |
| PATCH | `/api/admin/orders/:id/payment` | Admin | `{ paymentStatus }` — xác nhận chuyển khoản, optimistic claim |

Checkout nhận thêm `paymentMethod` (`cod` mặc định | `bank_transfer`); đơn lưu `paymentStatus`
(`unpaid`/`paid`). Token reset/verify chỉ lưu hash SHA-256 trong DB. `authenticate` đọc lại user
mỗi request nên khoá tài khoản có hiệu lực ngay cả với token cũ.

Quản trị mở rộng:

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/users` | Admin | `?page&limit&search&role&isLocked`, không lộ password/token |
| POST | `/api/admin/users` | Admin | `{ username, email, password, address?, role?, emailVerified? }` — tạo kèm giỏ hàng trống, **không** gửi mail xác thực (admin tự tick `emailVerified`) |
| PATCH | `/api/admin/users/:id/lock` · `/:id/role` | Admin | Khoá/mở, đổi role; không cho tự thao tác lên mình |
| POST | `/api/admin/users/:id/reset-password` | Admin | `{ password }` — đặt lại không cần mật khẩu cũ, thu hồi token reset đang treo |
| DELETE | `/api/admin/users/:id` | Admin | Từ chối khi tự xoá mình; từ chối khi còn đơn (`Order.user` là `Cascade` nên xoá là mất lịch sử) → 400 kèm `data.orderCount`, gợi ý khoá tài khoản |
| GET | `/api/admin/orders` · `/:id` | Admin | Danh sách (kèm `user: { id, username, email }`, lọc `from`/`to` theo `APP_TIME_ZONE`, `search` khớp `code`/username/email/`shippingPhone`) và chi tiết một đơn bất kỳ |
| GET | `/api/admin/reviews` | Admin | `?page&limit&search&productId&userId&from&to` — mỗi item `{ id, content, createdAt, score, user, product }`; `score` ghép từ bảng ratings theo cặp `(userId, productId)` nên **không lọc được theo score** |
| POST | `/api/admin/uploads` | Admin | JSON `{ imageUrl }` hoặc multipart `image` ≤ 5MB → `{ url, source, ... }`; nhánh file cần Supabase Storage |
| GET | `/api/admin/stats/overview` | Admin | User/sản phẩm/đơn theo trạng thái/doanh thu delivered |
| GET | `/api/admin/stats/revenue` | Admin | `?groupBy=day\|month&from&to` — chỉ đơn delivered |
| GET | `/api/admin/stats/top-products` | Admin | `?limit` — số lượng bán trong đơn đã giao |
| GET | `/api/admin/stats/low-stock` | Admin | `?threshold&limit` |
| POST | `/api/admin/ml/reload` | Admin | Business service gọi tiếp `ML /admin/reload` bằng `X-Internal-Token`; ML chết/lệch token → 503 có thông điệp |

**Mã đơn & trạng thái sản phẩm** (`migration 20261121090000`):

- `orders.code` — `DH-XXXX`, unique, sinh bởi `next_code('"orders_code_seq"', 'DH-')` giống quy ước
  `DG-`/`NX-`/`VC-`. `orders.id` vẫn là Int vì ML đọc bảng này. Mã có sẵn trong mọi response đơn hàng
  (checkout, `GET /api/orders`, admin) và là một trong các khoá tìm của `?search=`.
- `products.is_active` — mặc định `true`. `false` thì ẩn khỏi `GET /api/products`, chi tiết trả 404 với
  khách, loại khỏi smart search + featured/similar/for-you, và bị filter khỏi dữ liệu train ML
  (`src/db/repository.py` thêm `WHERE p.is_active`). Admin xem/sửa được bằng token admin
  (`GET /api/products?isActive=all|false`, `GET /api/products/:id`); POST/PUT products nhận `isActive`.
  Checkout chặn đặt sản phẩm đã ngưng bán (guest cart có thể còn hàng từ trước).
  Hai GET products dùng `optionalAuthenticate` (chỉ đọc token nếu có).

Các endpoint ML-related:

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/products/search/smart?q&page&limit` | — | Tìm kiếm thông minh (parse + query) |
| GET | `/api/products/:id/similar?limit` | — | Sản phẩm tương tự |
| GET | `/api/cart/suggestions?limit` | Đăng nhập | Gợi ý mua kèm theo giỏ |
| GET | `/api/recommendations/featured?categoryId&limit` | — | Sản phẩm nổi bật |
| GET | `/api/recommendations/for-you?limit` | Đăng nhập | Gợi ý cá nhân hóa |
| GET | `/api/recommendations/ml-status` | Admin | Health + URL của ML |

Dạng `data` của các endpoint gợi ý:

```json
{
  "source": "ml",            // "ml" | "fallback"
  "reason": "cold_start",    // chỉ có khi fallback
  "model": "cosine_similarity",
  "items": [ { "id": 8, "name": "...", "price": 1990000, "score": 0.6791 } ]
}
```

`data` của smart search:

```json
{
  "query": "chuột không dây dưới 2 triệu",
  "source": "ml",
  "analysis": {
    "intent": "tim_kiem_san_pham",
    "confidence": 0.93,
    "isSearch": true,
    "shouldQueryDb": true,
    "hardConstraints": { "categories": ["chuot"], "max_price": 2000000, "connectivity": ["wireless"] },
    "softTags": ["sieu_nhe_under_60g"]
  },
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 61, "totalPages": 4 }
}
```

### 5.2. ML service (business service gọi nội bộ)

| Method | Path | Body / Query | Trả về |
| :--- | :--- | :--- | :--- |
| GET | `/health` | — | `{ status, service, version }` |
| GET | `/ready` | — | Trạng thái + danh sách model thiếu |
| GET | `/models` | — | Chi tiết model, manifest, lỗi nạp |
| POST | `/recommend/similar` | `{ product_id, top_n, same_category_only? }` | `{ model, version, items: [{ product_id, score }] }` |
| POST | `/recommend/bundles` | `{ product_ids[], top_n }` | `{ model, items: [{ product_id, score, confidence, lift, support }] }` |
| POST | `/recommend/personalized` | `{ user_id, top_n }` | `{ model, cold_start, items }` |
| POST | `/search/parse` | `{ query }` | intent + `hard_constraints` + `soft_tags` (không DB) |
| GET | `/ranking/featured` | `?category_id&limit` | `{ model, items: [{ product_id, rank, score }] }` |
| POST | `/admin/reload` | Header `X-Internal-Token` | Nạp lại toàn bộ model |

Mã lỗi ML: `404` không có product/user, `503` model chưa sẵn sàng hoặc thiếu DB,
`500` lỗi parse không mong đợi. Business service coi mọi lỗi là "ML không khả dụng".

---

## 6. Chiến lược fallback (bắt buộc giữ)

| Khối | Khi ML lỗi / timeout / cold-start | Business service làm gì |
| :--- | :--- | :--- |
| Sản phẩm tương tự | ML trả rỗng hoặc lỗi | Cùng danh mục hoặc cùng hãng, sort `rating desc` |
| Thường mua kèm | Giỏ rỗng / không có luật | Sản phẩm nổi bật; nếu có giỏ thì ưu tiên cùng danh mục |
| Gợi ý cho bạn | `cold_start` hoặc ML lỗi | Bảng xếp hạng featured (rating desc) |
| Sản phẩm nổi bật | ML 503 (thiếu DB) | `rating desc`, `id asc` |
| Tìm kiếm thông minh | ML lỗi | Tìm `name`/`brand.name` chứa nguyên câu query |

`ml.client.js` đã đảm bảo **không ném lỗi**: mọi thất bại trả `null`. Service gọi
không cần try/catch quanh `mlClient`.

---

## 7. Tìm kiếm thông minh — luồng chuẩn

```text
Client GET /api/products/search/smart?q=...
  → recommendation.controller.smartSearch (validate Zod)
  → smartSearch.service
      → mlClient.parseSearch(q)
          → POST /search/parse  (SVM intent + Regex hard constraints + soft tags)
      → buildSmartSearchWhere(hardConstraints, softTags, rawQuery)
      → prisma.product.findMany + count (transaction)
  → trả items + analysis + pagination
```

Quy tắc khi mở rộng:

- Thêm ràng buộc mới: sửa `svm_regex/hard_rules.py` (ML) **và** `smartSearch.service.js` (map sang Prisma).
- Thêm soft tag mới: khai báo trong `svm_regex/constants.py` + pattern trong `tag_extractor.py`,
  rồi thêm vào `SOFT_TAG_FILTERS` ở business service. Tag không có cột tương ứng thì bỏ qua an toàn.
- **Không** để business service tự đoán lại intent; tin kết quả `should_query_db` của ML.
- **Không** để ML truy vấn DB cho smart search.

---

## 8. Train lại & reload model

```powershell
cd backend/ml-service

# Train một model
.\venv\Scripts\python.exe scripts\train.py --model cosine
.\venv\Scripts\python.exe scripts\train.py --model fp_growth
.\venv\Scripts\python.exe scripts\train.py --model kmeans
.\venv\Scripts\python.exe scripts\train.py --model svm
.\venv\Scripts\python.exe scripts\train.py --model featured --source db

# Reload nóng, không cần restart uvicorn
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/admin/reload" `
  -Headers @{ "X-Internal-Token" = "<token>" }
```

Trang quản trị không cầm `X-Internal-Token` (chỉ dùng nội bộ backend), nên reload qua
`POST /api/admin/ml/reload` — business service attach token rồi gọi ML. ML tắt hoặc token lệch nhau
trả 503 kèm thông điệp lỗi.

`scripts\train.py` ghi kèm `<ten_model>.manifest.json` (version, thời điểm train, metrics) vào `models/`.
`/models` và `/ready` đọc manifest để báo version.

Model nổi bật dùng Decision Tree entropy (sklearn CART), với rating, rating_count, positive_ratio và sold_count (số đơn vị hàng đã giao). `--model featured --source db` xuất dữ liệu + nhãn mẫu sang `data/featured.csv` rồi train; không ghi nhãn vào DB. Nhãn 1 khi rating >= 4.2, positive_ratio >= 0.75 và (rating_count >= 3 hoặc sold_count >= 3), còn lại 0. Dùng `--source csv` để giữ nhãn đã chỉnh tay. Chi tiết và giới hạn của nhãn mẫu: [ML README](../backend/ml-service/README.md).

Thêm model mới:

1. Tạo class + `save/load` trong thư mục `src/algorithms/<thuat_toan>/`.
2. Thêm `ModelSpec` vào `src/model_store.py`, trỏ path vào `models/`.
3. Thêm schema/response vào `src/schemas.py`, router tương ứng trong `src/routers/`.
4. Đăng ký router trong `src/main.py`.
5. Gọi `_write_manifest(save_path, metrics)` trong `scripts\train.py`.
6. Thêm test vào `backend/ml-service/tests/test_api.py`.

---

## 9. Kiểm thử

### ML service

```powershell
cd backend/ml-service
.\venv\Scripts\python.exe -m pytest -q
```

Test hiện có (9): health, ready đủ model, similar, parse trong/ngoài phạm vi, personalized cold-start,
và Decision Tree (lưu/nạp, sức mua, tồn kho, nhãn, API nổi bật). Không cần database.

### Business service

Chạy `npm run test:admin` và `npm run test:images` trong `backend/business-service`: Node test runner kiểm tra hồi quy admin và hai nguồn ảnh (link/file, quyền, giới hạn upload, Storage HTTP giả lập). Test không ghi DB hay upload ra ngoài. Các API khác tiếp tục kiểm tra thủ công bằng HTTP/Postman.

> **Cảnh báo:** bất kỳ test nào gọi `resetDatabase()` kiểu cũ sẽ xoá sạch dữ liệu thật trên
> Supabase. Không chạy test trên `DATABASE_URL` đang trỏ DB thật; hãy tạo DB test riêng nếu cần.

---

## 10. Quy ước code

### Business service (theo `docs/express-backend.md`)

- **Route** chỉ khai báo path → controller. **Controller** validate (Zod) rồi gọi service.
  **Service** chứa nghiệp vụ + Prisma, **không** nhận `req`/`res`.
- Dùng `sendSuccess`, `sendError`, `sendAppError`; ném `AppError`/`notFound`/`badRequest` từ service.
- Mọi input mới phải có Zod schema trong `src/validators/` và được gọi qua `validateInput`.
- Route có tham số `/:id` phải đặt **sau** các route tĩnh như `/search/smart`.
- Tiền/Decimal trả về dạng `number` (đã xử lý bởi `serializeDecimals`).
- Không hardcode credential; đọc qua `src/config/env.js`.
- Không gọi `mlClient` từ controller; chỉ gọi trong service.

### ML service

- Python 3.11+ (đang chạy 3.14.9), type hint, `from __future__ import annotations`.
- Router mỏng: validate bằng Pydantic, gọi model/store, map sang schema trả về.
- Không đọc `.joblib` theo từng request; luôn qua `store.get(key)`.
- Không ghi DB. `db/config.py` mặc định `commit=False`.
- Log lỗi bằng `logger.exception`, trả `HTTPException` có mã phù hợp.
- Không import `src.*` từ trong các package thuật toán (`src/algorithms/*`) để giữ chúng độc lập, testable.
- Chạy service: `.\venv\Scripts\python.exe -m uvicorn src.main:app` từ thư mục `backend/ml-service`.

---

## 11. Troubleshooting nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| :--- | :--- | :--- |
| Business service trả `source: "fallback"` liên tục | ML chưa chạy / sai `ML_SERVICE_URL` | Mở `:8000/health`; kiểm tra `.env` |
| `/ranking/featured` trả 503 | ML thiếu `DATABASE_URL` | Tạo `backend/ml-service/.env`, dùng role read-only |
| Kiểm thử phần admin | Dùng Node test runner | Chạy `npm run test:admin`, xem mục 9 |
| Model không load | Thiếu `.joblib` hoặc lệch version sklearn | Chạy `train.py`, xem `/models` để đọc lỗi |
| Tìm kiếm trả quá nhiều sản phẩm | Query không bóc được ràng buộc → fallback tìm theo tên | Kiểm tra `/search/parse` trước |
| Tiếng Việt lỗi khi gọi PowerShell | Encoding terminal | Dùng `Invoke-RestMethod` với URL đã encode, hoặc gọi qua Postman |

---

## 12. Checklist trước khi commit

- [ ] Không có `.env`, token, password, connection string thật trong diff.
- [ ] `node --check` các file business service đã sửa.
- [ ] `pytest -q` (ML) và `npm run test:admin` (BE) pass; các API khác kiểm tra thủ công.
- [ ] Endpoint mới đã cập nhật `backend/business-service/README.md` / `backend/ml-service/README.md`.
- [ ] ML vẫn chỉ trả `product_id` + score; fallback vẫn hoạt động khi tắt ML.
- [ ] Giữ nguyên cấu trúc `backend/business-service/` và `backend/ml-service/`.
