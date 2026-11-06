import * as authService from "../services/auth.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import { validateInput } from "../validators/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

export const register = async (req, res) => {
  const validation = validateInput(registerSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.register(validation.data);
    return sendSuccess(res, data, "Đăng ký tài khoản thành công!");
  } catch (error) {
    if (error?.code === "P2002") {
      const field = String(error.meta?.target || "").includes("email") ? "email" : "username";
      return sendError(res, field === "email" ? "Email đã được sử dụng!" : "Username đã tồn tại!", "400", {
        field,
      }, 400);
    }
    return sendAppError(res, error, "Đăng ký tài khoản thất bại!");
  }
};

export const login = async (req, res) => {
  const validation = validateInput(loginSchema, req.body);
  if (!validation.success) {
    return sendError(res, "Dữ liệu không hợp lệ!", "400", validation.errors, 400);
  }

  try {
    const data = await authService.login(validation.data);
    return sendSuccess(res, data, "Đăng nhập thành công!");
  } catch (error) {
    return sendAppError(res, error, "Đăng nhập thất bại!");
  }
};

export const me = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, user, "Lấy thông tin cá nhân thành công!");
  } catch (error) {
    return sendAppError(res, error, "Lấy thông tin cá nhân thất bại!");
  }
};
