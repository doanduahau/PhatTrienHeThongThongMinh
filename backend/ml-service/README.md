# Hệ Thống Thông Minh Phụ Kiện Máy Tính (AI & Recommender System)

ML service dùng FastAPI, chỉ đọc PostgreSQL và **chỉ trả `product_id` + điểm số**; backend chịu trách nhiệm hydrate giá/tồn kho/ảnh. Service chạy trực tiếp bằng `venv`, không dùng Docker.

> Hướng dẫn tổng thể 2 service: [`../../docs/Agents.md`](../../docs/Agents.md).

---

## 1. Cấu trúc thư mục

```text
backend/ml-service/
├── ml_service/                   # Package ML service (chạy: uvicorn ml_service.main:app)
│   ├── __init__.py
│   ├── main.py                   # FastAPI app, lifespan preload model
│   ├── config.py                 # Settings từ .env + ROOT_DIR/DATA_DIR/MODELS_DIR
│   ├── deps.py                   # Xác thực X-Internal-Token cho /admin/*
│   ├── schemas.py                # Pydantic request/response
│   ├── model_store.py            # Registry load/reload model .joblib (thread-safe)
│   ├── routers/
│   │   ├── admin.py
│   │   ├── health.py
│   │   ├── recommend.py
│   │   ├── ranking.py
│   │   └── search.py
│   ├── algorithms/
│   │   ├── __init__.py
│   │   ├── cosine/               # Cosine Similarity (sản phẩm tương tự)
│   │   ├── cosine_kmeans/        # Cosine + K-Means (gợi ý cá nhân hóa)
│   │   ├── fp_growth/            # FP-Growth (thường mua kèm)
│   │   ├── svm_regex/            # SVM + Regex (tìm kiếm thông minh)
│   │   └── rating_baseline/      # Baseline (sản phẩm nổi bật)
│   └── db/
│       ├── config.py             # Kết nối PostgreSQL read-only
│       ├── repository.py         # Truy vấn DB cho ML
│       ├── schema.sql
│       └── seed/                 # SQL seed dữ liệu mẫu
├── scripts/                      # Script chạy trực tiếp (không cần pip install -e)
│   ├── train.py                  # Huấn luyện tất cả / từng model
│   └── demo.py                   # Kiểm thử trực quan tổng hợp (từ test.py cũ)
├── models/                       # Model .joblib + manifest (được train.py xuất ra)
├── data/                         # CSV huấn luyện (không commit model lớn)
├── tests/                        # Smoke test pytest
│   └── test_api.py
├── .env.example                  # Ví dụ biến môi trường (.env không commit)
├── pytest.ini                    # Cấu hình pytest
├── README.md
└── requirements.txt              # Thư viện Python (fastapi, uvicorn, psycopg2, sklearn, ...)
```

Thư mục thuật toán (`algorithms/*`) được giữ độc lập, không import `ml_service.*` để có thể train/test riêng lẻ.

---

## 2. Quản lý Cơ sở dữ liệu (`ml_service/db/`)

* [`ml_service/db/config.py`](./ml_service/db/config.py): Kết nối PostgreSQL, đọc `DATABASE_URL` từ `.env`. Mặc định `get_cursor(commit=False)` vì service **chỉ đọc**.
* [`ml_service/db/schema.sql`](./ml_service/db/schema.sql): Tài liệu tham khảo DDL. **Prisma trong `backend/` là nguồn schema chính** — không chạy file này đè lên DB đang dùng.
* [`ml_service/db/seed/`](./ml_service/db/seed): SQL seed dữ liệu mẫu.
* [`ml_service/db/seed/seed_runner.py`](./ml_service/db/seed/seed_runner.py): Script chạy seed (chỉ dùng khi cần).

### Tài khoản read-only

ML service nên dùng role riêng, chỉ có `SELECT`:

```sql
CREATE ROLE ml_reader LOGIN PASSWORD 'mat_khau_manh';
GRANT CONNECT ON DATABASE gear_shop TO ml_reader;
GRANT USAGE ON SCHEMA public TO ml_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ml_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ml_reader;
```

Nếu dùng Supabase, tạo role/user read-only tương ứng rồi lấy connection string của role đó.

### Biến môi trường (`backend/ml-service/.env`)

Sao chép từ [`.env.example`](./.env.example):

```env
ML_HOST=127.0.0.1
ML_PORT=8000
ML_INTERNAL_TOKEN=doi_thanh_chuoi_bi_mat_noi_bo

# Tài khoản CHỈ ĐỌC. Không commit file .env thật.
DATABASE_URL="postgresql://ml_reader:mat_khau@localhost:5433/gear_shop?sslmode=disable"
```

Thiếu `DATABASE_URL` thì service vẫn chạy, nhưng `/ranking/featured` trả **503** (backend sẽ tự fallback sang xếp hạng theo `rating`).

---

## 3. Cài đặt thư viện (venv)

```powershell
cd backend/ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Không cần Docker cho service Python. Chạy trực tiếp bằng `venv`.

---

## 4. Chạy ML service (FastAPI)

```powershell
cd backend/ml-service
.\venv\Scripts\python.exe -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload
```

Lần khởi động đầu tiên sẽ nạp 4 model `.joblib` vào bộ nhớ (xem log). Service **chỉ bind `127.0.0.1`** và được backend gọi nội bộ.

Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/ready
Invoke-RestMethod http://127.0.0.1:8000/models
```

