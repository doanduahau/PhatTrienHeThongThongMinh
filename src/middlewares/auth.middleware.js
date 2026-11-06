import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ROLES } from "../utils/constants.js";
import { sendError } from "../utils/response.js";

/**
 * Xác thực Bearer token, gắn req.user = { id, role }.
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, "Bạn cần đăng nhập để thực hiện thao tác này!", "401", null, 401);
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return sendError(res, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!", "401", null, 401);
  }
};

/**
 * Chỉ cho phép role admin. Phải dùng sau authenticate.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return sendError(res, "Bạn không có quyền thực hiện thao tác này!", "403", null, 403);
  }
  return next();
};
