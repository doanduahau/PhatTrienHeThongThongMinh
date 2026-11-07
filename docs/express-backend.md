# Hướng Dẫn Kiến Trúc & Quy Chuẩn Viết Code Express Backend

Tài liệu này tổng hợp **kiến trúc chuẩn, tinh gọn và thực tế** dành cho dự án Node.js/Express Backend, đúc kết từ việc loại bỏ các mẫu code "vẽ vời" (over-engineering) để đạt được code sạch, dễ bảo trì và đúng chuẩn doanh nghiệp.

---

## 1. Triết lý thiết kế (Core Principles)

1. **KISS (Keep It Simple, Stupid)**: Không tạo thêm tầng lớp, wrapper hoặc file nếu nó không mang lại giá trị rõ ràng.
2. **Separation of Concerns (Tách biệt trách nhiệm)**:
   * **Route**: Chỉ định nghĩa đường dẫn URL và ánh xạ tới Controller.
   * **Controller**: Nhận `req`, kiểm tra tính hợp lệ dữ liệu (validate), gọi Service, trả `res`.
   * **Service**: Chứa logic nghiệp vụ và truy vấn CSDL (Prisma/SQL). **Tuyệt đối không truyền `req` hoặc `res` vào Service**.
   * **Utils**: Chỉ chứa các hàm dùng chung, không phân mảnh thành hàng tá file nhỏ.
3. **Fail Fast**: Kiểm tra dữ liệu đầu vào ngay tại Controller/Validator. Nếu sai định dạng thì trả lỗi ngay, không để dữ liệu rác chạy xuống Database.

---

## 2. Cấu trúc thư mục chuẩn (MVC Gọn gàng)

```text
├── prisma/
│   ├── migrations/          # Quản lý lịch sử thay đổi CSDL
│   ├── schema.prisma        # Mô hình bảng & quan hệ CSDL
│   └── seed.js              # Script tạo dữ liệu mẫu
├── src/
│   ├── clients/             # Instance kết nối database (PrismaClient)
│   ├── config/              # Đọc biến môi trường (process.env)
│   ├── controllers/         # Nhận HTTP request, trả HTTP response
│   ├── middlewares/         # Middleware (xác thực auth, upload, log...)
│   ├── routes/              # Khai báo method + path
│   ├── services/            # Nghiệp vụ & tương tác CSDL
│   ├── utils/               # Tiện ích dùng chung (response, helper)
│   ├── validators/          # Schema kiểm tra dữ liệu đầu vào (Zod)
│   └── app.js               # Khởi tạo và cấu hình Express app
├── tests/                   # Kiểm thử tự động (Unit test, Integration test)
├── .env                     # Biến môi trường cục bộ
├── .env.example             # Biến môi trường mẫu
├── docker-compose.yml       # Cấu hình container Database (SQL Server, Postgres...)
├── package.json             # Khai báo dependency và scripts
└── server.js                # Khởi động server (app.listen)
```

---

## 3. Luồng đi của một Request (Request Lifecycle)

```text
Client (Web / Mobile / Postman)
  │
  ▼
app.js (CORS, Express JSON, Logger)
  │
  ▼
Router (src/routes/*.route.js)
  │
  ▼
Controller (src/controllers/*.controller.js)
  ├── 1. Validate dữ liệu đầu vào (Zod Schema)
  │      └── ❌ Sai: sendError(res, "Dữ liệu không hợp lệ!", "400", errors)
  │
  ├── 2. Gọi Service xử lý logic (src/services/*.service.js)
  │      └── Thao tác Prisma/Database
  │      └── ❌ Lỗi DB (trùng khóa, mất kết nối): catch và sendError(...)
  │
  └── 3. Phản hồi kết quả: sendSuccess(res, data, "Thành công!")
```

---

## 4. Chi tiết code từng tầng (Best Practices)

### 4.1. Entrypoint (`server.js` & `src/app.js`)

Tách biệt cấu hình ứng dụng (`app.js`) khỏi lệnh khởi chạy cổng (`server.js`) giúp dễ viết Unit/Integration test mà không bị chiếm dụng cổng mạng.

