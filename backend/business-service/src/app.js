import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoute from "./routes/auth.route.js";
import categoryRoute from "./routes/category.route.js";
import brandRoute from "./routes/brand.route.js";
import productRoute from "./routes/product.route.js";
import cartRoute from "./routes/cart.route.js";
import orderRoute from "./routes/order.route.js";
import adminOrderRoute from "./routes/admin.order.route.js";
import adminUserRoute from "./routes/admin.user.route.js";
import uploadRoute from "./routes/upload.route.js";
import statsRoute from "./routes/stats.route.js";
import shippingRoute from "./routes/shipping.route.js";
import recommendationRoute from "./routes/recommendation.route.js";
import paymentRoute from "./routes/payment.route.js";
import { sendSuccess, sendError } from "./utils/response.js";
import { env } from "./config/env.js";

const app = express();

// 1. Middleware cơ bản
app.use(cors());
app.use(express.json());

if (env.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// 2. Kiểm tra tình trạng server
app.get("/api/health", (_req, res) => {
  return sendSuccess(res, { uptime: process.uptime(), env: env.nodeEnv }, "Server đang hoạt động!");
});

// 3. Router
app.use("/api/auth", authRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/brands", brandRoute);
app.use("/api/products", productRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/admin/orders", adminOrderRoute);
app.use("/api/admin/users", adminUserRoute);
app.use("/api/admin/uploads", uploadRoute);
app.use("/api/admin/stats", statsRoute);
app.use("/api/shipping-methods", shippingRoute);
app.use("/api/recommendations", recommendationRoute);
app.use("/api/payment-info", paymentRoute);

// 4. Xử lý 404 (route không tồn tại)
app.use((req, res) => {
  return sendError(res, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, "404", null, 404);
});

// 5. Bắt lỗi máy chủ toàn cục
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const bodyParserErrors = {
    "entity.parse.failed": ["Dữ liệu JSON không hợp lệ!", "400", 400],
    "entity.too.large": ["Dữ liệu gửi lên quá lớn!", "413", 413],
    "encoding.unsupported": ["Kiểu mã hóa không được hỗ trợ!", "415", 415],
    "charset.unsupported": ["Bộ ký tự không được hỗ trợ!", "415", 415],
  };

  const known = bodyParserErrors[err?.type];
  if (known) {
    return sendError(res, known[0], known[1], null, known[2]);
  }

  // Lỗi 4xx khác (body-parser, router...) trả thông báo chung, không lộ chi tiết nội bộ
  const httpStatus = Number(err?.status || err?.statusCode) || 500;
  if (httpStatus >= 400 && httpStatus < 500) {
    console.error("[REQUEST ERROR]", err);
    return sendError(res, "Yêu cầu không hợp lệ!", String(httpStatus), null, httpStatus);
  }

  console.error("[SERVER ERROR]", err);
  return sendError(res, "Đã xảy ra lỗi máy chủ!", "500", null, 500);
});

export default app;