### Endpoint

| Method | Path | Body / Query | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/health` | — | Liveness |
| GET | `/ready` | — | Readiness + model thiếu |
| GET | `/models` | — | Chi tiết model, manifest, lỗi nạp |
| POST | `/recommend/similar` | `{ product_id, top_n, same_category_only? }` | Sản phẩm tương tự (Cosine) |
| POST | `/recommend/bundles` | `{ product_ids[], top_n }` | Thường mua kèm (FP-Growth) |
| POST | `/recommend/personalized` | `{ user_id, top_n }` | Cá nhân hóa (Cosine + K-Means); user lạ trả `cold_start: true` |
| POST | `/search/parse` | `{ query }` | **Chỉ parse**: intent + hard constraints + soft tags, không chạm DB |
| GET | `/ranking/featured` | `?category_id&limit` | Sản phẩm nổi bật (cần DB) |
| POST | `/admin/reload` | Header `X-Internal-Token` | Nạp lại toàn bộ model sau khi train |

Ví dụ:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/recommend/similar `
  -ContentType "application/json" -Body '{"product_id":1,"top_n":3}'

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/search/parse `
  -ContentType "application/json; charset=utf-8" `
  -Body ([Text.Encoding]::UTF8.GetBytes('{"query":"chuột không dây dưới 2 triệu"}'))
```

---

## 5. Huấn luyện các mô hình AI (`scripts/train.py`)

File [`scripts/train.py`](./scripts/train.py) là entrypoint chính để huấn luyện và xuất các model `.joblib` vào `models/`:

```powershell
# 1. Huấn luyện tất cả từ dữ liệu CSV (trong data/):
.\venv\Scripts\python.exe scripts\train.py

# 2. Huấn luyện riêng từng mô hình:
.\venv\Scripts\python.exe scripts\train.py --model cosine     # Sản phẩm tương tự
.\venv\Scripts\python.exe scripts\train.py --model fp_growth  # Thường mua kèm
.\venv\Scripts\python.exe scripts\train.py --model kmeans     # Gợi ý cá nhân hóa
.\venv\Scripts\python.exe scripts\train.py --model svm        # Phân loại intent tìm kiếm

# 3. Huấn luyện trực tiếp từ PostgreSQL (cần DATABASE_URL):
.\venv\Scripts\python.exe scripts\train.py --source db
```

Mỗi lần train, `scripts/train.py` ghi thêm `<ten_model>.manifest.json` (version, thời điểm train, metrics) cạnh file `.joblib` trong `models/`. `/models` và `/ready` đọc manifest này.

### Reload nóng sau khi train

Không cần restart uvicorn:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/admin/reload `
  -Headers @{ "X-Internal-Token" = "<token trong .env>" }
```

Nếu `ML_INTERNAL_TOKEN` để trống, endpoint `/admin/reload` không yêu cầu token (chỉ nên dùng khi chạy local).

---

## 6. Kiểm thử

### A. Smoke test HTTP service (pytest)

```powershell
cd backend/ml-service
.\venv\Scripts\python.exe -m pytest -q
```

Bộ test hiện có 6 case: health, ready đủ model, similar, parse trong phạm vi, parse ngoài phạm vi, personalized cold-start. Test không cần database.

### B. Kiểm thử trực quan từng khối thuật toán (Standalone)

```powershell
# 1. Cosine Similarity (Sản phẩm tương tự)
.\venv\Scripts\python.exe ml_service\algorithms\cosine\demo.py --id 1 --top 4

# 2. FP-Growth (Gợi ý mua kèm)
.\venv\Scripts\python.exe ml_service\algorithms\fp_growth\demo.py --ids 1 15 --top 4

# 3. Cosine + K-Means (Gợi ý cá nhân hóa cho User)
.\venv\Scripts\python.exe ml_service\algorithms\cosine_kmeans\demo.py --user 1 --top 4

# 4. SVM + Regex (Tìm kiếm thông minh)
.\venv\Scripts\python.exe ml_service\algorithms\svm_regex\demo.py --query "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu"

# 5. Rating Baseline (Xếp hạng sản phẩm nổi bật)
.\venv\Scripts\python.exe ml_service\algorithms\rating_baseline\demo.py --top 5
```

### C. Kiểm thử tổng hợp (`scripts/demo.py`)

```powershell
.\venv\Scripts\python.exe scripts\demo.py                       # toàn bộ 5 khối
.\venv\Scripts\python.exe scripts\demo.py --interactive         # menu tương tác
.\venv\Scripts\python.exe scripts\demo.py --journey             # mô phỏng hành trình khách hàng
```

---

## 7. Quy ước khi mở rộng service

- Không đọc `.joblib` theo từng request — luôn dùng `store.get(key)` trong `ml_service/model_store.py`.
- Thêm model mới: tạo class `save/load`, thêm `ModelSpec`, thêm router/schema, đăng ký trong `ml_service/main.py`, ghi manifest trong `scripts/train.py`, thêm test.
- Router chỉ nên mỏng: Pydantic validate → gọi model → map response.
- Không ghi DB. Không trả giá/tồn kho/ảnh từ ML.
- Không import `ml_service.*` từ các package thuật toán để giữ chúng độc lập và testable.