**`src/app.js` (Ngắn gọn, sạch sẽ):**
```javascript
import express from "express";
import cors from "cors";
import morgan from "morgan";
import sinhVienRoute from "./routes/sinhvien.route.js";
import { sendError } from "./utils/response.js";

const app = express();

// 1. Middleware cơ bản
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// 2. Gắn Router trực tiếp
app.use("/api/sinhvien", sinhVienRoute);

// 3. Xử lý 404 (Route không tồn tại)
app.use((req, res) => {
  sendError(res, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, "404", null, 404);
});

// 4. Bắt lỗi máy chủ toàn cục (Global Error Handler)
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    return sendError(res, "Dữ liệu JSON không hợp lệ!", "400", null);
  }
  console.error("[SERVER ERROR]", err);
  return sendError(res, err.message || "Đã xảy ra lỗi máy chủ!", "500", null, 500);
});

export default app;
```

**`server.js`:**
```javascript
import "dotenv/config";
import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
```

---

### 4.2. Khởi tạo Database (`src/clients/prisma.client.js`)

Đảm bảo toàn bộ ứng dụng dùng chung một kết nối (Singleton):

```javascript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

---

### 4.3. Tiện ích phản hồi chuẩn (`src/utils/response.js`)

Gom toàn bộ hàm trả response vào đúng 1 file, đảm bảo tính nhất quán của gói JSON:

```javascript
/**
 * Trả về kết quả thành công kèm dữ liệu (thêm, sửa, xóa, lấy danh sách)
 */
export const sendSuccess = (res, data = null, message = "Thao tác thành công!") => {
  return res.status(200).json({
    status: "200",
    message,
    data,
  });
};

/**
 * Trả về thông báo lỗi kèm mã trạng thái
 */
export const sendError = (
  res,
  message = "Đã xảy ra lỗi!",
  status = "400",
  data = null,
  httpStatus = 200,
) => {
  return res.status(httpStatus).json({
    status: String(status),
    message,
    data,
  });
};

/**
 * Lọc bỏ các thuộc tính undefined trước khi cập nhật CSDL
 */
export const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, val]) => val !== undefined));
```

---

### 4.4. Định tuyến (`src/routes/sinhvien.route.js`)

Chỉ khai báo URL và Controller tương ứng:

```javascript
import { Router } from "express";
import * as sinhVienController from "../controllers/sinhvien.controller.js";

const router = Router();

router.get("/danhsach", sinhVienController.getAllSinhVien);
router.get("/getbyid/:maSV", sinhVienController.getSinhVienByMaSV);
router.post("/insert", sinhVienController.createSinhVien);
router.put("/update/:maSV", sinhVienController.updateSinhVien);
router.delete("/delete/:maSV", sinhVienController.deleteSinhVien);

export default router;
```

---

### 4.5. Tầng xử lý Request (`src/controllers/sinhvien.controller.js`)

Controller chịu trách nhiệm:
1. Nhận dữ liệu từ `req.body`, `req.params`.
2. Kiểm tra tính hợp lệ bằng Validator.
3. Gọi Service.
4. Trả `sendSuccess` hoặc `sendError`.

```javascript
import * as sinhVienService from "../services/sinhvien.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import {
  createSinhVienSchema,
  maSVParamSchema,
  updateSinhVienSchema,
} from "../validators/sinhvien.validator.js";

export const getAllSinhVien = async (_req, res) => {
  try {
    const data = await sinhVienService.getAllSinhVien();
    return sendSuccess(res, data, "Lấy dữ liệu thành công!");
  } catch (error) {
    return sendError(res, "Lấy dữ liệu thất bại!", "400", error.message);
  }
};

export const getSinhVienByMaSV = async (req, res) => {
  const validation = validateInput(maSVParamSchema, req.params);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors);
  }

  try {
    const sinhVien = await sinhVienService.getSinhVienByMaSV(validation.data.maSV);
    if (!sinhVien) {
      return sendError(res, "Không tồn tại sinh viên!", "401", "");
    }
    return sendSuccess(res, sinhVien, "Lấy dữ liệu sinh viên thành công!");
  } catch (error) {
    return sendError(res, "Lấy dữ liệu sinh viên thất bại!", "400", error.message);
  }
};

