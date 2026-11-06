import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoute from "./routes/auth.route.js";
import categoryRoute from "./routes/category.route.js";
import productRoute from "./routes/product.route.js";
import cartRoute from "./routes/cart.route.js";
import orderRoute from "./routes/order.route.js";
import adminOrderRoute from "./routes/admin.order.route.js";
import shippingRoute from "./routes/shipping.route.js";
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
app.use("/api/products", productRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/admin/orders", adminOrderRoute);
app.use("/api/shipping-methods", shippingRoute);

// 4. Xử lý 404 (route không tồn tại)
app.use((req, res) => {
  return sendError(res, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, "404", null, 404);
});

// 5. Bắt lỗi máy chủ toàn cục
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    return sendError(res, "Dữ liệu JSON không hợp lệ!", "400", null, 400);
  }

  console.error("[SERVER ERROR]", err);
  return sendError(res, err.message || "Đã xảy ra lỗi máy chủ!", "500", null, 500);
});

export default app;
