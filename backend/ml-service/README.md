# Hệ Thống Thông Minh Phụ Kiện Máy Tính (AI & Recommender System)

ML service dùng FastAPI, chỉ đọc PostgreSQL và **chỉ trả `product_id` + điểm số**; backend chịu trách nhiệm hydrate giá/tồn kho/ảnh. Service chạy trực tiếp bằng `venv`, không dùng Docker.

> Hướng dẫn tổng thể 2 service: [`../../docs/Agents.md`](../../docs/Agents.md).

---

## 1. Cấu trúc thư mục

```text
backend/ml-service/
├── src/                   # Package ML service (chạy: uvicorn src.main:app)
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
│   │   └── decision_tree/        # Decision Tree (sản phẩm nổi bật)
│   └── db/
│       ├── config.py             # Kết nối PostgreSQL read-only
│       └── repository.py         # Truy vấn đọc dữ liệu cho train/ranking
├── scripts/                      # Script chạy trực tiếp (không cần pip install -e)
│   ├── train.py                  # Huấn luyện tất cả / từng model
│   └── demo.py                   # Kiểm thử trực quan tổng hợp
├── models/                       # Model .joblib + manifest (được train.py xuất ra)
├── data/                         # CSV huấn luyện (không commit model lớn)
├── tests/                        # Smoke test pytest
│   └── test_api.py
├── .env.example                  # Ví dụ biến môi trường (.env không commit)
├── pytest.ini                    # Cấu hình pytest
├── pytest.ini                    # Cấu hình pytest
├── README.md
└── requirements.txt              # Thư viện Python (fastapi, uvicorn, psycopg2, sklearn, ...)
```

Thư mục thuật toán (`algorithms/*`) được giữ độc lập, không import `src.*` để có thể train/test riêng lẻ.

---

## 2. Quản lý Cơ sở dữ liệu (`src/db/`)

* [`src/db/config.py`](./src/db/config.py): Kết nối PostgreSQL, đọc `DATABASE_URL` từ `.env`. Mặc định `get_cursor(commit=False)` vì service **chỉ đọc**.
* Schema, migration và seed do Prisma tại `backend/business-service/prisma/` quản lý. ML không có bộ schema/seed riêng.
* Demo tìm kiếm gọi business service tại `http://localhost:5000` để lấy sản phẩm; có thể đổi qua biến `BUSINESS_SERVICE_URL`. ML chỉ phân tích câu tìm kiếm.

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
ML_HOST=localhost
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
.\venv\Scripts\python.exe -m uvicorn src.main:app --host localhost --port 8000 --reload
```

Lần khởi động đầu tiên sẽ nạp 5 model `.joblib` vào bộ nhớ (xem log). Service **chỉ bind `localhost`** và được backend gọi nội bộ.

Kiểm tra:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/ready
Invoke-RestMethod http://localhost:8000/models
```

### Endpoint

| Method | Path | Body / Query | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/health` | — | Liveness |
| GET | `/ready` | — | Readiness + model thiếu |
| GET | `/models` | — | Chi tiết model, manifest, lỗi nạp |
| POST | `/recommend/similar` | `{ product_id, top_n, same_category_only? }` | Sản phẩm tương tự (Cosine) |
| POST | `/recommend/bundles` | `{ product_ids[], top_n }` | Thường mua kèm (FP-Growth) |
| POST | `/recommend/personalized` | `{ user_id, top_n, category_slugs? }` | Cá nhân hóa (Cosine + K-Means); tài khoản thiếu hồ sơ trả `cold_start: true` |
| POST | `/search/parse` | `{ query }` | **Chỉ parse**: intent + hard constraints + soft tags, không chạm DB |
| GET | `/ranking/featured` | `?category_id&limit` | Sản phẩm nổi bật (cần DB) |
| GET | `/admin/models` | Header `X-Internal-Token` | Danh sách model, trạng thái nạp và manifest |
| POST | `/admin/reload` | Header `X-Internal-Token`, tùy chọn `?key` | Nạp lại một hoặc tất cả model. Bản cũ tiếp tục phục vụ nếu bản mới nạp lỗi |
| GET | `/admin/datasets` | Header `X-Internal-Token` | Liệt kê CSV trong `data/` và `data/uploads/` |
| GET | `/admin/datasets/{scope}/{name}` | Header `X-Internal-Token` | Tải CSV thuộc `original` hoặc `uploaded` |
| PUT | `/admin/datasets/uploaded/{name}` | Header `X-Internal-Token`, body `application/octet-stream` | Lưu CSV UTF-8 tối đa 10 MB, từ chối tên trùng |
| DELETE | `/admin/datasets/uploaded/{name}` | Header `X-Internal-Token` | Xóa CSV đã tải lên |

Ví dụ:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/recommend/similar `
  -ContentType "application/json" -Body '{"product_id":1,"top_n":3}'

Invoke-RestMethod -Method Post -Uri http://localhost:8000/search/parse `
  -ContentType "application/json; charset=utf-8" `
  -Body ([Text.Encoding]::UTF8.GetBytes('{"query":"chuột không dây dưới 2 triệu"}'))
```

---

## 5. Huấn luyện các mô hình AI (`scripts/train.py`)

Trang `/admin/ml` quản lý các tệp CSV đã tải lên trong `data/uploads/`. Các
thao tác trên tệp yêu cầu cấu hình `ML_INTERNAL_TOKEN` khớp giữa hai service.
Script huấn luyện đọc các tệp có tên cố định trong `data/`. Để dùng một bản đã
tải lên, chọn và kiểm tra tệp rồi đặt bản sao vào đúng tên dữ liệu của model trước
khi chạy script.

File [`scripts/train.py`](./scripts/train.py) là entrypoint chính để huấn luyện và xuất các model `.joblib` vào `models/`:

```powershell
# 1. Huấn luyện tất cả từ dữ liệu CSV (trong data/):
.\venv\Scripts\python.exe scripts\train.py

# 2. Huấn luyện riêng từng mô hình:
.\venv\Scripts\python.exe scripts\train.py --model cosine     # Sản phẩm tương tự
.\venv\Scripts\python.exe scripts\train.py --model fp_growth  # Thường mua kèm
.\venv\Scripts\python.exe scripts\train.py --model kmeans     # Gợi ý cá nhân hóa
.\venv\Scripts\python.exe scripts\train.py --model svm        # Phân loại intent tìm kiếm
.\venv\Scripts\python.exe scripts\train.py --model featured   # Nổi bật, từ data/featured.csv

# 3. Huấn luyện trực tiếp từ PostgreSQL (cần DATABASE_URL):
.\venv\Scripts\python.exe scripts\train.py --source db
```

Mỗi lần train, `scripts/train.py` ghi thêm `<ten_model>.manifest.json` (version, thời điểm train, metrics) cạnh file `.joblib` trong `models/`. `/models` và `/ready` đọc manifest này.

### Gợi ý cá nhân hóa

Chạy `scripts/train.py --model kmeans --source db` để dùng danh mục đang bán,
lịch sử mua hàng, giỏ hàng và đánh giá từ 4 sao. Mỗi sản phẩm có thể mang
nhiều nhãn sở thích, suy ra từ danh mục, thông số và tên sản phẩm.
Model dùng các nhãn này cùng đặc trưng văn bản và giá để tính tương đồng.
Manifest ghi số lượng sản phẩm theo nhãn và độ phủ nhãn theo danh mục.

### Sản phẩm nổi bật: Decision Tree

Chạy `.\venv\Scripts\python.exe scripts\train.py --model featured --source db` để đọc dữ liệu DB, xuất `data/featured.csv`, rồi train từ CSV. Nhãn `featured_label` chỉ nằm trong CSV, không thêm cột hay ghi nhãn vào DB. Dùng `--model featured --source csv` để train lại với nhãn đã chỉnh tay; lệnh `--source db` sẽ xuất lại dữ liệu và tạo lại nhãn mẫu.

Bốn đặc trưng: `rating` (trung bình từ bảng ratings), `rating_count`, `positive_ratio` (tỷ lệ điểm >= 4), `sold_count` (tổng số đơn vị hàng trong đơn đã giao, trạng thái `delivered`). Chỉ hiển thị sản phẩm còn hàng.

Nhãn mẫu = 1 khi rating >= 4.2, positive_ratio >= 0.75 và (rating_count >= 3 hoặc sold_count >= 3); còn lại = 0. Đây là nhãn tạo bằng quy tắc để minh họa học có giám sát, không phải nhãn nổi bật được kiểm chứng độc lập. Holdout chỉ đo độ khớp với các nhãn mẫu này.

Dùng `DecisionTreeClassifier(criterion="entropy", max_depth=3, min_samples_leaf=5)` của sklearn (CART, không phải cài đặt C4.5). API dùng model đã train để phân lớp từ đặc trưng mới nhất; điểm trả về là xác suất lớp nổi bật, khi bằng điểm ưu tiên nhiều đánh giá hơn. Không train trong request.

Lần train hiện tại có 405 sản phẩm (165 nhãn 1, 240 nhãn 0). Sức mua đều bằng 0 nên cây chưa học được ảnh hưởng của thuộc tính này. Khi có đơn đã giao, chạy lại lệnh DB ở trên rồi reload model.

### Reload nóng sau khi train

Không cần restart uvicorn:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/admin/reload `
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

Bộ test có 9 case, gồm smoke test API và kiểm tra Decision Tree: lưu/nạp model, học sức mua, lọc hết hàng, kiểm tra nhãn và API nổi bật. Test không cần database.

### B. Kiểm thử trực quan từng khối thuật toán (Standalone)

```powershell
# 1. Cosine Similarity (Sản phẩm tương tự)
.\venv\Scripts\python.exe src\algorithms\cosine\demo.py --id 1 --top 4

# 2. FP-Growth (Gợi ý mua kèm)
.\venv\Scripts\python.exe src\algorithms\fp_growth\demo.py --ids 1 15 --top 4

# 3. Cosine + K-Means (Gợi ý cá nhân hóa cho User)
.\venv\Scripts\python.exe src\algorithms\cosine_kmeans\demo.py --user 1 --top 4

# 4. SVM + Regex (Tìm kiếm thông minh)
.\venv\Scripts\python.exe src\algorithms\svm_regex\demo.py --query "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu"

# 5. Decision Tree (Xếp hạng sản phẩm nổi bật)
.\venv\Scripts\python.exe src\algorithms\decision_tree\demo.py --top 5
```

### C. Kiểm thử tổng hợp (`scripts/demo.py`)

```powershell
.\venv\Scripts\python.exe scripts\demo.py                       # toàn bộ 5 khối
.\venv\Scripts\python.exe scripts\demo.py --interactive         # menu tương tác
.\venv\Scripts\python.exe scripts\demo.py --journey             # mô phỏng hành trình khách hàng
```

---

## 7. Quy ước khi mở rộng service

- Không đọc `.joblib` theo từng request — luôn dùng `store.get(key)` trong `src/model_store.py`.
- Thêm model mới: tạo class `save/load`, thêm `ModelSpec`, thêm router/schema, đăng ký trong `src/main.py`, ghi manifest trong `scripts/train.py`, thêm test.
- Router chỉ nên mỏng: Pydantic validate → gọi model → map response.
- Không ghi DB. Không trả giá/tồn kho/ảnh từ ML.
- Không import `src.*` từ các package thuật toán để giữ chúng độc lập và testable.