export const createSinhVien = async (req, res) => {
  const validation = validateInput(createSinhVienSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors);
  }

  try {
    const data = await sinhVienService.createSinhVien(validation.data);
    return sendSuccess(res, data, "Thêm dữ liệu thành công!");
  } catch (error) {
    if (error?.code === "P2002") {
      return sendError(res, "Mã sinh viên đã tồn tại!", "400", {
        field: "maSV",
        value: validation.data.maSV,
      });
    }
    return sendError(res, "Thêm dữ liệu thất bại!", "400", error.message);
  }
};
```

---

### 4.6. Tầng nghiệp vụ & CSDL (`src/services/sinhvien.service.js`)

Service hoàn toàn không dính líu đến HTTP (`req`, `res`), giúp code dễ tái sử dụng và viết kiểm thử:

```javascript
import { prisma } from "../clients/prisma.client.js";
import { removeUndefined } from "../utils/response.js";

export const getAllSinhVien = () => {
  return prisma.sinhVien.findMany({ orderBy: { maSV: "asc" } });
};

export const getSinhVienByMaSV = (maSV) => {
  return prisma.sinhVien.findUnique({ where: { maSV } });
};

export const createSinhVien = (payload) => {
  return prisma.sinhVien.create({
    data: removeUndefined(payload),
  });
};

export const updateSinhVien = (maSV, payload) => {
  return prisma.sinhVien.update({
    where: { maSV },
    data: removeUndefined(payload),
  });
};

export const deleteSinhVien = (maSV) => {
  return prisma.sinhVien.delete({
    where: { maSV },
  });
};
```

---

## 5. Những "Cái Bẫy" Over-Engineering cần tránh (Anti-Patterns)

| Sai lầm (Anti-Pattern) | Hậu quả | Cách viết chuẩn |
| :--- | :--- | :--- |
| **Validate biến môi trường bằng Zod/Joi** khi dự án chỉ có 2-3 biến | Tốn thêm dependency, code dài dòng, dễ crash startup | Dùng `process.env.VAR || defaultValue` |
| **Chia `utils` thành 4-5 file** (`app-error`, `api-response`, `error-handler`, `helpers`) | Người đọc phải nhảy qua lại nhiều file để hiểu 1 luồng response | Gom vào 1 file `utils/response.js` chứa `sendSuccess` và `sendError` |
| **Tạo `routes/index.js` khi dự án chỉ có 1 router** | Tầng trung gian vô nghĩa | Gắn thẳng `app.use("/api/sinhvien", sinhVienRoute)` vào `app.js` |
| **Tự in danh sách route tại endpoint `/`** | Lộ thông tin cấu trúc API, thừa code | Dùng tài liệu Swagger/Postman hoặc README |
| **Cấu hình CORS phức tạp** (split, map, trim...) | Khó đọc, dễ lỗi regex | Dùng `app.use(cors())` mặc định hoặc `cors({ origin: [...] })` đơn giản |
| **Truyền `res` vào Service** | Phá vỡ kiến trúc layered, không thể viết Unit test Service | Service chỉ nhận tham số thuần túy và trả về dữ liệu/Promise |

---

## 6. Checklist kiểm tra Code Backend trước khi bàn giao

- [ ] **Port & Host**: Cổng mạng được đọc linh hoạt từ `process.env.PORT || 3000`.
- [ ] **Bảo mật cơ bản**: Có cấu hình `cors()` và `express.json()`.
- [ ] **Mã lỗi CSDL**: Đã bắt các mã lỗi phổ biến từ Prisma (ví dụ `P2002` trùng khóa chính, `P2025` không tìm thấy).
- [ ] **Xử lý 404**: Có middleware cuối cùng bắt các đường dẫn không tồn tại.
- [ ] **Không lộ chi tiết lỗi Server**: Với lỗi 500 ngoài ý muốn, chỉ in log ra server console, không gửi stack trace nhạy cảm về client.
- [ ] **File `.env.example`**: Luôn có file mẫu đi kèm để người khác clone repo về có thể chạy ngay.
