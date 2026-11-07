import jwt from "jsonwebtoken";
import { prisma } from "../clients/prisma.client.js";
import { env } from "../config/env.js";
import { ROLES } from "../utils/constants.js";
import { sendError } from "../utils/response.js";

/**
 * Xác thực Bearer token, gắn req.user = { id, role }.
 * Đọc DB mỗi request để hiệu lực tức thì việc khoá tài khoản / đổi role.
 */
export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, "Bạn cần đăng nhập để thực hiện thao tác này!", "401", null, 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return sendError(res, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!", "401", null, 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, isLocked: true },
    });
    if (!user) {
      return sendError(res, "Tài khoản không tồn tại!", "401", null, 401);
    }
    if (user.isLocked) {
      return sendError(res, "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên!", "403", null, 403);
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return sendError(res, "Không thể xác thực tài khoản lúc này!", "500", null, 500);
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