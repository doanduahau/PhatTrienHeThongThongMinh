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
│ - Auth, sản phẩm, giỏ    │        │ SVM+Regex / Rating baseline  │
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
    ml_service/
      __init__.py
      main.py                    FastAPI entrypoint, lifespan preload model
      config.py                  Settings từ .env + ROOT_DIR/DATA_DIR/MODELS_DIR
      deps.py                    Xác thực X-Internal-Token cho /admin/*
      schemas.py                 Pydantic request/response
      model_store.py             Registry load/reload 4 model .joblib
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
        rating_baseline/         Baseline (sản phẩm nổi bật)
      db/
        __init__.py
        config.py                Kết nối PostgreSQL read-only
        repository.py            Truy vấn phục vụ train/ranking
        schema.sql
        seed/
    scripts/
      train.py                   Train + ghi manifest vào models/
      demo.py                    Kiểm thử trực quan tổng hợp (từ test.py cũ)
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
npm run dev                      # http://localhost:3000
```

Kiểm tra: `GET http://localhost:3000/api/health`.

Tài khoản demo: admin `admin` / `admin123` · khách `khachhang1` / `123456`.

### 3.2. ML service

```powershell
cd backend/ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env      # sửa DATABASE_URL read-only
.\venv\Scripts\python.exe -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000
```

> Service **chỉ bind `127.0.0.1`**. Không mở ra Internet; business service gọi nội bộ.

Kiểm tra: `GET http://127.0.0.1:8000/health` và `GET /ready`.

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

---

## 4. Biến môi trường

### 4.1. `backend/business-service/.env`

| Biến | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `PORT` | `3000` | Cổng business service |
| `NODE_ENV` | `development` | `test` sẽ tắt morgan |
| `DATABASE_URL` | — | **Bắt buộc**, tài khoản có quyền ghi |
| `JWT_SECRET` | dev-secret | Phải đổi khi deploy |
| `JWT_EXPIRES_IN` | `7d` | Hạn token |
| `BCRYPT_SALT_ROUNDS` | `10` | Hash password |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000` | Địa chỉ ML |
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
| `ML_HOST` | `127.0.0.1` | Chỉ bind loopback |
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

Đánh giá sản phẩm (khách chấm sao, không cần mua hàng):

| Method | Path | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/products/:id/rating` | — | `{ rating, ratingCount }` đọc từ cột cache |
| POST | `/api/products/:id/rating` | Đăng nhập | `{ score }` nguyên 1–5; upsert phiếu → `{ rating, ratingCount, myScore }` |
| DELETE | `/api/products/:id/rating` | Đăng nhập | Rút phiếu của mình → `{ rating, ratingCount, myScore: null }` |

`Product.rating` là trung bình cache tự tính từ bảng `ratings` (unique `user_id + product_id`,
CHECK score 1–5); admin không còn nhận `rating` trong POST/PUT products. ML vẫn chỉ đọc
`p.rating` như cũ. Mọi thao tác ghi khoá dòng product (`FOR UPDATE`) trong transaction trước
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
| PATCH | `/api/admin/users/:id/lock` · `/:id/role` | Admin | Khoá/mở, đổi role; không cho tự thao tác lên mình |
| POST | `/api/admin/uploads` | Admin | multipart `image` ≤ 5MB → Supabase Storage; chưa cấu hình trả 503 |
| GET | `/api/admin/stats/overview` | Admin | User/sản phẩm/đơn theo trạng thái/doanh thu delivered |
| GET | `/api/admin/stats/revenue` | Admin | `?groupBy=day\|month&from&to` — chỉ đơn delivered |
| GET | `/api/admin/stats/top-products` | Admin | `?limit` — theo số lượng bán, bỏ đơn huỷ |
| GET | `/api/admin/stats/low-stock` | Admin | `?threshold&limit` |

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

# Reload nóng, không cần restart uvicorn
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/admin/reload" `
  -Headers @{ "X-Internal-Token" = "<token>" }
```

`scripts\train.py` ghi kèm `<ten_model>.manifest.json` (version, thời điểm train, metrics) vào `models/`.
`/models` và `/ready` đọc manifest để báo version.

Thêm model mới:

1. Tạo class + `save/load` trong thư mục `ml_service/algorithms/<thuat_toan>/`.
2. Thêm `ModelSpec` vào `ml_service/model_store.py`, trỏ path vào `models/`.
3. Thêm schema/response vào `ml_service/schemas.py`, router tương ứng trong `ml_service/routers/`.
4. Đăng ký router trong `ml_service/main.py`.
5. Gọi `_write_manifest(save_path, metrics)` trong `scripts\train.py`.
6. Thêm test vào `backend/ml-service/tests/test_api.py`.

---

## 9. Kiểm thử

### ML service

```powershell
cd backend/ml-service
.\venv\Scripts\python.exe -m pytest -q
```

Test hiện có (6): health, ready đủ model, similar, parse trong phạm vi, parse ngoài phạm vi,
personalized cold-start.

### Business service

Thư mục `tests/` và toàn bộ cấu hình test framework cũ đã được xoá. Bộ test backend sẽ được viết lại sau
bằng công cụ khác. Trong thời gian đó, kiểm tra API thủ công bằng HTTP/Postman.

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
- Không import `ml_service.*` từ trong các package thuật toán (`ml_service/algorithms/*`) để giữ chúng độc lập, testable.
- Chạy service: `.\venv\Scripts\python.exe -m uvicorn ml_service.main:app` từ thư mục `backend/ml-service`.

---

## 11. Troubleshooting nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| :--- | :--- | :--- |
| Business service trả `source: "fallback"` liên tục | ML chưa chạy / sai `ML_SERVICE_URL` | Mở `:8000/health`; kiểm tra `.env` |
| `/ranking/featured` trả 503 | ML thiếu `DATABASE_URL` | Tạo `backend/ml-service/.env`, dùng role read-only |
| `npm run` không có lệnh test | Bộ test backend đã được xoá, sẽ viết lại sau | Xem mục 9 |
| Model không load | Thiếu `.joblib` hoặc lệch version sklearn | Chạy `train.py`, xem `/models` để đọc lỗi |
| Tìm kiếm trả quá nhiều sản phẩm | Query không bóc được ràng buộc → fallback tìm theo tên | Kiểm tra `/search/parse` trước |
| Tiếng Việt lỗi khi gọi PowerShell | Encoding terminal | Dùng `Invoke-RestMethod` với URL đã encode, hoặc gọi qua Postman |

---

## 12. Checklist trước khi commit

- [ ] Không có `.env`, token, password, connection string thật trong diff.
- [ ] `node --check` các file business service đã sửa.
- [ ] `pytest -q` (ML) pass; API business service được kiểm tra thủ công (chưa có bộ test).
- [ ] Endpoint mới đã cập nhật `backend/business-service/README.md` / `backend/ml-service/README.md`.
- [ ] ML vẫn chỉ trả `product_id` + score; fallback vẫn hoạt động khi tắt ML.
- [ ] Giữ nguyên cấu trúc `backend/business-service/` và `backend/ml-service/`.
