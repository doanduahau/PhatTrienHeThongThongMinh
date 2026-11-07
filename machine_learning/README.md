# Hệ Thống Thông Minh Phụ Kiện Máy Tính (AI & Recommender System)

Hệ thống bao gồm các thuật toán cốt lõi, được tổ chức theo từng thư mục và file dữ liệu tương ứng mang tên thuật toán:

---

## 1. Cấu trúc thư mục & File dữ liệu theo tên thuật toán

| Thuật toán | Thư mục mã nguồn | File dữ liệu (`data/`) | Khối chức năng nghiệp vụ | Mô tả dữ liệu |
| :--- | :--- | :--- | :--- | :--- |
| **Cosine Similarity** | [`cosine/`](./cosine) | [`data/cosine.csv`](./data/cosine.csv) | **Sản phẩm tương tự** | Đặc trưng sản phẩm (tên, hãng, danh mục, giá, mô tả, thông số, tags). |
| **FP-Growth** | [`fp_growth/`](./fp_growth) | [`data/fp_growth.csv`](./data/fp_growth.csv) | **Thường mua kèm** | Lịch sử giao dịch / đơn hàng (`order_id`, `user_id`, `product_id`, `quantity`, `price`). |
| **Cosine + K-Means** | [`cosine_kmeans/`](./cosine_kmeans) | [`data/cosine_kmeans.csv`](./data/cosine_kmeans.csv) | **Gợi ý cho bạn** | Lịch sử tương tác của người dùng (`user_id`, `product_id`, `interaction_type`, `rating`). |
| **SVM + Regex** | [`svm_regex/`](./svm_regex) | [`data/svm_regex.csv`](./data/svm_regex.csv) | **Tìm kiếm thông minh** | Dữ liệu huấn luyện intent cho truy vấn tìm kiếm (`text,intent`). |
| **Rating (Baseline)** | [`rating_baseline/`](./rating_baseline) | *Trực tiếp từ Database / API* | **Sản phẩm nổi bật** | Truy vấn động từ bảng `products` (Bayesian Score qua `rating`, `review_count`, `sold_count`). Không cần file CSV riêng. |

---

## 2. Quản lý Cơ sở dữ liệu (`db/`)

* [`db/config.py`](./db/config.py): Cấu hình và hàm kết nối PostgreSQL Supabase.
* [`db/schema.sql`](./db/schema.sql): Script DDL tạo toàn bộ 13 bảng theo schema hệ thống.
* [`db/seed/`](./db/seed): Chứa các file SQL seed dữ liệu thực tế cho 405 sản phẩm (`01_categories.sql`, `02_mice.sql`, `03_keyboards.sql`, `04_headphones.sql`, `05_mousepads.sql`, `06_setups.sql`).
* [`db/seed/seed_runner.py`](./db/seed/seed_runner.py): Script thực thi toàn bộ seed vào cơ sở dữ liệu.

---

## 3. Cài đặt thư viện

```bash
pip install -r requirements.txt
```

---

## 4. Huấn luyện toàn bộ các mô hình AI (`train.py`)

File [`train.py`](./train.py) là entrypoint chính để huấn luyện và xuất các model `.joblib` cho toàn bộ hệ thống:

```bash
# 1. Huấn luyện tất cả các mô hình cùng lúc từ dữ liệu CSV (trong data/):
python train.py

# 2. Huấn luyện riêng từng mô hình cụ thể:
python train.py --model cosine     # Huấn luyện Cosine Similarity (Sản phẩm tương tự)
python train.py --model fp_growth  # Huấn luyện FP-Growth (Thường mua kèm)
python train.py --model kmeans     # Huấn luyện Cosine + K-Means (Gợi ý cá nhân hóa)
python train.py --model svm        # Huấn luyện LinearSVC (Phân loại intent tìm kiếm)

# 3. Huấn luyện trực tiếp từ PostgreSQL Supabase (khi đã cấu hình DB):
python train.py --source db
```

---

## 5. Kiểm thử hệ thống (`test.py` và các file test riêng biệt)

Hệ thống hỗ trợ cả file test riêng nằm trong từng thư mục thuật toán lẫn script tổng hợp ở thư mục gốc:

### A. Kiểm thử riêng biệt từng thuật toán (Standalone)
Mỗi thư mục thuật toán đều có file `test.py` riêng:

```bash
# 1. Cosine Similarity (Sản phẩm tương tự)
python cosine/test.py --id 1 --top 4

# 2. FP-Growth (Gợi ý mua kèm)
python fp_growth/test.py --ids 1 15 --top 4

# 3. Cosine + K-Means (Gợi ý cá nhân hóa cho User)
python cosine_kmeans/test.py --user 1 --top 4

# 4. SVM + Regex (Tìm kiếm thông minh)
python svm_regex/test.py --query "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu"

# 5. Rating Baseline (Xếp hạng sản phẩm nổi bật)
python rating_baseline/test.py --top 5
```

### B. Kiểm thử tổng hợp (`test.py`)
File [`test.py`](./test.py) import trực tiếp từ các file test trên để chạy tập trung:

```bash
# 1. Chạy tự động toàn bộ 5 khối nghiệp vụ (Full Test Suite):
python test.py

# 2. Bật giao diện tương tác dòng lệnh (Interactive Menu):
python test.py --interactive

# 3. Kiểm thử nhanh từng khối qua cờ tham số:
python test.py --cosine 1
python test.py --fpgrowth 1
python test.py --kmeans 1
python test.py --search "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu"
python test.py --featured
```


